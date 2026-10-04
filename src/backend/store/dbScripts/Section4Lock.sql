-- ========================================
-- Section 4: draft / submitted encounter notes and care plans
-- Submitted records are locked. Only IT Admin / Level 1 can unlock them.
-- Idempotent: safe to run more than once. Run before deploying the backend
-- that includes POST /api/encounter-notes/:noteId/unlock and
-- POST /api/care-plans/:carePlanID/unlock.
--
-- Rows that already exist were saved before drafts existed, so they are
-- marked 'submitted' (locked). Their submitter is taken from the last person
-- to save them (updatedBy, else createdBy).
-- ========================================

-- ---------- EncounterNotes ----------
IF COL_LENGTH('dbo.EncounterNotes', 'SubmissionStatus') IS NULL
    ALTER TABLE dbo.EncounterNotes
        ADD SubmissionStatus NVARCHAR(20) NOT NULL
            CONSTRAINT DF_EncounterNotes_SubmissionStatus DEFAULT 'submitted';

IF COL_LENGTH('dbo.EncounterNotes', 'SubmittedBy') IS NULL
    ALTER TABLE dbo.EncounterNotes ADD SubmittedBy NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.EncounterNotes', 'SubmittedAt') IS NULL
    ALTER TABLE dbo.EncounterNotes ADD SubmittedAt DATETIME2 NULL;

IF COL_LENGTH('dbo.EncounterNotes', 'UnlockedBy') IS NULL
    ALTER TABLE dbo.EncounterNotes ADD UnlockedBy NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.EncounterNotes', 'UnlockedAt') IS NULL
    ALTER TABLE dbo.EncounterNotes ADD UnlockedAt DATETIME2 NULL;

IF COL_LENGTH('dbo.EncounterNotes', 'UnlockReason') IS NULL
    ALTER TABLE dbo.EncounterNotes ADD UnlockReason NVARCHAR(500) NULL;
GO

IF OBJECT_ID('dbo.CK_EncounterNotes_SubmissionStatus', 'C') IS NULL
    ALTER TABLE dbo.EncounterNotes
        ADD CONSTRAINT CK_EncounterNotes_SubmissionStatus
        CHECK (SubmissionStatus IN ('draft', 'submitted'));
GO

-- Existing notes: record the last person to save them as the submitter
UPDATE dbo.EncounterNotes
SET SubmittedBy = COALESCE(UpdatedBy, CreatedBy),
    SubmittedAt = COALESCE(UpdatedAt, CreatedAt)
WHERE SubmissionStatus = 'submitted' AND SubmittedBy IS NULL;
GO

-- ---------- CarePlans ----------
IF COL_LENGTH('dbo.CarePlans', 'submissionStatus') IS NULL
    ALTER TABLE dbo.CarePlans
        ADD submissionStatus NVARCHAR(20) NOT NULL
            CONSTRAINT DF_CarePlans_SubmissionStatus DEFAULT 'submitted';

IF COL_LENGTH('dbo.CarePlans', 'submittedBy') IS NULL
    ALTER TABLE dbo.CarePlans ADD submittedBy NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.CarePlans', 'submittedAt') IS NULL
    ALTER TABLE dbo.CarePlans ADD submittedAt DATETIME2 NULL;

IF COL_LENGTH('dbo.CarePlans', 'unlockedBy') IS NULL
    ALTER TABLE dbo.CarePlans ADD unlockedBy NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.CarePlans', 'unlockedAt') IS NULL
    ALTER TABLE dbo.CarePlans ADD unlockedAt DATETIME2 NULL;

IF COL_LENGTH('dbo.CarePlans', 'unlockReason') IS NULL
    ALTER TABLE dbo.CarePlans ADD unlockReason NVARCHAR(500) NULL;
GO

IF OBJECT_ID('dbo.CK_CarePlans_SubmissionStatus', 'C') IS NULL
    ALTER TABLE dbo.CarePlans
        ADD CONSTRAINT CK_CarePlans_SubmissionStatus
        CHECK (submissionStatus IN ('draft', 'submitted'));
GO

-- Existing care plans: record the last person to save them as the submitter
UPDATE dbo.CarePlans
SET submittedBy = COALESCE(updatedBy, createdBy),
    submittedAt = COALESCE(updatedAt, createdAt)
WHERE submissionStatus = 'submitted' AND submittedBy IS NULL;
GO

-- ---------- Archived submitted versions ----------
-- Append-only copy of each submitted record, written before an unlock
-- re-opens it for editing.
IF OBJECT_ID('dbo.Section4RecordVersions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Section4RecordVersions (
        versionID     INT IDENTITY(1,1) PRIMARY KEY,
        recordType    NVARCHAR(30)   NOT NULL,   -- 'EncounterNote' | 'CarePlan'
        recordID      NVARCHAR(100)  NOT NULL,
        clientID      NVARCHAR(50)   NOT NULL,

        -- JSON snapshot of the submitted record
        snapshot      NVARCHAR(MAX)  NOT NULL,
        submittedBy   NVARCHAR(255)  NULL,
        submittedAt   DATETIME2      NULL,

        archivedReason NVARCHAR(50)  NOT NULL,   -- 'unlock'
        archivedBy    NVARCHAR(255)  NOT NULL,
        archivedAt    DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        unlockReason  NVARCHAR(500)  NULL
    );

    CREATE INDEX IX_Section4RecordVersions_Record
        ON dbo.Section4RecordVersions (recordType, recordID, archivedAt);
END
GO
