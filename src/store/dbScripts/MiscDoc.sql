-- =============================================
-- Miscellaneous Documents Database Schema
-- Complete database setup for Miscellaneous Documents functionality
-- =============================================

-- Drop existing objects if they exist
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_MiscDocumentsSummary')
    DROP VIEW vw_MiscDocumentsSummary;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_DocumentRetentionAnalysis')
    DROP VIEW vw_DocumentRetentionAnalysis;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_DocumentAccessTracking')
    DROP VIEW vw_DocumentAccessTracking;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetMiscDocumentsProfile')
    DROP PROCEDURE sp_GetMiscDocumentsProfile;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_UpdateDocumentStatus')
    DROP PROCEDURE sp_UpdateDocumentStatus;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GenerateDocumentReport')
    DROP PROCEDURE sp_GenerateDocumentReport;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CheckRetentionAlerts')
    DROP PROCEDURE sp_CheckRetentionAlerts;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'MiscDocuments')
    DROP TABLE MiscDocuments;

-- =============================================
-- Main MiscDocuments Table
-- =============================================
CREATE TABLE dbo.MiscDocuments (
    -- Primary Key
    documentID INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Client Reference
    clientID NVARCHAR(50) NOT NULL,
    
    -- File Information
    fileName NVARCHAR(255) NOT NULL,
    originalFileName NVARCHAR(255) NOT NULL,
    fileSize BIGINT NOT NULL,
    mimeType NVARCHAR(100) NOT NULL,
    filePath NVARCHAR(500) NOT NULL,
    
    -- Document Metadata
    documentCategory NVARCHAR(100) NOT NULL DEFAULT 'general',
    documentDescription NVARCHAR(MAX) NULL,
    uploadDate DATE NOT NULL,
    lastAccessed DATETIME2 NULL,
    accessCount INT NOT NULL DEFAULT 0,
    
    -- Document Status
    isArchived BIT NOT NULL DEFAULT 0,
    retentionDate DATE NULL,
    confidentialityLevel NVARCHAR(50) NOT NULL DEFAULT 'Medium',
    
    -- Approval Workflow
    uploadedBy NVARCHAR(100) NOT NULL,
    approvedBy NVARCHAR(100) NULL,
    approvalDate DATE NULL,
    
    -- Version Control
    version INT NOT NULL DEFAULT 1,
    checksum NVARCHAR(100) NULL,
    
    -- Document Relationships
    tags NVARCHAR(MAX) NULL,                    -- JSON array of tags
    relatedDocuments NVARCHAR(MAX) NULL,       -- JSON array of related document IDs
    
    -- Audit Fields
    createdBy NVARCHAR(100) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(100) NOT NULL,
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT CK_MiscDocuments_DocumentCategory CHECK (documentCategory IN (
        'general', 'medical', 'legal', 'financial', 'identification', 
        'benefits', 'housing', 'employment', 'other'
    )),
    CONSTRAINT CK_MiscDocuments_ConfidentialityLevel CHECK (confidentialityLevel IN ('Low', 'Medium', 'High')),
    CONSTRAINT CK_MiscDocuments_FileSize CHECK (fileSize > 0),
    CONSTRAINT CK_MiscDocuments_AccessCount CHECK (accessCount >= 0),
    CONSTRAINT CK_MiscDocuments_Version CHECK (version > 0),
    CONSTRAINT CK_MiscDocuments_UploadDate CHECK (uploadDate <= GETDATE()),
    CONSTRAINT CK_MiscDocuments_RetentionDate CHECK (retentionDate > uploadDate OR retentionDate IS NULL),
    CONSTRAINT CK_MiscDocuments_ApprovalDate CHECK (approvalDate >= uploadDate OR approvalDate IS NULL)
);

