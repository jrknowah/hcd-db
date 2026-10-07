/* ============================================================================
   renameClient154404.sql
   Changes client ID '154404' to '154406' (the ID was entered with a typo) in
   EVERY table that has a clientID / client_id column, in one transaction.
   Stored blob paths under '154404/' are rewritten to '154406/'.

   HOW TO RUN
     1. Run as-is (@DryRun = 1). It changes nothing and shows:
          - the ID change
          - every table/row count that would change
          - a collision if '154406' already belongs to another client
            (the script then stops; resolve it manually first)
     2. Review the output. Then set @DryRun = 0 and run again.
     3. Every change is logged to dbo.ClientIDRenameLog. The UNDO section at
        the bottom restores the original ID from that log.

   Uploaded files live in the blob folder named after the ID, so after this
   script ALSO run:
     node scripts/moveClientBlobs.js 154404 154406            (preview)
     node scripts/moveClientBlobs.js 154404 154406 --apply

   Take a database backup / point-in-time restore point before step 2.
============================================================================ */
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @DryRun BIT = 1;   -- <<< set to 0 to apply

/* 1. Affected client IDs. DATALENGTH is used because SQL Server's = and <>
      ignore trailing spaces, which would hide IDs like '231257 '.            */
IF OBJECT_ID('tempdb..#fix') IS NOT NULL DROP TABLE #fix;
CREATE TABLE #fix (
  oldID     NVARCHAR(100) NOT NULL,
  newID     NVARCHAR(100) NOT NULL,
  oldFolder NVARCHAR(200) NULL,   -- blob folder files were uploaded under
  newFolder NVARCHAR(200) NULL    -- blob folder the new ID uses
);

/* 1b. The rename. The blob folder is the ID itself.                       */
INSERT INTO #fix (oldID, newID, oldFolder, newFolder) VALUES
  (N'154404', N'154406', N'154404', N'154406');

-- Nothing to do if the old ID no longer exists (already fixed)
DELETE f FROM #fix f
WHERE NOT EXISTS (SELECT 1 FROM dbo.Clients c
                  WHERE c.clientID = f.oldID AND DATALENGTH(c.clientID) = DATALENGTH(f.oldID));

SELECT '[' + oldID + ']' AS oldID, '[' + newID + ']' AS newID, oldFolder, newFolder FROM #fix;

