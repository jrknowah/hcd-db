-- UploadedFiles Table Creation Script
-- This table stores metadata for uploaded note files

-- Drop table if it exists (for development/testing)
-- IF OBJECT_ID('dbo.UploadedFiles', 'U') IS NOT NULL
-- DROP TABLE dbo.UploadedFiles;

CREATE TABLE dbo.UploadedFiles (
    fileID INT IDENTITY(1,1) PRIMARY KEY,
    originalName NVARCHAR(255) NOT NULL,           -- Original filename from user
    fileName NVARCHAR(255) NOT NULL UNIQUE,         -- Stored filename (unique)
    filePath NVARCHAR(500) NOT NULL,                -- Full path to file on disk
    fileSize BIGINT NOT NULL,                       -- File size in bytes
    mimeType NVARCHAR(100) NOT NULL,                -- MIME type (application/pdf, etc.)
    uploadType NVARCHAR(50) NOT NULL DEFAULT 'note-archive', -- Type of upload
    description NVARCHAR(500) NULL,                 -- Optional description
    clientID NVARCHAR(50) NULL,                     -- Associated client (if any)
    uploadedBy NVARCHAR(255) NOT NULL,              -- User who uploaded
    uploadedAt DATETIME2 NOT NULL DEFAULT GETDATE(), -- Upload timestamp
    downloadCount INT NOT NULL DEFAULT 0,           -- Track downloads
    lastDownloadAt DATETIME2 NULL,                  -- Last download time
    isActive BIT NOT NULL DEFAULT 1                 -- Soft delete flag
);

-- Create indexes for better performance
CREATE INDEX IX_UploadedFiles_UploadedAt 
ON dbo.UploadedFiles (uploadedAt DESC);

CREATE INDEX IX_UploadedFiles_UploadType 
ON dbo.UploadedFiles (uploadType);

CREATE INDEX IX_UploadedFiles_ClientID 
ON dbo.UploadedFiles (clientID) 
WHERE clientID IS NOT NULL;

CREATE INDEX IX_UploadedFiles_UploadedBy 
ON dbo.UploadedFiles (uploadedBy);

CREATE INDEX IX_UploadedFiles_FileName 
ON dbo.UploadedFiles (fileName);

CREATE INDEX IX_UploadedFiles_Active
ON dbo.UploadedFiles (isActive, uploadedAt DESC);

-- Add constraints
ALTER TABLE dbo.UploadedFiles
ADD CONSTRAINT CK_UploadedFiles_FileSize 
CHECK (fileSize > 0 AND fileSize <= 52428800); -- Max 50MB

ALTER TABLE dbo.UploadedFiles
ADD CONSTRAINT CK_UploadedFiles_UploadType 
CHECK (uploadType IN ('note-archive', 'client-document', 'report', 'template', 'other'));

ALTER TABLE dbo.UploadedFiles
ADD CONSTRAINT CK_UploadedFiles_MimeType
CHECK (mimeType IN (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
));

-- Foreign key constraint (uncomment if you have a Clients table)
-- ALTER TABLE dbo.UploadedFiles
-- ADD CONSTRAINT FK_UploadedFiles_ClientID 
-- FOREIGN KEY (clientID) REFERENCES dbo.Clients(clientID);

-- Sample data for testing (optional)
/*
INSERT INTO dbo.UploadedFiles (
    originalName, fileName, filePath, fileSize, mimeType,
    uploadType, description, clientID, uploadedBy, uploadedAt
) VALUES 
('client-notes-march-2024.pdf', 'client-notes-march-2024-1710000000000.pdf', 'uploads/notes/client-notes-march-2024-1710000000000.pdf', 2048000, 'application/pdf', 'note-archive', 'Monthly client progress notes', 'CLIENT-001', 'demo@example.com', GETDATE()),
('therapy-session-notes.docx', 'therapy-session-notes-1710000000001.docx', 'uploads/notes/therapy-session-notes-1710000000001.docx', 512000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'note-archive', 'Group therapy session documentation', 'CLIENT-002', 'demo@example.com', GETDATE()),
('assessment-report.xlsx', 'assessment-report-1710000000002.xlsx', 'uploads/notes/assessment-report-1710000000002.xlsx', 1024000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'report', 'Client assessment scores', 'CLIENT-001', 'demo@example.com', GETDATE());
*/