-- Create Indexes for Performance
CREATE NONCLUSTERED INDEX IX_MiscDocuments_ClientID ON dbo.MiscDocuments (clientID);
CREATE NONCLUSTERED INDEX IX_MiscDocuments_DocumentCategory ON dbo.MiscDocuments (documentCategory);
CREATE NONCLUSTERED INDEX IX_MiscDocuments_UploadDate ON dbo.MiscDocuments (uploadDate);
CREATE NONCLUSTERED INDEX IX_MiscDocuments_IsArchived ON dbo.MiscDocuments (isArchived);
CREATE NONCLUSTERED INDEX IX_MiscDocuments_RetentionDate ON dbo.MiscDocuments (retentionDate);
CREATE NONCLUSTERED INDEX IX_MiscDocuments_UploadedBy ON dbo.MiscDocuments (uploadedBy);
CREATE NONCLUSTERED INDEX IX_MiscDocuments_ApprovedBy ON dbo.MiscDocuments (approvedBy);
CREATE NONCLUSTERED INDEX IX_MiscDocuments_ConfidentialityLevel ON dbo.MiscDocuments (confidentialityLevel);
CREATE NONCLUSTERED INDEX IX_MiscDocuments_AccessCount ON dbo.MiscDocuments (accessCount);
CREATE NONCLUSTERED INDEX IX_MiscDocuments_CreatedAt ON dbo.MiscDocuments (createdAt);

-- Full-text search index for document descriptions
CREATE FULLTEXT CATALOG MiscDocumentsCatalog;
CREATE FULLTEXT INDEX ON dbo.MiscDocuments (documentDescription)
    KEY INDEX PK__MiscDocuments__[DocumentID]
    ON MiscDocumentsCatalog;

-- =============================================
-- Views for Reporting and Analytics
-- =============================================

-- Miscellaneous Documents Summary View
CREATE VIEW vw_MiscDocumentsSummary AS
SELECT 
    md.documentID,
    md.clientID,
    md.fileName,
    md.originalFileName,
    md.fileSize,
    md.mimeType,
    md.documentCategory,
    md.documentDescription,
    md.uploadDate,
    md.lastAccessed,
    md.accessCount,
    md.isArchived,
    md.retentionDate,
    md.confidentialityLevel,
    md.uploadedBy,
    md.approvedBy,
    md.approvalDate,
    md.version,
    md.checksum,
    md.tags,
    md.relatedDocuments,
    md.createdAt,
    md.updatedAt,
    md.updatedBy,
    
    -- Calculated fields
    CASE 
        WHEN md.isArchived = 1 THEN 'Archived'
        WHEN md.approvedBy IS NULL THEN 'Pending Approval'
        WHEN md.retentionDate <= GETDATE() THEN 'Expired'
        ELSE 'Active'
    END AS documentStatus,
    
    CASE 
        WHEN md.fileSize > 10485760 THEN 'Large'     -- > 10MB
        WHEN md.fileSize > 1048576 THEN 'Medium'     -- > 1MB
        ELSE 'Small'
    END AS fileSizeCategory,
    
    CASE 
        WHEN md.accessCount = 0 THEN 'Never Accessed'
        WHEN md.accessCount < 5 THEN 'Low Access'
        WHEN md.accessCount < 20 THEN 'Medium Access'
        ELSE 'High Access'
    END AS accessLevel,
    
    CASE 
        WHEN md.retentionDate IS NULL THEN 'No Retention Date'
        WHEN md.retentionDate <= DATEADD(day, 30, GETDATE()) THEN 'Expires Soon'
        WHEN md.retentionDate <= DATEADD(day, 90, GETDATE()) THEN 'Expires This Quarter'
        ELSE 'Active'
    END AS retentionStatus,
    
    DATEDIFF(day, md.uploadDate, GETDATE()) AS daysOld,
    DATEDIFF(day, md.lastAccessed, GETDATE()) AS daysSinceAccessed,
    
    -- File extension
    UPPER(RIGHT(md.originalFileName, CHARINDEX('.', REVERSE(md.originalFileName)) - 1)) AS fileExtension,
    
    -- Storage efficiency
    CASE 
        WHEN md.accessCount = 0 AND DATEDIFF(day, md.uploadDate, GETDATE()) > 365 THEN 'Consider Archiving'
        WHEN md.accessCount > 0 AND md.lastAccessed < DATEADD(day, -180, GETDATE()) THEN 'Low Activity'
        ELSE 'Active Use'
    END AS storageRecommendation
FROM dbo.MiscDocuments md;