IF NOT EXISTS (SELECT 1 FROM #fix)
BEGIN
  PRINT 'Client ID 154404 not found (already renamed?). Nothing to do.';
  RETURN;
END

/* 2. Collision: the new ID already belongs to a different client.          */
IF EXISTS (
  SELECT 1 FROM #fix f
  JOIN dbo.Clients c
    ON c.clientID = f.newID
   AND DATALENGTH(c.clientID) = DATALENGTH(f.newID)
)
BEGIN
  SELECT f.oldID, f.newID AS collidesWith
  FROM #fix f
  JOIN dbo.Clients c
    ON c.clientID = f.newID AND DATALENGTH(c.clientID) = DATALENGTH(f.newID);
  RAISERROR('Client ID 154406 already exists. Resolve this manually first. Nothing was changed.', 16, 1);
  RETURN;
END

/* 3. Every base table with a client ID column.                              */
IF OBJECT_ID('tempdb..#cols') IS NOT NULL DROP TABLE #cols;
SELECT c.TABLE_SCHEMA AS sch, c.TABLE_NAME AS tbl, c.COLUMN_NAME AS col,
       CAST(0 AS INT) AS rowsAffected
INTO   #cols
FROM   INFORMATION_SCHEMA.COLUMNS c
JOIN   INFORMATION_SCHEMA.TABLES  t
  ON   t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
WHERE  t.TABLE_TYPE = 'BASE TABLE'
  AND  c.COLUMN_NAME IN ('clientID', 'client_id')
  AND  c.DATA_TYPE IN ('char', 'nchar', 'varchar', 'nvarchar')
  AND  c.TABLE_NAME <> 'ClientIDRenameLog';

DECLARE @sch SYSNAME, @tbl SYSNAME, @col SYSNAME, @sql NVARCHAR(MAX), @n INT;

-- Rows that would change, per table. A row matches only if its value has the
-- exact same bytes as the old ID.
DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT sch, tbl, col FROM #cols;
OPEN cur;
FETCH NEXT FROM cur INTO @sch, @tbl, @col;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'SELECT @n = COUNT(*) FROM ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N' x
               JOIN #fix f ON x.' + QUOTENAME(@col) + N' = f.oldID
                          AND DATALENGTH(x.' + QUOTENAME(@col) + N') = DATALENGTH(f.oldID);';
  EXEC sp_executesql @sql, N'@n INT OUTPUT', @n = @n OUTPUT;
  UPDATE #cols SET rowsAffected = @n WHERE sch = @sch AND tbl = @tbl AND col = @col;
  FETCH NEXT FROM cur INTO @sch, @tbl, @col;
END
CLOSE cur; DEALLOCATE cur;

SELECT sch AS [schema], tbl AS [table], col AS [column], rowsAffected
FROM   #cols WHERE rowsAffected > 0 ORDER BY tbl;

/* Stored blob paths/URLs pointing at the renamed folder.                     */
IF OBJECT_ID('tempdb..#pathcols') IS NOT NULL DROP TABLE #pathcols;
SELECT c.TABLE_SCHEMA AS sch, c.TABLE_NAME AS tbl, c.COLUMN_NAME AS col,
       CAST(0 AS INT) AS rowsAffected
INTO   #pathcols
FROM   INFORMATION_SCHEMA.COLUMNS c
JOIN   INFORMATION_SCHEMA.TABLES  t
  ON   t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
WHERE  t.TABLE_TYPE = 'BASE TABLE'
  AND  c.COLUMN_NAME IN ('blobName', 'blobPath', 'filePath', 'blobUrl', 'fileUrl')
  AND  c.DATA_TYPE IN ('varchar', 'nvarchar');

DECLARE pcur CURSOR LOCAL FAST_FORWARD FOR SELECT sch, tbl, col FROM #pathcols;
OPEN pcur;
FETCH NEXT FROM pcur INTO @sch, @tbl, @col;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'SELECT @n = COUNT(*) FROM ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N' x
               JOIN #fix f ON f.oldFolder IS NOT NULL
                AND (x.' + QUOTENAME(@col) + N' LIKE REPLACE(f.oldFolder, N''_'', N''[_]'') + N''/%''
                  OR x.' + QUOTENAME(@col) + N' LIKE N''%/'' + REPLACE(f.oldFolder, N''_'', N''[_]'') + N''/%'');';
  EXEC sp_executesql @sql, N'@n INT OUTPUT', @n = @n OUTPUT;
  UPDATE #pathcols SET rowsAffected = @n WHERE sch = @sch AND tbl = @tbl AND col = @col;
  FETCH NEXT FROM pcur INTO @sch, @tbl, @col;
END
CLOSE pcur; DEALLOCATE pcur;

SELECT sch AS [schema], tbl AS [table], col AS blobPathColumn, rowsAffected
FROM   #pathcols WHERE rowsAffected > 0 ORDER BY tbl;

/* Foreign keys on these columns must be paused while parent and child rows
   are renamed, then re-validated.                                           */
IF OBJECT_ID('tempdb..#fks') IS NOT NULL DROP TABLE #fks;
SELECT DISTINCT
       OBJECT_SCHEMA_NAME(fk.parent_object_id) AS sch,
       OBJECT_NAME(fk.parent_object_id)        AS tbl,
       fk.name                                 AS fkName
INTO   #fks
FROM   sys.foreign_keys fk
JOIN   sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN   sys.columns pc ON pc.object_id = fkc.parent_object_id     AND pc.column_id = fkc.parent_column_id
JOIN   sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
WHERE  (pc.name IN ('clientID', 'client_id') OR rc.name IN ('clientID', 'client_id'))
  AND  fk.is_disabled = 0;

SELECT sch, tbl, fkName AS foreignKeyPausedDuringFix FROM #fks;

IF @DryRun = 1
BEGIN
  PRINT 'DRY RUN: nothing was changed. Review the results, then set @DryRun = 0.';
  RETURN;
END

/* 4. Apply.                                                                 */
IF OBJECT_ID('dbo.ClientIDRenameLog') IS NULL
  CREATE TABLE dbo.ClientIDRenameLog (
    id           INT IDENTITY PRIMARY KEY,
    oldID        NVARCHAR(100) NOT NULL,
    newID        NVARCHAR(100) NOT NULL,
    tableSchema  SYSNAME       NOT NULL,
    tableName    SYSNAME       NOT NULL,
    columnName   SYSNAME       NOT NULL,
    rowsUpdated  INT           NOT NULL,
    fixedAt      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
  );

BEGIN TRY
  BEGIN TRANSACTION;

  DECLARE @fk SYSNAME;
  DECLARE fkcur CURSOR LOCAL FAST_FORWARD FOR SELECT sch, tbl, fkName FROM #fks;
  OPEN fkcur;
  FETCH NEXT FROM fkcur INTO @sch, @tbl, @fk;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @sql = N'ALTER TABLE ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N' NOCHECK CONSTRAINT ' + QUOTENAME(@fk) + N';';
    EXEC sp_executesql @sql;
    FETCH NEXT FROM fkcur INTO @sch, @tbl, @fk;
  END
  CLOSE fkcur; DEALLOCATE fkcur;

  DECLARE upcur CURSOR LOCAL FAST_FORWARD FOR SELECT sch, tbl, col FROM #cols WHERE rowsAffected > 0;
  OPEN upcur;
  FETCH NEXT FROM upcur INTO @sch, @tbl, @col;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    -- Log first (one row per old ID per table), then update
    SET @sql = N'INSERT INTO dbo.ClientIDRenameLog (oldID, newID, tableSchema, tableName, columnName, rowsUpdated)
                 SELECT f.oldID, f.newID, @sch, @tbl, @col, COUNT(*)
                 FROM ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N' x
                 JOIN #fix f ON x.' + QUOTENAME(@col) + N' = f.oldID
                            AND DATALENGTH(x.' + QUOTENAME(@col) + N') = DATALENGTH(f.oldID)
                 GROUP BY f.oldID, f.newID;

                 UPDATE x SET ' + QUOTENAME(@col) + N' = f.newID
                 FROM ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N' x
                 JOIN #fix f ON x.' + QUOTENAME(@col) + N' = f.oldID
                            AND DATALENGTH(x.' + QUOTENAME(@col) + N') = DATALENGTH(f.oldID);';
    EXEC sp_executesql @sql, N'@sch SYSNAME, @tbl SYSNAME, @col SYSNAME', @sch = @sch, @tbl = @tbl, @col = @col;
    FETCH NEXT FROM upcur INTO @sch, @tbl, @col;
  END
  CLOSE upcur; DEALLOCATE upcur;

  -- Rewrite stored blob paths for renamed folders (logged with columnName = path column)
  DECLARE pup CURSOR LOCAL FAST_FORWARD FOR SELECT sch, tbl, col FROM #pathcols WHERE rowsAffected > 0;
  OPEN pup;
  FETCH NEXT FROM pup INTO @sch, @tbl, @col;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @sql = N'INSERT INTO dbo.ClientIDRenameLog (oldID, newID, tableSchema, tableName, columnName, rowsUpdated)
                 SELECT f.oldFolder + N''/'', f.newFolder + N''/'', @sch, @tbl, @col, COUNT(*)
                 FROM ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N' x
                 JOIN #fix f ON f.oldFolder IS NOT NULL
                  AND (x.' + QUOTENAME(@col) + N' LIKE REPLACE(f.oldFolder, N''_'', N''[_]'') + N''/%''
                    OR x.' + QUOTENAME(@col) + N' LIKE N''%/'' + REPLACE(f.oldFolder, N''_'', N''[_]'') + N''/%'')
                 GROUP BY f.oldFolder, f.newFolder;

                 UPDATE x SET ' + QUOTENAME(@col) + N' =
                   CASE WHEN x.' + QUOTENAME(@col) + N' LIKE REPLACE(f.oldFolder, N''_'', N''[_]'') + N''/%''
                        THEN f.newFolder + SUBSTRING(x.' + QUOTENAME(@col) + N', LEN(f.oldFolder) + 1, 4000)
                        ELSE REPLACE(x.' + QUOTENAME(@col) + N', N''/'' + f.oldFolder + N''/'', N''/'' + f.newFolder + N''/'')
                   END
                 FROM ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N' x
                 JOIN #fix f ON f.oldFolder IS NOT NULL
                  AND (x.' + QUOTENAME(@col) + N' LIKE REPLACE(f.oldFolder, N''_'', N''[_]'') + N''/%''
                    OR x.' + QUOTENAME(@col) + N' LIKE N''%/'' + REPLACE(f.oldFolder, N''_'', N''[_]'') + N''/%'');';
    EXEC sp_executesql @sql, N'@sch SYSNAME, @tbl SYSNAME, @col SYSNAME', @sch = @sch, @tbl = @tbl, @col = @col;
    FETCH NEXT FROM pup INTO @sch, @tbl, @col;
  END
  CLOSE pup; DEALLOCATE pup;

  -- Re-enable and re-validate the paused foreign keys (fails -> rolls back)
  DECLARE fkcur2 CURSOR LOCAL FAST_FORWARD FOR SELECT sch, tbl, fkName FROM #fks;
  OPEN fkcur2;
  FETCH NEXT FROM fkcur2 INTO @sch, @tbl, @fk;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @sql = N'ALTER TABLE ' + QUOTENAME(@sch) + N'.' + QUOTENAME(@tbl) + N' WITH CHECK CHECK CONSTRAINT ' + QUOTENAME(@fk) + N';';
    EXEC sp_executesql @sql;
    FETCH NEXT FROM fkcur2 INTO @sch, @tbl, @fk;
  END
  CLOSE fkcur2; DEALLOCATE fkcur2;

  COMMIT TRANSACTION;
  PRINT 'Done. Changes are logged in dbo.ClientIDRenameLog.';
  SELECT * FROM dbo.ClientIDRenameLog ORDER BY id DESC;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  PRINT 'FAILED and rolled back. Nothing was changed.';
  THROW;
END CATCH;

/* ============================================================================
   UNDO (run separately, only if you need to put the old IDs back)
   ----------------------------------------------------------------------------
   DECLARE @s SYSNAME, @t SYSNAME, @c SYSNAME, @o NVARCHAR(100), @nw NVARCHAR(100), @q NVARCHAR(MAX);
   -- Pause the same foreign keys first (see step 3 query), then:
   DECLARE u CURSOR LOCAL FAST_FORWARD FOR
     SELECT tableSchema, tableName, columnName, oldID, newID FROM dbo.ClientIDRenameLog
     WHERE oldID NOT LIKE N'%/';
   OPEN u; FETCH NEXT FROM u INTO @s, @t, @c, @o, @nw;
   WHILE @@FETCH_STATUS = 0
   BEGIN
     SET @q = N'UPDATE ' + QUOTENAME(@s) + N'.' + QUOTENAME(@t) + N' SET ' + QUOTENAME(@c)
            + N' = @o WHERE ' + QUOTENAME(@c) + N' = @nw AND DATALENGTH(' + QUOTENAME(@c) + N') = DATALENGTH(@nw);';
     EXEC sp_executesql @q, N'@o NVARCHAR(100), @nw NVARCHAR(100)', @o = @o, @nw = @nw;
     FETCH NEXT FROM u INTO @s, @t, @c, @o, @nw;
   END
   CLOSE u; DEALLOCATE u;
   -- Re-enable the foreign keys WITH CHECK.
   -- Rows logged with a blob path column (oldID ending in '/') are folder
   -- renames: reverse them with REPLACE(col, newID, oldID) on that column, and
   -- move the blobs back with scripts/moveClientBlobs.js <new> <old> --apply.
============================================================================ */
