-- =============================================
-- Progress Notes Database Schema
-- Complete SQL setup for Progress Notes system
-- =============================================

-- Drop existing objects if they exist (for clean re-creation)
IF OBJECT_ID('dbo.sp_GetProgressNoteProfile', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetProgressNoteProfile;

IF OBJECT_ID('dbo.sp_BulkArchiveNotes', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_BulkArchiveNotes;

IF OBJECT_ID('dbo.sp_GenerateNoteReport', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GenerateNoteReport;

IF OBJECT_ID('dbo.vw_ProgressNotesSummary', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ProgressNotesSummary;

IF OBJECT_ID('dbo.vw_NotesByPriority', 'V') IS NOT NULL
    DROP VIEW dbo.vw_NotesByPriority;

IF OBJECT_ID('dbo.vw_SiteNoteActivity', 'V') IS NOT NULL
    DROP VIEW dbo.vw_SiteNoteActivity;

IF OBJECT_ID('dbo.vw_FollowUpRequired', 'V') IS NOT NULL
    DROP VIEW dbo.vw_FollowUpRequired;

IF OBJECT_ID('dbo.ProgressNotes', 'U') IS NOT NULL
    DROP TABLE dbo.ProgressNotes;

-- =============================================
-- Create ProgressNotes Table
-- =============================================
CREATE TABLE dbo.ProgressNotes (
    -- Primary Key
    noteID INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Client Reference
    clientID NVARCHAR(100) NOT NULL,
    
    -- Core Note Data
    nurseNoteDate DATE NOT NULL,
    nurseNoteSite NVARCHAR(100) NOT NULL,
    nurseNote NVARCHAR(MAX) NOT NULL,
    
    -- Classification & Priority
    noteCategory NVARCHAR(50) DEFAULT 'General',
    notePriority NVARCHAR(20) DEFAULT 'Medium',
    
    -- Follow-up Management
    requiresFollowUp BIT DEFAULT 0,
    followUpDate DATE NULL,
    noteStatus NVARCHAR(20) DEFAULT 'Active',
    
    -- Audit Trail
    createdBy NVARCHAR(255) NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedBy NVARCHAR(255) NULL,
    updatedAt DATETIME2 NULL,
    lastViewedBy NVARCHAR(255) NULL,
    lastViewedAt DATETIME2 NULL,
    
    -- Constraints
    CONSTRAINT CK_ProgressNotes_Priority 
        CHECK (notePriority IN ('Low', 'Medium', 'High', 'Urgent')),
    CONSTRAINT CK_ProgressNotes_Status 
        CHECK (noteStatus IN ('Active', 'Resolved', 'Archived', 'Deleted')),
    CONSTRAINT CK_ProgressNotes_Category 
        CHECK (noteCategory IN ('General', 'Assessment', 'Care Plan', 'Medication', 
                               'Discharge Planning', 'Family Communication', 'Incident Report')),
    CONSTRAINT CK_ProgressNotes_Date 
        CHECK (nurseNoteDate <= GETDATE()),
    CONSTRAINT CK_ProgressNotes_FollowUp
        CHECK ((requiresFollowUp = 0) OR (requiresFollowUp = 1 AND followUpDate IS NOT NULL))
);

-- =============================================
-- Create Indexes for Performance
-- =============================================

-- Primary index on clientID for fast client lookups
CREATE NONCLUSTERED INDEX IX_ProgressNotes_ClientID 
ON dbo.ProgressNotes (clientID, nurseNoteDate DESC)
INCLUDE (noteStatus, notePriority, requiresFollowUp);

-- Index for date-based queries
CREATE NONCLUSTERED INDEX IX_ProgressNotes_Date 
ON dbo.ProgressNotes (nurseNoteDate DESC, createdAt DESC)
INCLUDE (clientID, nurseNoteSite, noteCategory);

-- Index for site-based queries
CREATE NONCLUSTERED INDEX IX_ProgressNotes_Site 
ON dbo.ProgressNotes (nurseNoteSite, nurseNoteDate DESC)
INCLUDE (clientID, noteCategory, notePriority);

-- Index for follow-up management
CREATE NONCLUSTERED INDEX IX_ProgressNotes_FollowUp 
ON dbo.ProgressNotes (requiresFollowUp, followUpDate)
WHERE requiresFollowUp = 1 AND noteStatus = 'Active';

-- Index for priority and status filtering
CREATE NONCLUSTERED INDEX IX_ProgressNotes_Priority_Status 
ON dbo.ProgressNotes (notePriority, noteStatus, createdAt DESC)
INCLUDE (clientID, nurseNoteSite);

-- =============================================
-- Sample Data for Testing
-- =============================================
INSERT INTO dbo.ProgressNotes (
    clientID, nurseNoteDate, nurseNoteSite, nurseNote, 
    noteCategory, notePriority, requiresFollowUp, followUpDate,
    createdBy
) VALUES 
-- Sample notes for CLIENT-123
('CLIENT-123', '2025-07-16', 'Main Campus', 
 'Client arrived on time for scheduled appointment. Vital signs within normal limits: BP 120/80, HR 72, Temp 98.6°F. Client reports feeling well today. Discussed medication compliance - client taking all medications as prescribed. No side effects reported. Appetite good, sleep pattern normal. Client expressed gratitude for care received.', 
 'Assessment', 'Medium', 1, '2025-07-23', 'nurse@hospital.com'),

('CLIENT-123', '2025-07-15', 'Outpatient Center', 
 'Follow-up visit for wound care management. Wound healing progressing well - no signs of infection. Dressing changed using sterile technique. Client education provided on proper home care techniques. Client demonstrates understanding of wound care instructions. Next appointment scheduled for wound check.', 
 'Care Plan', 'Low', 0, NULL, 'nurse2@hospital.com'),

('CLIENT-123', '2025-07-14', 'Main Campus', 
 'Medication review and adjustment. Client reported mild dizziness with current blood pressure medication. Consulted with physician - dosage reduced by 50%. Client educated on new dosing schedule. Blood pressure monitoring to be increased for next two weeks. Follow-up appointment arranged.', 
 'Medication', 'High', 1, '2025-07-21', 'pharmacist@hospital.com'),

-- Sample notes for CLIENT-456
('CLIENT-456', '2025-07-16', 'Satellite Clinic', 
 'Initial assessment for new client. Comprehensive health history obtained. Client presents with chronic back pain, seeking pain management options. Physical assessment completed. Discussed treatment options including physical therapy and medication management. Referrals initiated.', 
 'Assessment', 'Medium', 1, '2025-07-30', 'nurse3@hospital.com'),

('CLIENT-456', '2025-07-10', 'Main Campus', 
 'Incident report: Client experienced fall in waiting area. No injuries sustained. Vital signs stable. Client alert and oriented x3. Fall risk assessment completed - score indicates moderate risk. Safety education provided. Family notified. Incident documented per protocol.', 
 'Incident Report', 'Urgent', 1, '2025-07-17', 'supervisor@hospital.com');

-- =============================================
-- Create Views for Reporting and Analytics
-- =============================================

-- View: Complete progress notes summary
CREATE VIEW dbo.vw_ProgressNotesSummary AS
SELECT 
    p.noteID,
    p.clientID,
    p.nurseNoteDate,
    p.nurseNoteSite,
    LEFT(p.nurseNote, 100) + CASE WHEN LEN(p.nurseNote) > 100 THEN '...' ELSE '' END as notePreview,
    p.noteCategory,
    p.notePriority,
    p.requiresFollowUp,
    p.followUpDate,
    p.noteStatus,
    p.createdBy,
    p.createdAt,
    p.updatedBy,
    p.updatedAt,
    -- Calculate days since note creation
    DATEDIFF(day, p.createdAt, GETDATE()) as daysOld,
    -- Follow-up status calculation
    CASE 
        WHEN p.requiresFollowUp = 0 THEN 'No Follow-up Required'
        WHEN p.followUpDate IS NULL THEN 'Follow-up Date Missing'
        WHEN p.followUpDate < CAST(GETDATE() AS DATE) THEN 'Overdue'
        WHEN p.followUpDate = CAST(GETDATE() AS DATE) THEN 'Due Today'
        WHEN p.followUpDate <= DATEADD(day, 7, GETDATE()) THEN 'Due Soon'
        ELSE 'Scheduled'
    END as followUpStatus,
    -- Risk assessment based on priority and age
    CASE 
        WHEN p.notePriority = 'Urgent' THEN 5
        WHEN p.notePriority = 'High' THEN 4
        WHEN p.notePriority = 'Medium' THEN 3
        WHEN p.notePriority = 'Low' THEN 2
        ELSE 1
    END + 
    CASE 
        WHEN DATEDIFF(day, p.createdAt, GETDATE()) > 30 THEN 2
        WHEN DATEDIFF(day, p.createdAt, GETDATE()) > 14 THEN 1
        ELSE 0
    END as riskScore
FROM dbo.ProgressNotes p
WHERE p.noteStatus != 'Deleted';

-- View: Notes grouped by priority for analysis
CREATE VIEW dbo.vw_NotesByPriority AS
SELECT 
    notePriority,
    COUNT(*) as totalNotes,
    COUNT(CASE WHEN noteStatus = 'Active' THEN 1 END) as activeNotes,
    COUNT(CASE WHEN requiresFollowUp = 1 THEN 1 END) as followUpRequired,
    COUNT(CASE WHEN createdAt >= DATEADD(day, -30, GETDATE()) THEN 1 END) as recentNotes,
    AVG(CASE 
        WHEN notePriority = 'Urgent' THEN 5
        WHEN notePriority = 'High' THEN 4
        WHEN notePriority = 'Medium' THEN 3
        WHEN notePriority = 'Low' THEN 2
        ELSE 1
    END) as avgPriorityScore,
    MIN(createdAt) as earliestNote,
    MAX(createdAt) as latestNote
FROM dbo.ProgressNotes
WHERE noteStatus != 'Deleted'
GROUP BY notePriority;

-- View: Site activity analysis
CREATE VIEW dbo.vw_SiteNoteActivity AS
SELECT 
    nurseNoteSite,
    COUNT(*) as totalNotes,
    COUNT(DISTINCT clientID) as uniqueClients,
    COUNT(CASE WHEN createdAt >= DATEADD(day, -7, GETDATE()) THEN 1 END) as notesThisWeek,
    COUNT(CASE WHEN createdAt >= DATEADD(day, -30, GETDATE()) THEN 1 END) as notesThisMonth,
    COUNT(CASE WHEN notePriority IN ('High', 'Urgent') THEN 1 END) as highPriorityNotes,
    COUNT(CASE WHEN requiresFollowUp = 1 THEN 1 END) as followUpNotes,
    AVG(LEN(nurseNote)) as avgNoteLength,
    COUNT(DISTINCT createdBy) as uniqueStaff,
    MAX(createdAt) as lastActivity
FROM dbo.ProgressNotes
WHERE noteStatus != 'Deleted'
GROUP BY nurseNoteSite;

-- View: Follow-up tracking
CREATE VIEW dbo.vw_FollowUpRequired AS
SELECT 
    p.noteID,
    p.clientID,
    p.nurseNoteDate,
    p.nurseNoteSite,
    p.noteCategory,
    p.notePriority,
    p.followUpDate,
    p.createdBy,
    p.createdAt,
    -- Days until follow-up (negative = overdue)
    DATEDIFF(day, GETDATE(), p.followUpDate) as daysUntilFollowUp,
    -- Follow-up urgency
    CASE 
        WHEN p.followUpDate < CAST(GETDATE() AS DATE) THEN 'Overdue'
        WHEN p.followUpDate = CAST(GETDATE() AS DATE) THEN 'Due Today'
        WHEN p.followUpDate <= DATEADD(day, 3, GETDATE()) THEN 'Due Soon'
        WHEN p.followUpDate <= DATEADD(day, 7, GETDATE()) THEN 'This Week'
        ELSE 'Future'
    END as urgencyLevel,
    -- Combined priority score
    CASE 
        WHEN p.followUpDate < CAST(GETDATE() AS DATE) THEN 10 -- Overdue
        WHEN p.followUpDate = CAST(GETDATE() AS DATE) THEN 9  -- Due today
        WHEN p.followUpDate <= DATEADD(day, 3, GETDATE()) THEN 8 -- Due soon
        ELSE 5
    END + 
    CASE 
        WHEN p.notePriority = 'Urgent' THEN 4
        WHEN p.notePriority = 'High' THEN 3
        WHEN p.notePriority = 'Medium' THEN 2
        ELSE 1
    END as combinedPriorityScore
FROM dbo.ProgressNotes p
WHERE p.requiresFollowUp = 1 
  AND p.noteStatus = 'Active'
  AND p.followUpDate IS NOT NULL;

-- =============================================
-- Stored Procedures
-- =============================================

-- Procedure: Get complete client progress profile
CREATE PROCEDURE dbo.sp_GetProgressNoteProfile
    @ClientID NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Client summary statistics
    SELECT 
        @ClientID as clientID,
        COUNT(*) as totalNotes,
        COUNT(CASE WHEN noteStatus = 'Active' THEN 1 END) as activeNotes,
        COUNT(CASE WHEN requiresFollowUp = 1 THEN 1 END) as followUpRequired,
        COUNT(CASE WHEN createdAt >= DATEADD(day, -30, GETDATE()) THEN 1 END) as recentActivity,
        MIN(nurseNoteDate) as firstNoteDate,
        MAX(nurseNoteDate) as lastNoteDate,
        COUNT(DISTINCT nurseNoteSite) as sitesVisited,
        COUNT(DISTINCT createdBy) as staffInvolved
    FROM dbo.ProgressNotes 
    WHERE clientID = @ClientID AND noteStatus != 'Deleted';
    
    -- Recent notes (last 10)
    SELECT TOP 10
        noteID,
        nurseNoteDate,
        nurseNoteSite,
        LEFT(nurseNote, 200) + CASE WHEN LEN(nurseNote) > 200 THEN '...' ELSE '' END as notePreview,
        noteCategory,
        notePriority,
        requiresFollowUp,
        followUpDate,
        createdBy,
        createdAt
    FROM dbo.ProgressNotes 
    WHERE clientID = @ClientID AND noteStatus != 'Deleted'
    ORDER BY createdAt DESC;
    
    -- Follow-up items
    SELECT 
        noteID,
        nurseNoteDate,
        nurseNoteSite,
        noteCategory,
        notePriority,
        followUpDate,
        DATEDIFF(day, GETDATE(), followUpDate) as daysUntilFollowUp,
        createdBy
    FROM dbo.ProgressNotes 
    WHERE clientID = @ClientID 
      AND requiresFollowUp = 1 
      AND noteStatus = 'Active'
    ORDER BY followUpDate ASC;
END;

-- Procedure: Bulk archive old notes
CREATE PROCEDURE dbo.sp_BulkArchiveNotes
    @OlderThanDays INT = 365,
    @DryRun BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CutoffDate DATE = DATEADD(day, -@OlderThanDays, GETDATE());
    DECLARE @NotesToArchive INT;
    
    -- Count notes to be archived
    SELECT @NotesToArchive = COUNT(*)
    FROM dbo.ProgressNotes 
    WHERE createdAt < @CutoffDate 
      AND noteStatus = 'Active'
      AND requiresFollowUp = 0;
    
    IF @DryRun = 1
    BEGIN
        -- Dry run - just show what would be archived
        SELECT 
            @NotesToArchive as notesToArchive,
            @CutoffDate as cutoffDate,
            'DRY RUN - No changes made' as status;
            
        SELECT TOP 100
            noteID,
            clientID,
            nurseNoteDate,
            nurseNoteSite,
            noteCategory,
            createdAt,
            DATEDIFF(day, createdAt, GETDATE()) as daysOld
        FROM dbo.ProgressNotes 
        WHERE createdAt < @CutoffDate 
          AND noteStatus = 'Active'
          AND requiresFollowUp = 0
        ORDER BY createdAt;
    END
    ELSE
    BEGIN
        -- Actual archive operation
        UPDATE dbo.ProgressNotes 
        SET noteStatus = 'Archived',
            updatedBy = 'SYSTEM_ARCHIVE',
            updatedAt = GETDATE()
        WHERE createdAt < @CutoffDate 
          AND noteStatus = 'Active'
          AND requiresFollowUp = 0;
        
        SELECT 
            @@ROWCOUNT as notesArchived,
            @CutoffDate as cutoffDate,
            'Archive completed successfully' as status;
    END
END;

-- Procedure: Generate comprehensive note report
CREATE PROCEDURE dbo.sp_GenerateNoteReport
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @SiteFilter NVARCHAR(100) = NULL,
    @ClientFilter NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Set default dates if not provided
    IF @StartDate IS NULL SET @StartDate = DATEADD(month, -1, GETDATE());
    IF @EndDate IS NULL SET @EndDate = GETDATE();
    
    -- Report header
    SELECT 
        @StartDate as reportStartDate,
        @EndDate as reportEndDate,
        @SiteFilter as siteFilter,
        @ClientFilter as clientFilter,
        GETDATE() as reportGeneratedAt;
    
    -- Summary statistics
    SELECT 
        COUNT(*) as totalNotes,
        COUNT(DISTINCT clientID) as uniqueClients,
        COUNT(DISTINCT nurseNoteSite) as sitesInvolved,
        COUNT(DISTINCT createdBy) as staffMembers,
        COUNT(CASE WHEN notePriority = 'Urgent' THEN 1 END) as urgentNotes,
        COUNT(CASE WHEN notePriority = 'High' THEN 1 END) as highPriorityNotes,
        COUNT(CASE WHEN requiresFollowUp = 1 THEN 1 END) as followUpRequired,
        AVG(LEN(nurseNote)) as avgNoteLength
    FROM dbo.ProgressNotes 
    WHERE nurseNoteDate BETWEEN @StartDate AND @EndDate
      AND noteStatus != 'Deleted'
      AND (@SiteFilter IS NULL OR nurseNoteSite = @SiteFilter)
      AND (@ClientFilter IS NULL OR clientID = @ClientFilter);
    
    -- Notes by category
    SELECT 
        noteCategory,
        COUNT(*) as noteCount,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
    FROM dbo.ProgressNotes 
    WHERE nurseNoteDate BETWEEN @StartDate AND @EndDate
      AND noteStatus != 'Deleted'
      AND (@SiteFilter IS NULL OR nurseNoteSite = @SiteFilter)
      AND (@ClientFilter IS NULL OR clientID = @ClientFilter)
    GROUP BY noteCategory
    ORDER BY noteCount DESC;
    
    -- Notes by site
    SELECT 
        nurseNoteSite,
        COUNT(*) as noteCount,
        COUNT(DISTINCT clientID) as uniqueClients,
        COUNT(CASE WHEN requiresFollowUp = 1 THEN 1 END) as followUpNotes
    FROM dbo.ProgressNotes 
    WHERE nurseNoteDate BETWEEN @StartDate AND @EndDate
      AND noteStatus != 'Deleted'
      AND (@SiteFilter IS NULL OR nurseNoteSite = @SiteFilter)
      AND (@ClientFilter IS NULL OR clientID = @ClientFilter)
    GROUP BY nurseNoteSite
    ORDER BY noteCount DESC;
    
    -- Staff productivity
    SELECT 
        createdBy,
        COUNT(*) as notesCreated,
        COUNT(DISTINCT clientID) as clientsServed,
        AVG(LEN(nurseNote)) as avgNoteLength,
        MIN(createdAt) as firstNoteDate,
        MAX(createdAt) as lastNoteDate
    FROM dbo.ProgressNotes 
    WHERE nurseNoteDate BETWEEN @StartDate AND @EndDate
      AND noteStatus != 'Deleted'
      AND (@SiteFilter IS NULL OR nurseNoteSite = @SiteFilter)
      AND (@ClientFilter IS NULL OR clientID = @ClientFilter)
    GROUP BY createdBy
    ORDER BY notesCreated DESC;
END;

-- =============================================
-- Grant Permissions (adjust as needed for your security model)
-- =============================================

-- Grant execute permissions on stored procedures
-- GRANT EXECUTE ON dbo.sp_GetProgressNoteProfile TO [YourAppRole];
-- GRANT EXECUTE ON dbo.sp_BulkArchiveNotes TO [YourAdminRole];
-- GRANT EXECUTE ON dbo.sp_GenerateNoteReport TO [YourReportRole];

-- Grant select permissions on views
-- GRANT SELECT ON dbo.vw_ProgressNotesSummary TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_NotesByPriority TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_SiteNoteActivity TO [YourManagerRole];
-- GRANT SELECT ON dbo.vw_FollowUpRequired TO [YourAppRole];

-- =============================================
-- Test the Installation
-- =============================================

-- Test basic functionality
SELECT 'Progress Notes table created successfully' as status;
SELECT COUNT(*) as sampleRecordsInserted FROM dbo.ProgressNotes;

-- Test views
SELECT 'Summary view test:' as test;
SELECT TOP 5 * FROM dbo.vw_ProgressNotesSummary ORDER BY createdAt DESC;

SELECT 'Priority analysis test:' as test;
SELECT * FROM dbo.vw_NotesByPriority;

SELECT 'Site activity test:' as test;
SELECT * FROM dbo.vw_SiteNoteActivity;

SELECT 'Follow-up tracking test:' as test;
SELECT * FROM dbo.vw_FollowUpRequired;

-- Test stored procedures
EXEC dbo.sp_GetProgressNoteProfile @ClientID = 'CLIENT-123';
EXEC dbo.sp_BulkArchiveNotes @OlderThanDays = 365, @DryRun = 1;
EXEC dbo.sp_GenerateNoteReport;

PRINT 'Progress Notes database setup completed successfully!';
PRINT 'Ready for integration with the Progress Notes application.';