-- Document Retention Analysis View
CREATE VIEW vw_DocumentRetentionAnalysis AS
SELECT 
    md.clientID,
    md.documentCategory,
    COUNT(*) AS documentCount,
    SUM(md.fileSize) AS totalFileSize,
    AVG(CAST(md.fileSize AS FLOAT)) AS avgFileSize,
    MIN(md.uploadDate) AS oldestDocument,
    MAX(md.uploadDate) AS newestDocument,
    
    -- Retention analysis
    SUM(CASE WHEN md.retentionDate <= GETDATE() THEN 1 ELSE 0 END) AS expiredDocuments,
    SUM(CASE WHEN md.retentionDate <= DATEADD(day, 30, GETDATE()) THEN 1 ELSE 0 END) AS expiringSoon,
    SUM(CASE WHEN md.retentionDate <= DATEADD(day, 90, GETDATE()) THEN 1 ELSE 0 END) AS expiringThisQuarter,
    
    -- Access analysis
    SUM(md.accessCount) AS totalAccesses,
    AVG(CAST(md.accessCount AS FLOAT)) AS avgAccessCount,
    SUM(CASE WHEN md.accessCount = 0 THEN 1 ELSE 0 END) AS neverAccessed,
    SUM(CASE WHEN md.lastAccessed < DATEADD(day, -180, GETDATE()) THEN 1 ELSE 0 END) AS staleDocuments,
    
    -- Approval analysis
    SUM(CASE WHEN md.approvedBy IS NULL THEN 1 ELSE 0 END) AS pendingApprovals,
    SUM(CASE WHEN md.approvedBy IS NOT NULL THEN 1 ELSE 0 END) AS approvedDocuments,
    
    -- Storage analysis
    SUM(CASE WHEN md.isArchived = 1 THEN 1 ELSE 0 END) AS archivedDocuments,
    SUM(CASE WHEN md.isArchived = 0 THEN 1 ELSE 0 END) AS activeDocuments,
    
    -- Confidentiality analysis
    SUM(CASE WHEN md.confidentialityLevel = 'High' THEN 1 ELSE 0 END) AS highConfidentiality,
    SUM(CASE WHEN md.confidentialityLevel = 'Medium' THEN 1 ELSE 0 END) AS mediumConfidentiality,
    SUM(CASE WHEN md.confidentialityLevel = 'Low' THEN 1 ELSE 0 END) AS lowConfidentiality,
    
    MAX(md.updatedAt) AS lastUpdated
FROM dbo.MiscDocuments md
GROUP BY md.clientID, md.documentCategory;

-- Document Access Tracking View
CREATE VIEW vw_DocumentAccessTracking AS
SELECT 
    md.documentID,
    md.clientID,
    md.originalFileName,
    md.documentCategory,
    md.fileSize,
    md.uploadDate,
    md.lastAccessed,
    md.accessCount,
    md.confidentialityLevel,
    md.uploadedBy,
    md.approvedBy,
    md.retentionDate,
    
    -- Access patterns
    CASE 
        WHEN md.accessCount = 0 THEN 'Never Accessed'
        WHEN md.lastAccessed IS NULL THEN 'No Recent Access'
        WHEN md.lastAccessed > DATEADD(day, -7, GETDATE()) THEN 'Recent Access'
        WHEN md.lastAccessed > DATEADD(day, -30, GETDATE()) THEN 'Monthly Access'
        WHEN md.lastAccessed > DATEADD(day, -90, GETDATE()) THEN 'Quarterly Access'
        ELSE 'Rare Access'
    END AS accessPattern,
    
    -- Security alerts
    CASE 
        WHEN md.confidentialityLevel = 'High' AND md.accessCount > 10 THEN 'High Security - Frequent Access'
        WHEN md.confidentialityLevel = 'High' AND md.approvedBy IS NULL THEN 'High Security - Unapproved'
        WHEN md.confidentialityLevel = 'Medium' AND md.accessCount > 50 THEN 'Medium Security - Very Frequent Access'
        ELSE 'Normal'
    END AS securityAlert,
    
    -- Retention alerts
    CASE 
        WHEN md.retentionDate <= GETDATE() THEN 'Expired - Action Required'
        WHEN md.retentionDate <= DATEADD(day, 30, GETDATE()) THEN 'Expires Within 30 Days'
        WHEN md.retentionDate <= DATEADD(day, 90, GETDATE()) THEN 'Expires Within 90 Days'
        ELSE 'Active'
    END AS retentionAlert,
    
    -- Efficiency metrics
    CASE 
        WHEN md.fileSize > 10485760 AND md.accessCount = 0 THEN 'Large Unused File'
        WHEN DATEDIFF(day, md.uploadDate, GETDATE()) > 365 AND md.accessCount = 0 THEN 'Old Unused File'
        WHEN md.accessCount > 0 AND md.lastAccessed < DATEADD(day, -180, GETDATE()) THEN 'Stale File'
        ELSE 'Efficient'
    END AS efficiencyStatus,
    
    -- Risk scoring
    (CASE WHEN md.confidentialityLevel = 'High' THEN 3 ELSE 1 END +
     CASE WHEN md.approvedBy IS NULL THEN 2 ELSE 0 END +
     CASE WHEN md.retentionDate <= GETDATE() THEN 3 ELSE 0 END +
     CASE WHEN md.accessCount > 20 THEN 1 ELSE 0 END) AS riskScore
