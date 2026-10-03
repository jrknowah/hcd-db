/* ============================================================================
   enable_change_history.sql
   ----------------------------------------------------------------------------
   1. Creates dbo.SystemErrors if it doesn't exist (Admin > System Errors reads
      it; middleware/errorLog.cjs writes it).
   2. Turns on SQL Server system-versioned temporal tables ("change history") for
      every table in dbo. From then on, each UPDATE or DELETE copies the previous
      version of the row into history.<Table> with the time range it was current.
      Together with dbo.AuditLog (who saved, when, which fields) this gives the
      exact before/after for every chart change.

   HOW TO RUN
   - Run against the Azure SQL database as an admin (SSMS or Azure Data Studio).
   - It runs as a DRY RUN by default: it only PRINTs what it would do.
     Review the output, then set @Apply = 1 below and run it again.
   - Safe to re-run: tables that already keep history are skipped.

   WHAT TO KNOW
   - History tables hold previous versions of patient data. Protect them like the
     live tables (see step 4 to keep the app's own login from reading them).
   - Rows older than @RetentionYears are purged automatically by Azure SQL.
   - A table needs a primary key to keep history; any without one are listed
     and skipped. Add a key to those tables and re-run.
   - Tables with an INSTEAD OF trigger can't keep history; they're listed and skipped.
   - The two new columns (ValidFrom, ValidTo) are HIDDEN: SELECT * and INSERTs
     without a column list behave exactly as before.
   - TRUNCATE and DROP TABLE are blocked on these tables. The older setup scripts
     in this folder drop and recreate tables, so don't re-run them against
     production; use the rollback at the bottom first if you ever must.

   VIEWING HISTORY (examples)
     -- Every version of one client's demographics, oldest first
     SELECT *, ValidFrom, ValidTo
     FROM dbo.Clients FOR SYSTEM_TIME ALL
     WHERE clientID = 'C123'
     ORDER BY ValidFrom;

     -- The record as it was at a point in time (times are UTC)
     SELECT * FROM dbo.Clients FOR SYSTEM_TIME AS OF '2026-10-01T15:00:00'
     WHERE clientID = 'C123';
   ========================================================================== */

SET NOCOUNT ON;

DECLARE @Apply          bit = 0;   -- 0 = dry run (print only), 1 = make the changes
DECLARE @RetentionYears int = 7;   -- how long previous versions are kept

-- Tables that are logs themselves, or reference lists, don't need history.
DECLARE @Excluded TABLE (name sysname PRIMARY KEY);
INSERT INTO @Excluded (name) VALUES
  ('AuditLog'), ('UserActionLog'), ('SystemErrors'), ('FormAuditLog'),
  ('DocumentAccess'), ('AllergyOptions'), ('DocumentCategories');

PRINT CASE WHEN @Apply = 1 THEN '*** APPLYING CHANGES ***' ELSE '*** DRY RUN - nothing will change ***' END;
PRINT '';

/* ---------------------------------------------------------------------------
   1. SystemErrors
   ------------------------------------------------------------------------- */
