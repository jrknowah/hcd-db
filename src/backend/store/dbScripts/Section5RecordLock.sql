-- ========================================
-- Section 5: lock submitted notes and observation records
-- Idempotent: safe to run more than once. Run before deploying the backend
-- that includes POST /api/section5/records/:recordType/:id/unlock.
--
-- Tables: progress_notes, idt_nursing_notes, idt_provider_notes,
--         medication_administration_record, vital_signs, daily_observations
-- Each gets:
--   isLocked      1 once submitted; only IT Admin / Level 1 can clear it
--   submittedBy / submittedAt
--   unlockedBy / unlockedAt / unlockReason  (last unlock)
-- Existing rows start unlocked (isLocked = 0), i.e. as saved progress.
-- ========================================

DECLARE @tables TABLE (name SYSNAME);
INSERT INTO @tables (name) VALUES
    ('progress_notes'),
    ('idt_nursing_notes'),
    ('idt_provider_notes'),
    ('medication_administration_record'),
    ('vital_signs'),
    ('daily_observations');

DECLARE @t SYSNAME, @full NVARCHAR(300), @sql NVARCHAR(MAX);
DECLARE table_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM @tables;
OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @t;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @full = N'dbo.' + QUOTENAME(@t);

    IF COL_LENGTH(@full, 'isLocked') IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE ' + @full + N' ADD isLocked BIT NOT NULL CONSTRAINT '
                 + QUOTENAME(N'DF_' + @t + N'_isLocked') + N' DEFAULT 0;';
        EXEC sp_executesql @sql;
    END

    IF COL_LENGTH(@full, 'submittedBy') IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE ' + @full + N' ADD submittedBy NVARCHAR(255) NULL;';
        EXEC sp_executesql @sql;
    END

    IF COL_LENGTH(@full, 'submittedAt') IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE ' + @full + N' ADD submittedAt DATETIME2 NULL;';
        EXEC sp_executesql @sql;
    END

    IF COL_LENGTH(@full, 'unlockedBy') IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE ' + @full + N' ADD unlockedBy NVARCHAR(255) NULL;';
        EXEC sp_executesql @sql;
    END

    IF COL_LENGTH(@full, 'unlockedAt') IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE ' + @full + N' ADD unlockedAt DATETIME2 NULL;';
        EXEC sp_executesql @sql;
    END

    IF COL_LENGTH(@full, 'unlockReason') IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE ' + @full + N' ADD unlockReason NVARCHAR(500) NULL;';
        EXEC sp_executesql @sql;
    END

    FETCH NEXT FROM table_cursor INTO @t;
END
CLOSE table_cursor;
DEALLOCATE table_cursor;
GO

-- Append-only copy of each submitted version, written before an unlock
-- re-opens it or an admin deletes it
IF OBJECT_ID('dbo.Section5RecordVersions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Section5RecordVersions (
        versionID      INT IDENTITY(1,1) PRIMARY KEY,
        recordType     NVARCHAR(50)   NOT NULL,   -- progress-note, idt-nursing, ...
        recordID       BIGINT         NOT NULL,
        clientID       NVARCHAR(50)   NULL,

        -- Full row as submitted (JSON)
        snapshot       NVARCHAR(MAX)  NOT NULL,
        submittedBy    NVARCHAR(255)  NULL,
        submittedAt    DATETIME2      NULL,

        -- Why this version was archived
        archivedReason NVARCHAR(50)   NOT NULL,   -- 'unlock' or 'delete'
        archivedBy     NVARCHAR(255)  NOT NULL,
        archivedAt     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        unlockReason   NVARCHAR(500)  NULL       -- reason given for the unlock or delete
    );

    CREATE INDEX IX_Section5RecordVersions_Record
        ON dbo.Section5RecordVersions (recordType, recordID, archivedAt);
END
GO

-- Optional: treat everything already on file as submitted (locked).
-- Uncomment to lock existing records when this feature goes live.
-- UPDATE dbo.progress_notes                   SET isLocked = 1 WHERE isLocked = 0;
-- UPDATE dbo.idt_nursing_notes                SET isLocked = 1 WHERE isLocked = 0;
-- UPDATE dbo.idt_provider_notes               SET isLocked = 1 WHERE isLocked = 0;
-- UPDATE dbo.medication_administration_record SET isLocked = 1 WHERE isLocked = 0;
-- UPDATE dbo.vital_signs                      SET isLocked = 1 WHERE isLocked = 0;
-- UPDATE dbo.daily_observations               SET isLocked = 1 WHERE isLocked = 0;