FROM dbo.MiscDocuments md
WHERE md.isArchived = 0;

-- =============================================
-- Stored Procedures
-- =============================================

-- Get Complete Miscellaneous Documents Profile
CREATE PROCEDURE sp_GetMiscDocumentsProfile
    @clientID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Main documents data
    SELECT * FROM vw_MiscDocumentsSummary
    WHERE clientID = @clientID
    ORDER BY uploadDate DESC;
    
    -- Summary statistics
    SELECT 
        COUNT(*) as totalDocuments,
        SUM(fileSize) as totalFileSize,
        COUNT(DISTINCT documentCategory) as categories,
        SUM(CASE WHEN isArchived = 0 THEN 1 ELSE 0 END) as activeDocuments,
        SUM(CASE WHEN isArchived = 1 THEN 1 ELSE 0 END) as archivedDocuments,
        SUM(CASE WHEN approvedBy IS NULL THEN 1 ELSE 0 END) as pendingApprovals,
        SUM(CASE WHEN retentionDate <= GETDATE() THEN 1 ELSE 0 END) as expiredDocuments,
        SUM(accessCount) as totalAccesses,
        AVG(CAST(fileSize AS FLOAT)) as avgFileSize,
        MAX(uploadDate) as lastUpload
    FROM dbo.MiscDocuments
    WHERE clientID = @clientID;
    
    -- Category breakdown
    SELECT * FROM vw_DocumentRetentionAnalysis
    WHERE clientID = @clientID
    ORDER BY documentCount DESC;
    
    -- Access tracking alerts
    SELECT * FROM vw_DocumentAccessTracking
    WHERE clientID = @clientID 
    AND (securityAlert != 'Normal' OR retentionAlert != 'Active' OR efficiencyStatus != 'Efficient')
    ORDER BY riskScore DESC;
END;

-- Update Document Status
CREATE PROCEDURE sp_UpdateDocumentStatus
    @documentID INT,
    @isArchived BIT = NULL,
    @approvedBy NVARCHAR(100) = NULL,
    @confidentialityLevel NVARCHAR(50) = NULL,
    @updatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.MiscDocuments
    SET isArchived = ISNULL(@isArchived, isArchived),
        approvedBy = ISNULL(@approvedBy, approvedBy),
        approvalDate = CASE WHEN @approvedBy IS NOT NULL THEN GETDATE() ELSE approvalDate END,
        confidentialityLevel = ISNULL(@confidentialityLevel, confidentialityLevel),
        updatedBy = @updatedBy,
        updatedAt = GETDATE()
    WHERE documentID = @documentID;
    
    -- Return updated record
    SELECT * FROM vw_MiscDocumentsSummary
    WHERE documentID = @documentID;
END;

