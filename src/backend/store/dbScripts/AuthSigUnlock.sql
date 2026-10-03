-- ========================================
-- Section 2: admin unlock of signed authorization forms
-- Idempotent: safe to run more than once. Run before deploying the backend
-- that includes POST /api/authorization/:clientID/form/:formType/unlock.
-- ========================================

-- Who last unlocked a signed form, when, and why
IF COL_LENGTH('dbo.AuthorizationForms', 'unlockedBy') IS NULL
    ALTER TABLE dbo.AuthorizationForms ADD unlockedBy NVARCHAR(100) NULL;

IF COL_LENGTH('dbo.AuthorizationForms', 'unlockedAt') IS NULL
    ALTER TABLE dbo.AuthorizationForms ADD unlockedAt DATETIME2 NULL;

IF COL_LENGTH('dbo.AuthorizationForms', 'unlockReason') IS NULL
    ALTER TABLE dbo.AuthorizationForms ADD unlockReason NVARCHAR(500) NULL;
GO

-- Append-only copy of each signed version, written before an unlock clears it
IF OBJECT_ID('dbo.AuthorizationFormVersions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuthorizationFormVersions (
        versionID            INT IDENTITY(1,1) PRIMARY KEY,
        formID               INT            NOT NULL,
        clientID             NVARCHAR(50)   NOT NULL,
        formType             NVARCHAR(50)   NOT NULL,

        -- Snapshot of the signed form
        formData             NVARCHAR(MAX)  NULL,
        checkboxData         NVARCHAR(MAX)  NULL,
        signature            NVARCHAR(200)  NULL,
        status               NVARCHAR(20)   NOT NULL,
        completionPercentage DECIMAL(5,2)   NULL,
        completedBy          NVARCHAR(100)  NULL,
        completedAt          DATETIME2      NULL,
        submissionID         INT            NULL,

        -- Why this version was archived
        archivedReason       NVARCHAR(50)   NOT NULL,   -- 'unlock'
        archivedBy           NVARCHAR(100)  NOT NULL,
        archivedAt           DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        unlockReason         NVARCHAR(500)  NULL
    );

    CREATE INDEX IX_AuthorizationFormVersions_Client_Form
        ON dbo.AuthorizationFormVersions (clientID, formType, archivedAt);
END
GO
