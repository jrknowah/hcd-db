/* ============================================================================
   ClientStays.sql - readmitting a discharged client under the same client ID
   ----------------------------------------------------------------------------
   When a discharged client is referred back to the SAME program, they keep
   their client ID and start a new stay with a blank chart. The previous stay's
   records are kept, read-only, under an archived ID:

       CL-123456-789      the client (current stay)
       CL-123456-789~1    their first stay
       CL-123456-789~2    their second stay ...

   dbo.usp_ReadmitClient does this in one transaction:
     1. copies the client's dbo.Clients row to the archived ID
        (clientPriorStayOf = the client ID, clientStayNumber = n)
     2. moves every row in every table with a clientID / client_id column to
        the archived ID, except the tables listed in @keep below
        (the same approach as renameClient154404.sql)
     3. starts the new stay on the client row: new admit date and site,
        discharge date and exit reason cleared
     4. records the stay in dbo.ClientStays, with the row counts moved
   Any error rolls the whole thing back.

   Uploaded files stay where they are in blob storage. The Documents & Uploads
   list shows each stay the files uploaded during that stay (by upload time,
   using ClientStays.readmittedAt as the boundary).

   Run AFTER ClientStatusProgram.sql and BEFORE deploying the backend that
   includes POST /api/clients/:clientID/readmit. Idempotent: safe to re-run.

   The procedure runs WITH EXECUTE AS OWNER because it briefly disables foreign
   keys between client tables while it moves rows. If the app's database user
   cannot run it, grant it:
       GRANT EXECUTE ON dbo.usp_ReadmitClient TO [<app database user>];
============================================================================ */
SET NOCOUNT ON;

IF COL_LENGTH('dbo.Clients', 'clientPriorStayOf') IS NULL
    ALTER TABLE dbo.Clients ADD clientPriorStayOf NVARCHAR(50) NULL;   -- set on archived stays only

IF COL_LENGTH('dbo.Clients', 'clientStayNumber') IS NULL
    ALTER TABLE dbo.Clients ADD clientStayNumber INT NULL;
GO