-- Generate Document Report
CREATE PROCEDURE sp_GenerateDocumentReport
    @clientID NVARCHAR(50),
    @reportType NVARCHAR(50) = 'FULL',  -- FULL, SUMMARY, RETENTION, ACCESS, SECURITY
    @categoryFilter NVARCHAR(100) = NULL,
    @confidentialityFilter NVARCHAR(50) = NULL,
    @dateFromFilter DATE = NULL,
    @dateToFilter DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @reportType = 'SUMMARY'
    BEGIN
        SELECT 
            clientID,
            COUNT(*) as totalDocuments,
            SUM(fileSize) as totalFileSize,
            COUNT(DISTINCT documentCategory) as categories,
            SUM(CASE WHEN approvedBy IS NULL THEN 1 ELSE 0 END) as pendingApprovals,
            SUM(CASE WHEN retentionDate <= GETDATE() THEN 1 ELSE 0 END) as expiredDocuments,
            SUM(CASE WHEN isArchived = 1 THEN 1 ELSE 0 END) as archivedDocuments,
            MAX(uploadDate) as lastUpload
        FROM dbo.MiscDocuments
        WHERE clientID = @clientID
        GROUP BY clientID;
    END
    ELSE IF @reportType = 'RETENTION'
    BEGIN
        SELECT * FROM vw_MiscDocumentsSummary
        WHERE clientID = @clientID 
        AND (retentionDate <= DATEADD(day, 90, GETDATE()) OR retentionDate IS NULL)
        ORDER BY retentionDate ASC;
    END
    ELSE IF @reportType = 'ACCESS'
    BEGIN
        SELECT * FROM vw_DocumentAccessTracking
        WHERE clientID = @clientID
        ORDER BY accessCount DESC, lastAccessed DESC;
    END
    ELSE IF @reportType = 'SECURITY'
    BEGIN
        SELECT * FROM vw_DocumentAccessTracking
        WHERE clientID = @clientID 
        AND (confidentialityLevel = 'High' OR securityAlert != 'Normal')
        ORDER BY riskScore DESC;
    END
    ELSE -- FULL REPORT
    BEGIN
        SELECT * FROM vw_MiscDocumentsSummary
        WHERE clientID = @clientID
        AND (@categoryFilter IS NULL OR documentCategory = @categoryFilter)
        AND (@confidentialityFilter IS NULL OR confidentialityLevel = @confidentialityFilter)
        AND (@dateFromFilter IS NULL OR uploadDate >= @dateFromFilter)
        AND (@dateToFilter IS NULL OR uploadDate <= @dateToFilter)
        ORDER BY uploadDate DESC;
    END
END;

-- Check Retention Alerts
CREATE PROCEDURE sp_CheckRetentionAlerts
    @alertDays INT = 30,
    @clientID NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        documentID,
        clientID,
        originalFileName,
        documentCategory,
        retentionDate,
        DATEDIFF(day, GETDATE(), retentionDate) as daysUntilExpiration,
        confidentialityLevel,
        uploadedBy,
        CASE 
            WHEN retentionDate <= GETDATE() THEN 'EXPIRED - Immediate Action Required'
            WHEN retentionDate <= DATEADD(day, 7, GETDATE()) THEN 'CRITICAL - Expires Within 7 Days'
            WHEN retentionDate <= DATEADD(day, 30, GETDATE()) THEN 'WARNING - Expires Within 30 Days'
            ELSE 'NOTICE - Expires Within 90 Days'
        END as alertLevel
    FROM dbo.MiscDocuments
    WHERE isArchived = 0
    AND retentionDate IS NOT NULL
    AND retentionDate <= DATEADD(day, @alertDays, GETDATE())
    AND (@clientID IS NULL OR clientID = @clientID)
    ORDER BY retentionDate ASC;
END;

-- =============================================
-- Sample Data for Testing
-- =============================================

