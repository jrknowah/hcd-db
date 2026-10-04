-- ========================================
-- Section 5: who uploaded each Nursing Archive file
-- Idempotent: safe to run more than once. Run before deploying the backend
-- that includes POST /api/section5/archive-uploads.
--
-- Archive files themselves live in blob storage; this table records the
-- uploader (taken from their sign-in, never from the browser) per blob.
-- Each upload is also written to dbo.AuditLog as UPLOAD_NURSING_ARCHIVE.
-- Files uploaded before this table existed have no row (uploader unknown).
-- ========================================

IF OBJECT_ID('dbo.NursingArchiveUploads', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.NursingArchiveUploads (
        uploadID        BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_NursingArchiveUploads PRIMARY KEY,
        clientID        NVARCHAR(50)   NOT NULL,
        blobName        NVARCHAR(1024) NOT NULL,
        fileName        NVARCHAR(255)  NULL,
        docType         NVARCHAR(255)  NULL,
        uploadedBy      NVARCHAR(255)  NOT NULL,  -- email / UPN
        uploadedByName  NVARCHAR(255)  NULL,      -- display name
        uploadedAt      DATETIME2      NOT NULL CONSTRAINT DF_NursingArchiveUploads_uploadedAt DEFAULT SYSUTCDATETIME()
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NursingArchiveUploads_clientID'
               AND object_id = OBJECT_ID('dbo.NursingArchiveUploads'))
    CREATE INDEX IX_NursingArchiveUploads_clientID
        ON dbo.NursingArchiveUploads (clientID, uploadedAt DESC);
