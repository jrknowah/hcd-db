-- changeClientID.sql (Azure SQL / T-SQL)
--
-- Changes a client's ID everywhere it is stored as a client ID, e.g.
-- 204849 -> 192356.
--
-- HOW TO USE
--   1. Set @OldID and @NewID below. Leave @Apply = 0 and run the script.
--      It changes nothing: it lists every table/column holding the client
--      ID and how many rows have the old and new ID.
--   2. Check the list. Then set @Apply = 1 and run it again to make the
--      change. Everything runs in one transaction: if any update fails,
--      nothing is changed.
--
-- WHAT IT DOES
--   - Finds every base table with a column named clientID / client_id
--     (any casing) and updates rows where it equals @OldID.
--   - Stops without changing anything if @OldID is not found, or if
--     @NewID is already used anywhere (that would merge two clients).
--   - Temporarily suspends foreign keys on those columns while updating,
--     then re-enables them (re-validated if they were validated before).
--   - Does NOT rewrite audit history (AuditLog, UserActionLog). Instead it
--     adds one AuditLog row recording the change.
--
-- NOT COVERED (outside SQL)
--   - Uploaded files in Azure Blob Storage live under "<clientID>/..."
--     folders. Files under 204849/ will not show for 192356 until they are
--     moved/renamed in the storage account.
--   - Record IDs that embed the old client ID as text (e.g. MH-204849-...,
--     CP-204849-...) are left as-is; they are only unique row identifiers.

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @OldID NVARCHAR(100) = N'204849';
DECLARE @NewID NVARCHAR(100) = N'192356';
DECLARE @Apply BIT = 0;   -- 0 = preview only, 1 = make the change

-- Audit tables are never rewritten.
DECLARE @Excluded TABLE (tableName SYSNAME PRIMARY KEY);
INSERT INTO @Excluded VALUES (N'AuditLog'), (N'UserActionLog');

IF OBJECT_ID('tempdb..#Targets') IS NOT NULL DROP TABLE #Targets;
CREATE TABLE #Targets (
    schemaName SYSNAME,
    tableName  SYSNAME,
    columnName SYSNAME,
    objectID   INT,
    columnID   INT,
    oldRows    INT NULL,
    newRows    INT NULL
);

INSERT INTO #Targets (schemaName, tableName, columnName, objectID, columnID)
SELECT s.name, t.name, c.name, t.object_id, c.column_id
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.columns c ON c.object_id = t.object_id
WHERE LOWER(c.name) IN (N'clientid', N'client_id')
  AND c.is_computed = 0
  AND t.is_ms_shipped = 0
  AND t.name NOT IN (SELECT tableName FROM @Excluded);

-- Count rows with the old and new ID in each column.
DECLARE @schema SYSNAME, @table SYSNAME, @column SYSNAME, @sql NVARCHAR(MAX);
DECLARE @oldRows INT, @newRows INT;

DECLARE target_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT schemaName, tableName, columnName FROM #Targets;
OPEN target_cursor;
FETCH NEXT FROM target_cursor INTO @schema, @table, @column;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @sql = N'SELECT @o = SUM(CASE WHEN CAST(' + QUOTENAME(@column) + N' AS NVARCHAR(100)) = @OldID THEN 1 ELSE 0 END),
                        @n = SUM(CASE WHEN CAST(' + QUOTENAME(@column) + N' AS NVARCHAR(100)) = @NewID THEN 1 ELSE 0 END)
                 FROM ' + QUOTENAME(@schema) + N'.' + QUOTENAME(@table) + N'
                 WHERE CAST(' + QUOTENAME(@column) + N' AS NVARCHAR(100)) IN (@OldID, @NewID);';
    EXEC sp_executesql @sql,
        N'@OldID NVARCHAR(100), @NewID NVARCHAR(100), @o INT OUTPUT, @n INT OUTPUT',
        @OldID, @NewID, @oldRows OUTPUT, @newRows OUTPUT;

    UPDATE #Targets SET oldRows = ISNULL(@oldRows, 0), newRows = ISNULL(@newRows, 0)
    WHERE schemaName = @schema AND tableName = @table AND columnName = @column;

    FETCH NEXT FROM target_cursor INTO @schema, @table, @column;
END
CLOSE target_cursor;
DEALLOCATE target_cursor;

-- Preview
SELECT schemaName + N'.' + tableName AS [table], columnName AS [column],
       oldRows AS [rows with old ID], newRows AS [rows with new ID]
FROM #Targets
WHERE oldRows > 0 OR newRows > 0
ORDER BY tableName;