IF OBJECT_ID('dbo.SystemErrors', 'U') IS NULL
BEGIN
  PRINT 'SystemErrors: table missing - will create.';
  IF @Apply = 1
    EXEC (N'
      CREATE TABLE dbo.SystemErrors (
        ErrorID     int IDENTITY(1,1) NOT NULL CONSTRAINT PK_SystemErrors PRIMARY KEY,
        Timestamp   datetime2      NOT NULL CONSTRAINT DF_SystemErrors_Timestamp DEFAULT SYSUTCDATETIME(),
        Severity    nvarchar(20)   NOT NULL,
        Source      nvarchar(50)   NULL,
        Route       nvarchar(500)  NULL,
        Method      nvarchar(10)   NULL,
        ErrorCode   nvarchar(100)  NULL,
        Message     nvarchar(max)  NULL,
        StackTrace  nvarchar(max)  NULL,
        UserID      nvarchar(255)  NULL,
        ClientID    nvarchar(255)  NULL,
        Resolved    bit            NOT NULL CONSTRAINT DF_SystemErrors_Resolved DEFAULT 0,
        ResolvedAt  datetime2      NULL,
        ResolvedBy  nvarchar(255)  NULL,
        Notes       nvarchar(max)  NULL
      );
      CREATE INDEX IX_SystemErrors_Timestamp ON dbo.SystemErrors (Timestamp DESC);');
END
ELSE
  PRINT 'SystemErrors: already exists.';

-- AuditLog now gets a row per API call; this keeps the Admin > Audit Trail page fast.
IF OBJECT_ID('dbo.AuditLog', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.AuditLog', 'timestamp') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_Timestamp' AND object_id = OBJECT_ID('dbo.AuditLog'))
BEGIN
  PRINT 'AuditLog: will add index on timestamp.';
  IF @Apply = 1
    EXEC (N'CREATE INDEX IX_AuditLog_Timestamp ON dbo.AuditLog ([timestamp] DESC);');
END
PRINT '';

/* ---------------------------------------------------------------------------
   2. Schema for history tables
   ------------------------------------------------------------------------- */
IF SCHEMA_ID('history') IS NULL
BEGIN
  PRINT 'Schema [history]: will create.';
  IF @Apply = 1 EXEC (N'CREATE SCHEMA history AUTHORIZATION dbo;');
END
PRINT '';

/* ---------------------------------------------------------------------------
   3. Turn on history for each table
   ------------------------------------------------------------------------- */
DECLARE @Table sysname, @Sql nvarchar(max);
DECLARE @Enabled int = 0, @Skipped int = 0;

DECLARE tables CURSOR LOCAL FAST_FORWARD FOR
  SELECT t.name
  FROM sys.tables t
  WHERE t.schema_id = SCHEMA_ID('dbo')
    AND t.temporal_type = 0          -- not already versioned, not a history table
    AND t.is_ms_shipped = 0
    AND t.name NOT IN (SELECT name FROM @Excluded)
  ORDER BY t.name;

OPEN tables;
FETCH NEXT FROM tables INTO @Table;

WHILE @@FETCH_STATUS = 0
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.key_constraints
                 WHERE parent_object_id = OBJECT_ID(QUOTENAME('dbo') + '.' + QUOTENAME(@Table))
                   AND type = 'PK')
  BEGIN
    PRINT 'SKIP  ' + @Table + ' - no primary key';
    SET @Skipped += 1;
  END
  ELSE IF EXISTS (SELECT 1 FROM sys.triggers
                  WHERE parent_id = OBJECT_ID(QUOTENAME('dbo') + '.' + QUOTENAME(@Table))
                    AND is_instead_of_trigger = 1)
  BEGIN
    PRINT 'SKIP  ' + @Table + ' - has an INSTEAD OF trigger';
    SET @Skipped += 1;
  END
  ELSE IF COL_LENGTH(QUOTENAME('dbo') + '.' + QUOTENAME(@Table), 'ValidFrom') IS NOT NULL
       OR COL_LENGTH(QUOTENAME('dbo') + '.' + QUOTENAME(@Table), 'ValidTo') IS NOT NULL
  BEGIN
    PRINT 'SKIP  ' + @Table + ' - already has a ValidFrom/ValidTo column';
    SET @Skipped += 1;
  END
  ELSE IF OBJECT_ID(QUOTENAME('history') + '.' + QUOTENAME(@Table), 'U') IS NOT NULL
  BEGIN
    PRINT 'SKIP  ' + @Table + ' - history.' + @Table + ' already exists';
    SET @Skipped += 1;
  END
  ELSE
  BEGIN
    PRINT 'ON    ' + @Table + '  ->  history.' + @Table;
    SET @Enabled += 1;

    IF @Apply = 1
    BEGIN
      SET @Sql = N'
        ALTER TABLE dbo.' + QUOTENAME(@Table) + N' ADD
          ValidFrom datetime2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL
            CONSTRAINT ' + QUOTENAME('DF_' + @Table + '_ValidFrom') + N' DEFAULT SYSUTCDATETIME(),
          ValidTo   datetime2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL
            CONSTRAINT ' + QUOTENAME('DF_' + @Table + '_ValidTo') + N' DEFAULT CONVERT(datetime2, ''9999-12-31 23:59:59.9999999''),
          PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo);

        ALTER TABLE dbo.' + QUOTENAME(@Table) + N' SET (SYSTEM_VERSIONING = ON (
          HISTORY_TABLE = history.' + QUOTENAME(@Table) + N',
          HISTORY_RETENTION_PERIOD = ' + CAST(@RetentionYears AS nvarchar(5)) + N' YEARS
        ));';

      BEGIN TRY
        BEGIN TRANSACTION;
        EXEC sp_executesql @Sql;
        COMMIT;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        PRINT '      FAILED: ' + ERROR_MESSAGE();
        SET @Enabled -= 1;
        SET @Skipped += 1;
      END CATCH
    END
  END

  FETCH NEXT FROM tables INTO @Table;
END

CLOSE tables;
DEALLOCATE tables;

PRINT '';
PRINT CONCAT(@Enabled, ' table(s) ', CASE WHEN @Apply = 1 THEN 'now keep' ELSE 'would keep' END,
             ' history; ', @Skipped, ' skipped.');

-- Retention clean-up must be enabled at the database level (on by default in Azure SQL).
IF @Apply = 1
  EXEC (N'ALTER DATABASE CURRENT SET TEMPORAL_HISTORY_RETENTION ON;');

/* ---------------------------------------------------------------------------
   4. (Recommended) Keep the app's own login from reading history
   ---------------------------------------------------------------------------
   The app never needs history, so if its SQL login is ever misused it shouldn't
   be able to read old versions. Replace <app_user> with the user in the
   AZURE_SQL_USER App Service setting and run:

     DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::history TO [<app_user>];

   (DENY has no effect on members of db_owner. If the app logs in as db_owner,
   giving it a narrower role is worth doing on its own.)

   ---------------------------------------------------------------------------
   ROLLBACK for one table (keeps the history table; drop it separately if wanted)
   ---------------------------------------------------------------------------
     ALTER TABLE dbo.<Table> SET (SYSTEM_VERSIONING = OFF);
     ALTER TABLE dbo.<Table> DROP PERIOD FOR SYSTEM_TIME;
     ALTER TABLE dbo.<Table> DROP CONSTRAINT [DF_<Table>_ValidFrom], [DF_<Table>_ValidTo];
     ALTER TABLE dbo.<Table> DROP COLUMN ValidFrom, ValidTo;
   ------------------------------------------------------------------------- */