IF OBJECT_ID('dbo.ClientStays', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ClientStays (
        id                   INT IDENTITY(1,1) PRIMARY KEY,
        clientID             NVARCHAR(50)  NOT NULL,   -- the client (current ID)
        stayNumber           INT           NOT NULL,
        priorStayClientID    NVARCHAR(50)  NOT NULL,   -- archived ID holding the stay's records
        site                 NVARCHAR(100) NULL,
        program              NVARCHAR(50)  NULL,
        admitDate            DATE          NULL,
        dischargeDate        DATE          NULL,
        exitReason           NVARCHAR(255) NULL,
        readmittedAt         DATETIME2     NOT NULL CONSTRAINT DF_ClientStays_readmittedAt DEFAULT SYSUTCDATETIME(),
        readmittedBy         NVARCHAR(255) NULL,
        newAdmitDate         DATE          NULL,
        newSite              NVARCHAR(100) NULL,
        movedRows            NVARCHAR(MAX) NULL,       -- "table.column=rows; ..." for audit / undo
        CONSTRAINT UQ_ClientStays_client_stay UNIQUE (clientID, stayNumber),
        CONSTRAINT UQ_ClientStays_priorID UNIQUE (priorStayClientID)
    );
    PRINT 'Created dbo.ClientStays';
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_ReadmitClient
    @clientID  NVARCHAR(50),
    @admitDate DATE,
    @site      NVARCHAR(100),
    @user      NVARCHAR(255)
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @stayNumber INT, @priorID NVARCHAR(50), @sql NVARCHAR(MAX), @cols NVARCHAR(MAX),
            @sch SYSNAME, @tbl SYSNAME, @col SYSNAME, @fk SYSNAME, @trusted BIT, @n INT,
            @moved NVARCHAR(MAX) = N'';

    -- Tables whose clientID rows stay with the client (not part of a stay)
    DECLARE @keep TABLE (name SYSNAME PRIMARY KEY);
    INSERT INTO @keep VALUES (N'Clients'), (N'ClientStays'), (N'AuditLog'), (N'SystemErrors'),
                             (N'ClientIDRenameLog'), (N'ClientIDTrimLog');

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Exact match only (= ignores trailing spaces), and lock the client row
        IF NOT EXISTS (SELECT 1 FROM dbo.Clients WITH (UPDLOCK, HOLDLOCK)
                       WHERE clientID = @clientID AND clientID + N'|' = @clientID + N'|'
                         AND clientPriorStayOf IS NULL)
            THROW 50001, 'Client not found.', 1;

        IF EXISTS (SELECT 1 FROM dbo.Clients
                   WHERE clientID = @clientID AND clientID + N'|' = @clientID + N'|'
                     AND clientDischargeDate IS NULL)
            THROW 50002, 'Only a discharged client can be readmitted.', 1;

        SELECT @stayNumber = ISNULL(MAX(stayNumber), 0) + 1
        FROM dbo.ClientStays WITH (UPDLOCK, HOLDLOCK) WHERE clientID = @clientID;

        SET @priorID = @clientID + N'~' + CAST(@stayNumber AS NVARCHAR(10));
        IF LEN(@priorID) > 50
            THROW 50003, 'Client ID is too long to archive the stay.', 1;
        IF EXISTS (SELECT 1 FROM dbo.Clients WHERE clientID = @priorID)
            THROW 50004, 'The archived stay ID already exists. Nothing was changed.', 1;

        -- 1. Archived copy of the client row
        SELECT @cols = STRING_AGG(CAST(QUOTENAME(c.name) AS NVARCHAR(MAX)), N', ')
        FROM sys.columns c
        WHERE c.object_id = OBJECT_ID('dbo.Clients')
          AND c.is_identity = 0 AND c.is_computed = 0
          AND TYPE_NAME(c.system_type_id) NOT IN ('timestamp')
          AND c.name NOT IN ('clientID', 'clientPriorStayOf', 'clientStayNumber');

        SET @sql = N'INSERT INTO dbo.Clients (clientID, clientPriorStayOf, clientStayNumber, ' + @cols + N')
                     SELECT @priorID, @clientID, @stayNumber, ' + @cols + N'
                     FROM dbo.Clients
                     WHERE clientID = @clientID AND clientID + N''|'' = @clientID + N''|'';';
        EXEC sp_executesql @sql, N'@priorID NVARCHAR(50), @clientID NVARCHAR(50), @stayNumber INT',
             @priorID = @priorID, @clientID = @clientID, @stayNumber = @stayNumber;

        INSERT INTO dbo.ClientStays (clientID, stayNumber, priorStayClientID, site, program,
                                     admitDate, dischargeDate, exitReason, readmittedBy, newAdmitDate, newSite)
        SELECT @clientID, @stayNumber, @priorID, clientSite, clientProgram,
               clientAdmitDate, clientDischargeDate, clientExitReason, @user, @admitDate, @site
        FROM dbo.Clients
        WHERE clientID = @clientID AND clientID + N'|' = @clientID + N'|';

        -- 2. Pause foreign keys between client tables (those pointing at dbo.Clients
        --    stay valid: the archived ID now exists there)
        DECLARE @fks TABLE (sch SYSNAME, tbl SYSNAME, fkName SYSNAME, trusted BIT);
        INSERT INTO @fks
        SELECT DISTINCT OBJECT_SCHEMA_NAME(fk.parent_object_id), OBJECT_NAME(fk.parent_object_id),
               fk.name, CASE WHEN fk.is_not_trusted = 0 THEN 1 ELSE 0 END
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
        JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
        WHERE rc.name IN ('clientID', 'client_id')
          AND fk.is_disabled = 0
          AND OBJECT_NAME(fk.referenced_object_id) NOT IN (SELECT name FROM @keep);

        DECLARE fkcur CURSOR LOCAL FAST_FORWARD FOR SELECT sch, tbl, fkName FROM @fks;
        OPEN fkcur;
        FETCH NEXT FROM fkcur INTO @sch, @tbl, @fk;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @sql = N'ALTER TABLE ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N' NOCHECK CONSTRAINT ' + QUOTENAME(@fk) + N';';
            EXEC sp_executesql @sql;
            FETCH NEXT FROM fkcur INTO @sch, @tbl, @fk;
        END
        CLOSE fkcur; DEALLOCATE fkcur;

        -- 3. Move the stay's rows to the archived ID
        DECLARE colcur CURSOR LOCAL FAST_FORWARD FOR
            SELECT c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS c
            JOIN INFORMATION_SCHEMA.TABLES t
              ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
            WHERE t.TABLE_TYPE = 'BASE TABLE'
              AND c.COLUMN_NAME IN ('clientID', 'client_id')
              AND c.DATA_TYPE IN ('char', 'nchar', 'varchar', 'nvarchar')
              AND c.TABLE_NAME NOT IN (SELECT name FROM @keep);
        OPEN colcur;
        FETCH NEXT FROM colcur INTO @sch, @tbl, @col;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @sql = N'UPDATE ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N'
                         SET ' + QUOTENAME(@col) + N' = @priorID
                         WHERE ' + QUOTENAME(@col) + N' = @clientID
                           AND ' + QUOTENAME(@col) + N' + N''|'' = @clientID + N''|'';
                         SET @n = @@ROWCOUNT;';
            EXEC sp_executesql @sql, N'@priorID NVARCHAR(50), @clientID NVARCHAR(50), @n INT OUTPUT',
                 @priorID = @priorID, @clientID = @clientID, @n = @n OUTPUT;
            IF @n > 0
                SET @moved = @moved + @tbl + N'.' + @col + N'=' + CAST(@n AS NVARCHAR(10)) + N'; ';
            FETCH NEXT FROM colcur INTO @sch, @tbl, @col;
        END
        CLOSE colcur; DEALLOCATE colcur;

        -- Re-enable the paused foreign keys; re-validate those that were trusted
        DECLARE fkcur2 CURSOR LOCAL FAST_FORWARD FOR SELECT sch, tbl, fkName, trusted FROM @fks;
        OPEN fkcur2;
        FETCH NEXT FROM fkcur2 INTO @sch, @tbl, @fk, @trusted;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @sql = N'ALTER TABLE ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl)
                     + CASE WHEN @trusted = 1 THEN N' WITH CHECK' ELSE N'' END
                     + N' CHECK CONSTRAINT ' + QUOTENAME(@fk) + N';';
            EXEC sp_executesql @sql;
            FETCH NEXT FROM fkcur2 INTO @sch, @tbl, @fk, @trusted;
        END
        CLOSE fkcur2; DEALLOCATE fkcur2;

        -- 4. Start the new stay
        UPDATE dbo.Clients
        SET clientAdmitDate = @admitDate,
            clientSite = @site,
            clientDischargeDate = NULL,
            clientExitReason = NULL,
            updatedAt = GETDATE()
        WHERE clientID = @clientID AND clientID + N'|' = @clientID + N'|';

        UPDATE dbo.ClientStays SET movedRows = @moved WHERE priorStayClientID = @priorID;

        COMMIT TRANSACTION;

        SELECT @priorID AS priorStayClientID, @stayNumber AS stayNumber, @moved AS movedRows;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

PRINT 'dbo.usp_ReadmitClient is ready';
GO