DECLARE @totalOld INT = (SELECT ISNULL(SUM(oldRows), 0) FROM #Targets);
DECLARE @totalNew INT = (SELECT ISNULL(SUM(newRows), 0) FROM #Targets);

PRINT CONCAT(N'Rows with old ID ', @OldID, N': ', @totalOld);
PRINT CONCAT(N'Rows with new ID ', @NewID, N': ', @totalNew);

IF @totalOld = 0
BEGIN
    PRINT N'STOPPED: old ID not found. Nothing changed.';
    RETURN;
END

IF @totalNew > 0
BEGIN
    PRINT N'STOPPED: new ID is already in use (see "rows with new ID" above). Changing it would merge two clients. Nothing changed.';
    RETURN;
END

IF @Apply = 0
BEGIN
    PRINT N'PREVIEW ONLY. Nothing changed. Set @Apply = 1 and run again to make the change.';
    RETURN;
END

-- Foreign keys touching any target column (as child or as referenced parent).
IF OBJECT_ID('tempdb..#FKs') IS NOT NULL DROP TABLE #FKs;
SELECT DISTINCT fk.name AS fkName, ps.name AS schemaName, pt.name AS tableName,
       fk.is_not_trusted AS wasNotTrusted
INTO #FKs
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables pt ON pt.object_id = fk.parent_object_id
JOIN sys.schemas ps ON ps.schema_id = pt.schema_id
WHERE fk.is_disabled = 0
  AND (EXISTS (SELECT 1 FROM #Targets t WHERE t.objectID = fkc.parent_object_id     AND t.columnID = fkc.parent_column_id)
    OR EXISTS (SELECT 1 FROM #Targets t WHERE t.objectID = fkc.referenced_object_id AND t.columnID = fkc.referenced_column_id));

DECLARE @fk SYSNAME, @wasNotTrusted BIT, @updated INT, @totalUpdated INT = 0;

BEGIN TRY
    BEGIN TRANSACTION;

    -- Suspend foreign keys
    DECLARE fk_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT fkName, schemaName, tableName FROM #FKs;
    OPEN fk_cursor;
    FETCH NEXT FROM fk_cursor INTO @fk, @schema, @table;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'ALTER TABLE ' + QUOTENAME(@schema) + N'.' + QUOTENAME(@table) + N' NOCHECK CONSTRAINT ' + QUOTENAME(@fk) + N';';
        EXEC sp_executesql @sql;
        FETCH NEXT FROM fk_cursor INTO @fk, @schema, @table;
    END
    CLOSE fk_cursor;
    DEALLOCATE fk_cursor;

    -- Update every table holding the old ID
    DECLARE update_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT schemaName, tableName, columnName FROM #Targets WHERE oldRows > 0;
    OPEN update_cursor;
    FETCH NEXT FROM update_cursor INTO @schema, @table, @column;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'UPDATE ' + QUOTENAME(@schema) + N'.' + QUOTENAME(@table) +
                   N' SET ' + QUOTENAME(@column) + N' = @NewID' +
                   N' WHERE CAST(' + QUOTENAME(@column) + N' AS NVARCHAR(100)) = @OldID; SET @u = @@ROWCOUNT;';
        EXEC sp_executesql @sql, N'@OldID NVARCHAR(100), @NewID NVARCHAR(100), @u INT OUTPUT',
            @OldID, @NewID, @updated OUTPUT;
        SET @totalUpdated += @updated;
        PRINT CONCAT(N'Updated ', @updated, N' row(s) in ', @schema, N'.', @table, N'.', @column);
        FETCH NEXT FROM update_cursor INTO @schema, @table, @column;
    END
    CLOSE update_cursor;
    DEALLOCATE update_cursor;

    -- Re-enable foreign keys; re-validate the ones that were validated before
    DECLARE fk_cursor2 CURSOR LOCAL FAST_FORWARD FOR SELECT fkName, schemaName, tableName, wasNotTrusted FROM #FKs;
    OPEN fk_cursor2;
    FETCH NEXT FROM fk_cursor2 INTO @fk, @schema, @table, @wasNotTrusted;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'ALTER TABLE ' + QUOTENAME(@schema) + N'.' + QUOTENAME(@table) +
                   CASE WHEN @wasNotTrusted = 1 THEN N' WITH NOCHECK' ELSE N' WITH CHECK' END +
                   N' CHECK CONSTRAINT ' + QUOTENAME(@fk) + N';';
        EXEC sp_executesql @sql;
        FETCH NEXT FROM fk_cursor2 INTO @fk, @schema, @table, @wasNotTrusted;
    END
    CLOSE fk_cursor2;
    DEALLOCATE fk_cursor2;

    -- Record the change in the audit log
    IF OBJECT_ID(N'dbo.AuditLog', N'U') IS NOT NULL
        INSERT INTO dbo.AuditLog (userID, action, tableName, recordID, newValues, timestamp)
        VALUES (SUSER_SNAME(), N'CHANGE_CLIENT_ID', N'(all client tables)', @NewID,
                CONCAT(N'{"oldClientID":"', @OldID, N'","newClientID":"', @NewID, N'","rowsUpdated":', @totalUpdated, N'}'),
                SYSUTCDATETIME());

    COMMIT TRANSACTION;
    PRINT CONCAT(N'DONE: client ID ', @OldID, N' changed to ', @NewID, N' in ', @totalUpdated, N' row(s).');
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT N'FAILED: nothing was changed.';
    THROW;
END CATCH;