-- Create triggers for audit trail
CREATE TRIGGER tr_UploadedFiles_UpdateDownloadCount
ON dbo.UploadedFiles
FOR UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Update lastDownloadAt when downloadCount increases
    UPDATE uf
    SET lastDownloadAt = GETDATE()
    FROM dbo.UploadedFiles uf
    INNER JOIN INSERTED i ON uf.fileID = i.fileID
    INNER JOIN DELETED d ON uf.fileID = d.fileID
    WHERE i.downloadCount > d.downloadCount;
END;

-- View for file statistics
CREATE VIEW dbo.vw_UploadedFilesStats AS
SELECT 
    uploadType,
    COUNT(*) as FileCount,
    SUM(fileSize) as TotalSize,
    AVG(CAST(fileSize as FLOAT)) as AvgSize,
    MAX(fileSize) as MaxSize,
    MIN(fileSize) as MinSize,
    COUNT(CASE WHEN uploadedAt >= DATEADD(DAY, -30, GETDATE()) THEN 1 END) as FilesLast30Days,
    COUNT(CASE WHEN uploadedAt >= DATEADD(DAY, -7, GETDATE()) THEN 1 END) as FilesLast7Days,
    SUM(downloadCount) as TotalDownloads
FROM dbo.UploadedFiles
WHERE isActive = 1
GROUP BY uploadType;

-- View for recent uploads
CREATE VIEW dbo.vw_RecentUploads AS
SELECT TOP 100
    fileID,
    originalName,
    fileName,
    fileSize,
    uploadType,
    clientID,
    uploadedBy,
    uploadedAt,
    downloadCount,
    CASE 
        WHEN fileSize < 1024 THEN CAST(fileSize AS VARCHAR(20)) + ' B'
        WHEN fileSize < 1048576 THEN CAST(fileSize/1024 AS VARCHAR(20)) + ' KB'
        WHEN fileSize < 1073741824 THEN CAST(fileSize/1048576 AS VARCHAR(20)) + ' MB'
        ELSE CAST(fileSize/1073741824 AS VARCHAR(20)) + ' GB'
    END as FileSizeFormatted
FROM dbo.UploadedFiles
WHERE isActive = 1
ORDER BY uploadedAt DESC;

-- Stored procedure for cleanup old files
CREATE PROCEDURE sp_CleanupOldFiles
    @DaysOld INT = 365,
    @DryRun BIT = 1  -- Set to 0 to actually delete
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @FilesToDelete TABLE (
        fileID INT,
        originalName NVARCHAR(255),
        filePath NVARCHAR(500),
        fileSize BIGINT,
        uploadedAt DATETIME2
    );
    
    -- Find files older than specified days
    INSERT INTO @FilesToDelete
    SELECT fileID, originalName, filePath, fileSize, uploadedAt
    FROM dbo.UploadedFiles
    WHERE uploadedAt < DATEADD(DAY, -@DaysOld, GETDATE())
        AND isActive = 1;
    
    SELECT 
        COUNT(*) as FilesToDelete,
        SUM(fileSize) as TotalSizeToDelete,
        MIN(uploadedAt) as OldestFile,
        MAX(uploadedAt) as NewestFileToDelete
    FROM @FilesToDelete;
    
    IF @DryRun = 0
    BEGIN
        -- Mark files as inactive (soft delete)
        UPDATE dbo.UploadedFiles
        SET isActive = 0
        WHERE fileID IN (SELECT fileID FROM @FilesToDelete);
        
        SELECT @@ROWCOUNT as FilesMarkedInactive;
    END
    ELSE
    BEGIN
        SELECT 'DRY RUN - No files were actually deleted' as Message;
        
        -- Show files that would be deleted
        SELECT originalName, filePath, fileSize, uploadedAt
        FROM @FilesToDelete
        ORDER BY uploadedAt;
    END
END;

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.UploadedFiles TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_UploadedFilesStats TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_RecentUploads TO [YourAppRole];
-- GRANT EXECUTE ON sp_CleanupOldFiles TO [YourAdminRole];