-- Insert sample miscellaneous documents
INSERT INTO dbo.MiscDocuments (
    clientID, fileName, originalFileName, fileSize, mimeType, filePath,
    documentCategory, documentDescription, uploadDate, lastAccessed, accessCount,
    isArchived, retentionDate, confidentialityLevel, uploadedBy, approvedBy,
    approvalDate, version, checksum, tags, relatedDocuments, createdBy, updatedBy
) VALUES 
(
    'CLIENT-001',
    '20250715-medical-records.pdf',
    'medical-records.pdf',
    2456789,
    'application/pdf',
    '/uploads/misc-documents/20250715-medical-records.pdf',
    'medical',
    'Latest medical examination results and treatment history',
    '2025-07-15',
    '2025-07-16',
    3,
    0,
    '2027-07-15',
    'High',
    'john.doe@example.com',
    'jane.smith@example.com',
    '2025-07-15',
    1,
    'abc123def456',
    '["medical", "current", "treatment"]',
    '[]',
    'john.doe@example.com',
    'john.doe@example.com'
),
(
    'CLIENT-001',
    '20250714-benefits-letter.pdf',
    'SSI_Approval_Letter.pdf',
    1234567,
    'application/pdf',
    '/uploads/misc-documents/20250714-benefits-letter.pdf',
    'benefits',
    'SSI benefits approval letter with monthly amount details',
    '2025-07-14',
    '2025-07-15',
    5,
    0,
    '2030-07-14',
    'Medium',
    'jane.smith@example.com',
    'admin@example.com',
    '2025-07-14',
    1,
    'def456ghi789',
    '["benefits", "ssi", "approved"]',
    '[]',
    'jane.smith@example.com',
    'jane.smith@example.com'
),
(
    'CLIENT-001',
    '20250713-housing-application.pdf',
    'Housing_Application_Form.pdf',
    987654,
    'application/pdf',
    '/uploads/misc-documents/20250713-housing-application.pdf',
    'housing',
    'Completed housing assistance application form',
    '2025-07-13',
    '2025-07-14',
    2,
    0,
    '2026-07-13',
    'Medium',
    'mike.rodriguez@example.com',
    'jane.smith@example.com',
    '2025-07-13',
    2,
    'ghi789jkl012',
    '["housing", "application", "pending"]',
    '[1]',
    'mike.rodriguez@example.com',
    'mike.rodriguez@example.com'
),
(
    'CLIENT-002',
    '20250712-employment-records.pdf',
    'Employment_History.pdf',
    1567890,
    'application/pdf',
    '/uploads/misc-documents/20250712-employment-records.pdf',
    'employment',
    'Complete employment history and references',
    '2025-07-12',
    NULL,
    0,
    0,
    '2026-07-12',
    'Low',
    'lisa.chen@example.com',
    NULL,
    NULL,
    1,
    'jkl012mno345',
    '["employment", "history", "references"]',
    '[]',
    'lisa.chen@example.com',
    'lisa.chen@example.com'
),
(
    'CLIENT-002',
    '20250711-legal-documents.pdf',
    'Power_of_Attorney.pdf',
    2345678,
    'application/pdf',
    '/uploads/misc-documents/20250711-legal-documents.pdf',
    'legal',
    'Power of attorney documentation for healthcare decisions',
    '2025-07-11',
    '2025-07-12',
    1,
    0,
    '2032-07-11',
    'High',
    'sarah.johnson@example.com',
    'legal@example.com',
    '2025-07-11',
    1,
    'mno345pqr678',
    '["legal", "poa", "healthcare"]',
    '[]',
    'sarah.johnson@example.com',
    'sarah.johnson@example.com'
);

-- =============================================
-- Verify Installation
-- =============================================

-- Check table creation
SELECT 'MiscDocuments table created successfully' AS Status
WHERE EXISTS (SELECT * FROM sys.tables WHERE name = 'MiscDocuments');

-- Check view creation
SELECT 'Views created successfully' AS Status
WHERE EXISTS (SELECT * FROM sys.views WHERE name = 'vw_MiscDocumentsSummary');

-- Check stored procedure creation
SELECT 'Stored procedures created successfully' AS Status
WHERE EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetMiscDocumentsProfile');

-- Check sample data
SELECT 'Sample data inserted - ' + CAST(COUNT(*) AS NVARCHAR(10)) + ' records' AS Status
FROM dbo.MiscDocuments;

-- Display sample summary data
SELECT TOP 5
    clientID,
    originalFileName,
    documentCategory,
    fileSize,
    documentStatus,
    confidentialityLevel,
    uploadedBy
FROM vw_MiscDocumentsSummary
ORDER BY uploadDate DESC;

-- Display retention analysis
SELECT 
    documentCategory,
    documentCount,
    totalFileSize,
    expiredDocuments,
    expiringSoon,
    pendingApprovals
FROM vw_DocumentRetentionAnalysis
ORDER BY documentCount DESC;

-- Display access tracking alerts
SELECT 
    originalFileName,
    documentCategory,
    accessPattern,
    retentionAlert,
    riskScore
FROM vw_DocumentAccessTracking
WHERE riskScore > 1
ORDER BY riskScore DESC;

PRINT 'Miscellaneous Documents database schema installation completed successfully!';
PRINT 'Tables: MiscDocuments';
PRINT 'Views: vw_MiscDocumentsSummary, vw_DocumentRetentionAnalysis, vw_DocumentAccessTracking';
PRINT 'Procedures: sp_GetMiscDocumentsProfile, sp_UpdateDocumentStatus, sp_GenerateDocumentReport, sp_CheckRetentionAlerts';