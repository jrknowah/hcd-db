-- ========================================
-- Section 6 Case Management Database Schema
-- ========================================

-- Drop existing objects if they exist (for updates)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_Section6Dashboard')
    DROP VIEW vw_Section6Dashboard;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_CaseTimeline')
    DROP VIEW vw_CaseTimeline;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_CaseMetrics')
    DROP VIEW vw_CaseMetrics;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_CaseManagerWorkload')
    DROP VIEW vw_CaseManagerWorkload;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_GetCaseDashboard' AND type = 'P')
    DROP PROCEDURE sp_GetCaseDashboard;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_UpdateCaseStatus' AND type = 'P')
    DROP PROCEDURE sp_UpdateCaseStatus;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_CalculateMetrics' AND type = 'P')
    DROP PROCEDURE sp_CalculateMetrics;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CaseTimeline')
    DROP TABLE CaseTimeline;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CaseMetrics')
    DROP TABLE CaseMetrics;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Section6FaceSheet')
    DROP TABLE Section6FaceSheet;

-- ========================================
-- CREATE TABLE: Section6FaceSheet
-- ========================================

CREATE TABLE dbo.Section6FaceSheet (
    -- Primary Key
    faceSheetID INT IDENTITY(1,1) PRIMARY KEY,
    clientID NVARCHAR(50) NOT NULL,
    
    -- Case Information
    caseNumber NVARCHAR(50) NULL,
    caseStatus NVARCHAR(50) NOT NULL,
    admissionDate DATE NULL,
    expectedDischargeDate DATE NULL,
    actualDischargeDate DATE NULL,
    
    -- Case Manager Information
    primaryCaseManager NVARCHAR(100) NOT NULL,
    backupCaseManager NVARCHAR(100) NULL,
    caseManagerAssignedDate DATE NULL,
    
    -- Case Milestones (JSON)
    milestonesCompleted NVARCHAR(MAX) NULL,     -- JSON array
    milestonesInProgress NVARCHAR(MAX) NULL,    -- JSON array
    milestonesPending NVARCHAR(MAX) NULL,       -- JSON array
    
    -- Progress Tracking
    completionPercentage DECIMAL(5,2) NULL DEFAULT 0.00,
    riskLevel NVARCHAR(20) NULL,
    priorityLevel NVARCHAR(20) NULL,
    
    -- Quality Metrics
    caseComplexityScore INT NULL,
    lengthOfStay INT NULL,
    targetLOS INT NULL,
    satisfactionScore DECIMAL(3,1) NULL,
    
    -- Documentation Status
    documentationComplete BIT NOT NULL DEFAULT 0,
    missingDocuments NVARCHAR(MAX) NULL,
    lastDocumentUpdate DATETIME2 NULL,
    
    -- Audit Fields
    createdBy NVARCHAR(100) NOT NULL DEFAULT 'System',
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(100) NOT NULL DEFAULT 'System',
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT CHK_Section6_CompletionPercentage CHECK (completionPercentage BETWEEN 0 AND 100),
    CONSTRAINT CHK_Section6_ComplexityScore CHECK (caseComplexityScore BETWEEN 1 AND 10),
    CONSTRAINT CHK_Section6_SatisfactionScore CHECK (satisfactionScore BETWEEN 0.0 AND 5.0),
    CONSTRAINT CHK_Section6_LengthOfStay CHECK (lengthOfStay >= 0),
    CONSTRAINT CHK_Section6_TargetLOS CHECK (targetLOS >= 0),
    CONSTRAINT CHK_Section6_CaseStatus CHECK (caseStatus IN ('Pending', 'Active', 'On Hold', 'Closed', 'Transferred')),
    CONSTRAINT CHK_Section6_RiskLevel CHECK (riskLevel IN ('Low', 'Medium', 'High', 'Critical')),
    CONSTRAINT CHK_Section6_PriorityLevel CHECK (priorityLevel IN ('Low', 'Medium', 'High', 'Urgent'))
);

-- ========================================
-- CREATE TABLE: CaseTimeline
-- ========================================

CREATE TABLE dbo.CaseTimeline (
    -- Primary Key
    timelineID INT IDENTITY(1,1) PRIMARY KEY,
    caseID INT NOT NULL,
    
    -- Event Information
    eventType NVARCHAR(50) NOT NULL,
    eventTitle NVARCHAR(200) NOT NULL,
    eventDescription NVARCHAR(MAX) NULL,
    eventDate DATETIME2 NOT NULL,
    dueDate DATETIME2 NULL,
    
    -- Completion Status
    completed BIT NOT NULL DEFAULT 0,
    completedAt DATETIME2 NULL,
    completedBy NVARCHAR(100) NULL,
    completionNotes NVARCHAR(MAX) NULL,
    
    -- Event Properties
    required BIT NOT NULL DEFAULT 0,
    milestone BIT NOT NULL DEFAULT 0,
    category NVARCHAR(50) NULL,
    assignedTo NVARCHAR(100) NULL,
    
    -- Audit Fields
    createdBy NVARCHAR(100) NOT NULL DEFAULT 'System',
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(100) NOT NULL DEFAULT 'System',
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Foreign Key
    CONSTRAINT FK_CaseTimeline_Section6FaceSheet 
        FOREIGN KEY (caseID) REFERENCES dbo.Section6FaceSheet(faceSheetID) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT CHK_CaseTimeline_EventType CHECK (eventType IN ('Milestone', 'Task', 'Appointment', 'Document', 'Status Change', 'Review')),
    CONSTRAINT CHK_CaseTimeline_Category CHECK (category IN ('Assessment', 'Planning', 'Coordination', 'Documentation', 'Review', 'Discharge'))
);

-- ========================================
-- CREATE TABLE: CaseMetrics
-- ========================================

CREATE TABLE dbo.CaseMetrics (
    -- Primary Key
    metricID INT IDENTITY(1,1) PRIMARY KEY,
    caseID INT NOT NULL,
    
    -- Performance Metrics
    averageResponseTime DECIMAL(5,2) NULL,      -- in hours
    caseEfficiencyScore DECIMAL(3,1) NULL,      -- 1-10 scale
    qualityScore DECIMAL(3,1) NULL,             -- 1-10 scale
    clientSatisfactionScore DECIMAL(3,1) NULL,  -- 1-5 scale
    
    -- Milestone Metrics
    totalMilestones INT NULL DEFAULT 0,
    completedMilestones INT NULL DEFAULT 0,
    overdueMilestones INT NULL DEFAULT 0,
    milestoneCompletionRate DECIMAL(5,2) NULL,
    
    -- Documentation Metrics
    totalDocuments INT NULL DEFAULT 0,
    completeDocuments INT NULL DEFAULT 0,
    documentationCompletionRate DECIMAL(5,2) NULL,
    
    -- Time Metrics
    currentLOS INT NULL,
    targetLOS INT NULL,
    losVariance INT NULL,
    estimatedDischarge DATE NULL,
    
    -- Quality Indicators
    reworkRequired BIT NOT NULL DEFAULT 0,
    escalationCount INT NULL DEFAULT 0,
    complaintCount INT NULL DEFAULT 0,
    commendationCount INT NULL DEFAULT 0,
    
    -- Metric Date Range
    metricStartDate DATE NOT NULL,
    metricEndDate DATE NOT NULL,
    calculatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Audit Fields
    createdBy NVARCHAR(100) NOT NULL DEFAULT 'System',
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Foreign Key
    CONSTRAINT FK_CaseMetrics_Section6FaceSheet 
        FOREIGN KEY (caseID) REFERENCES dbo.Section6FaceSheet(faceSheetID) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT CHK_CaseMetrics_EfficiencyScore CHECK (caseEfficiencyScore BETWEEN 1.0 AND 10.0),
    CONSTRAINT CHK_CaseMetrics_QualityScore CHECK (qualityScore BETWEEN 1.0 AND 10.0),
    CONSTRAINT CHK_CaseMetrics_SatisfactionScore CHECK (clientSatisfactionScore BETWEEN 1.0 AND 5.0),
    CONSTRAINT CHK_CaseMetrics_CompletionRate CHECK (milestoneCompletionRate BETWEEN 0.0 AND 100.0),
    CONSTRAINT CHK_CaseMetrics_DocumentationRate CHECK (documentationCompletionRate BETWEEN 0.0 AND 100.0)
);

-- ========================================
-- CREATE INDEXES
-- ========================================

-- Section6FaceSheet indexes
CREATE NONCLUSTERED INDEX IX_Section6FaceSheet_ClientID 
ON dbo.Section6FaceSheet (clientID);

CREATE NONCLUSTERED INDEX IX_Section6FaceSheet_CaseStatus 
ON dbo.Section6FaceSheet (caseStatus);

CREATE NONCLUSTERED INDEX IX_Section6FaceSheet_CaseManager 
ON dbo.Section6FaceSheet (primaryCaseManager);

CREATE NONCLUSTERED INDEX IX_Section6FaceSheet_AdmissionDate 
ON dbo.Section6FaceSheet (admissionDate);

CREATE NONCLUSTERED INDEX IX_Section6FaceSheet_ExpectedDischarge 
ON dbo.Section6FaceSheet (expectedDischargeDate);

CREATE NONCLUSTERED INDEX IX_Section6FaceSheet_RiskLevel 
ON dbo.Section6FaceSheet (riskLevel);

CREATE NONCLUSTERED INDEX IX_Section6FaceSheet_CreatedAt 
ON dbo.Section6FaceSheet (createdAt DESC);

-- CaseTimeline indexes
CREATE NONCLUSTERED INDEX IX_CaseTimeline_CaseID 
ON dbo.CaseTimeline (caseID);

CREATE NONCLUSTERED INDEX IX_CaseTimeline_EventDate 
ON dbo.CaseTimeline (eventDate);

CREATE NONCLUSTERED INDEX IX_CaseTimeline_Completed 
ON dbo.CaseTimeline (completed);

CREATE NONCLUSTERED INDEX IX_CaseTimeline_EventType 
ON dbo.CaseTimeline (eventType);

CREATE NONCLUSTERED INDEX IX_CaseTimeline_Milestone 
ON dbo.CaseTimeline (milestone);

CREATE NONCLUSTERED INDEX IX_CaseTimeline_Required 
ON dbo.CaseTimeline (required);

-- CaseMetrics indexes
CREATE NONCLUSTERED INDEX IX_CaseMetrics_CaseID 
ON dbo.CaseMetrics (caseID);

CREATE NONCLUSTERED INDEX IX_CaseMetrics_CalculatedAt 
ON dbo.CaseMetrics (calculatedAt DESC);

-- Composite indexes
CREATE NONCLUSTERED INDEX IX_Section6FaceSheet_ClientID_Status 
ON dbo.Section6FaceSheet (clientID, caseStatus);

CREATE NONCLUSTERED INDEX IX_CaseTimeline_CaseID_EventDate 
ON dbo.CaseTimeline (caseID, eventDate DESC);

-- ========================================
-- CREATE VIEWS
-- ========================================

-- Complete Section 6 dashboard overview
CREATE VIEW vw_Section6Dashboard AS
SELECT 
    fs.faceSheetID,
    fs.clientID,
    fs.caseNumber,
    fs.caseStatus,
    fs.admissionDate,
    fs.expectedDischargeDate,
    fs.actualDischargeDate,
    fs.primaryCaseManager,
    fs.backupCaseManager,
    fs.completionPercentage,
    fs.riskLevel,
    fs.priorityLevel,
    fs.caseComplexityScore,
    fs.lengthOfStay,
    fs.targetLOS,
    CASE 
        WHEN fs.lengthOfStay IS NOT NULL AND fs.targetLOS IS NOT NULL 
        THEN fs.lengthOfStay - fs.targetLOS
        ELSE NULL
    END AS losVariance,
    fs.satisfactionScore,
    fs.documentationComplete,
    fs.missingDocuments,
    
    -- Timeline metrics
    COUNT(ct.timelineID) AS totalMilestones,
    SUM(CASE WHEN ct.completed = 1 THEN 1 ELSE 0 END) AS completedMilestones,
    SUM(CASE WHEN ct.completed = 0 AND ct.required = 1 THEN 1 ELSE 0 END) AS pendingRequiredMilestones,
    SUM(CASE WHEN ct.completed = 0 AND ct.dueDate < GETDATE() THEN 1 ELSE 0 END) AS overdueTasks,
    
    -- Calculated fields
    CASE 
        WHEN COUNT(ct.timelineID) > 0 
        THEN (CAST(SUM(CASE WHEN ct.completed = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(ct.timelineID)) * 100
        ELSE 0
    END AS milestoneCompletionRate,
    
    CASE 
        WHEN fs.expectedDischargeDate IS NOT NULL 
        THEN DATEDIFF(DAY, GETDATE(), fs.expectedDischargeDate)
        ELSE NULL
    END AS daysToExpectedDischarge,
    
    DATEDIFF(DAY, fs.admissionDate, GETDATE()) AS currentLOS,
    
    -- Status indicators
    CASE 
        WHEN fs.riskLevel = 'Critical' OR 
             (fs.expectedDischargeDate IS NOT NULL AND fs.expectedDischargeDate < GETDATE()) OR
             (SUM(CASE WHEN ct.completed = 0 AND ct.dueDate < GETDATE() THEN 1 ELSE 0 END) > 0)
        THEN 'Critical'
        WHEN fs.riskLevel = 'High' OR 
             (fs.expectedDischargeDate IS NOT NULL AND DATEDIFF(DAY, GETDATE(), fs.expectedDischargeDate) <= 3)
        THEN 'High'
        WHEN fs.riskLevel = 'Medium'
        THEN 'Medium'
        ELSE 'Low'
    END AS overallRiskLevel,
    
    fs.createdAt,
    fs.updatedAt,
    fs.updatedBy
FROM dbo.Section6FaceSheet fs
LEFT JOIN dbo.CaseTimeline ct ON fs.faceSheetID = ct.caseID
GROUP BY 
    fs.faceSheetID, fs.clientID, fs.caseNumber, fs.caseStatus, fs.admissionDate,
    fs.expectedDischargeDate, fs.actualDischargeDate, fs.primaryCaseManager, fs.backupCaseManager,
    fs.completionPercentage, fs.riskLevel, fs.priorityLevel, fs.caseComplexityScore,
    fs.lengthOfStay, fs.targetLOS, fs.satisfactionScore, fs.documentationComplete,
    fs.missingDocuments, fs.createdAt, fs.updatedAt, fs.updatedBy;

-- Case timeline with status indicators
CREATE VIEW vw_CaseTimeline AS
SELECT 
    ct.*,
    fs.clientID,
    fs.caseNumber,
    fs.caseStatus,
    fs.primaryCaseManager,
    CASE 
        WHEN ct.completed = 1 THEN 'Completed'
        WHEN ct.dueDate IS NULL THEN 'No Due Date'
        WHEN ct.dueDate < GETDATE() THEN 'Overdue'
        WHEN ct.dueDate <= DATEADD(DAY, 3, GETDATE()) THEN 'Due Soon'
        ELSE 'On Track'
    END AS timelineStatus,
    CASE 
        WHEN ct.dueDate IS NOT NULL 
        THEN DATEDIFF(DAY, GETDATE(), ct.dueDate)
        ELSE NULL
    END AS daysToDue,
    CASE 
        WHEN ct.completed = 1 AND ct.completedAt IS NOT NULL AND ct.dueDate IS NOT NULL
        THEN DATEDIFF(DAY, ct.dueDate, ct.completedAt)
        ELSE NULL
    END AS completionVariance
FROM dbo.CaseTimeline ct
INNER JOIN dbo.Section6FaceSheet fs ON ct.caseID = fs.faceSheetID;

-- Case metrics summary
CREATE VIEW vw_CaseMetrics AS
SELECT 
    fs.faceSheetID,
    fs.clientID,
    fs.caseNumber,
    fs.primaryCaseManager,
    fs.caseStatus,
    fs.riskLevel,
    fs.caseComplexityScore,
    fs.satisfactionScore,
    
    -- Current metrics
    DATEDIFF(DAY, fs.admissionDate, GETDATE()) AS currentLOS,
    fs.targetLOS,
    CASE 
        WHEN fs.targetLOS IS NOT NULL 
        THEN DATEDIFF(DAY, fs.admissionDate, GETDATE()) - fs.targetLOS
        ELSE NULL
    END AS losVariance,
    
    -- Timeline metrics
    COUNT(ct.timelineID) AS totalMilestones,
    SUM(CASE WHEN ct.completed = 1 THEN 1 ELSE 0 END) AS completedMilestones,
    SUM(CASE WHEN ct.completed = 0 AND ct.required = 1 THEN 1 ELSE 0 END) AS pendingRequired,
    SUM(CASE WHEN ct.completed = 0 AND ct.dueDate < GETDATE() THEN 1 ELSE 0 END) AS overdue,
    
    -- Performance indicators
    CASE 
        WHEN COUNT(ct.timelineID) > 0 
        THEN (CAST(SUM(CASE WHEN ct.completed = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(ct.timelineID)) * 100
        ELSE 0
    END AS completionRate,
    
    AVG(CASE 
        WHEN ct.completed = 1 AND ct.completedAt IS NOT NULL AND ct.dueDate IS NOT NULL
        THEN DATEDIFF(DAY, ct.dueDate, ct.completedAt)
        ELSE NULL
    END) AS avgCompletionVariance,
    
    fs.createdAt,
    fs.updatedAt
FROM dbo.Section6FaceSheet fs
LEFT JOIN dbo.CaseTimeline ct ON fs.faceSheetID = ct.caseID
GROUP BY 
    fs.faceSheetID, fs.clientID, fs.caseNumber, fs.primaryCaseManager, fs.caseStatus,
    fs.riskLevel, fs.caseComplexityScore, fs.satisfactionScore, fs.admissionDate,
    fs.targetLOS, fs.createdAt, fs.updatedAt;

-- Case manager workload analysis
CREATE VIEW vw_CaseManagerWorkload AS
SELECT 
    fs.primaryCaseManager,
    COUNT(*) AS totalCases,
    SUM(CASE WHEN fs.caseStatus = 'Active' THEN 1 ELSE 0 END) AS activeCases,
    SUM(CASE WHEN fs.caseStatus = 'Pending' THEN 1 ELSE 0 END) AS pendingCases,
    SUM(CASE WHEN fs.riskLevel = 'High' OR fs.riskLevel = 'Critical' THEN 1 ELSE 0 END) AS highRiskCases,
    AVG(fs.caseComplexityScore) AS avgComplexityScore,
    AVG(DATEDIFF(DAY, fs.admissionDate, GETDATE())) AS avgCurrentLOS,
    
    -- Overdue tasks count
    SUM(ct.overdueTasks) AS totalOverdueTasks,
    
    -- Performance metrics
    AVG(fs.satisfactionScore) AS avgSatisfactionScore,
    AVG(fs.completionPercentage) AS avgCompletionPercentage
FROM dbo.Section6FaceSheet fs
LEFT JOIN (
    SELECT 
        caseID,
        SUM(CASE WHEN completed = 0 AND dueDate < GETDATE() THEN 1 ELSE 0 END) AS overdueTasks
    FROM dbo.CaseTimeline
    GROUP BY caseID
) ct ON fs.faceSheetID = ct.caseID
WHERE fs.primaryCaseManager IS NOT NULL
GROUP BY fs.primaryCaseManager;

-- ========================================
-- CREATE STORED PROCEDURES
-- ========================================

-- Get complete case dashboard data
CREATE PROCEDURE sp_GetCaseDashboard
    @ClientID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT * FROM vw_Section6Dashboard
    WHERE clientID = @ClientID;
    
    -- Get recent timeline events
    SELECT TOP 10 * FROM vw_CaseTimeline
    WHERE clientID = @ClientID
    ORDER BY eventDate DESC;
    
    -- Get case metrics
    SELECT * FROM vw_CaseMetrics
    WHERE clientID = @ClientID;
END;

-- Update case status with logging
CREATE PROCEDURE sp_UpdateCaseStatus
    @ClientID NVARCHAR(50),
    @NewStatus NVARCHAR(50),
    @Reason NVARCHAR(500) = NULL,
    @UpdatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    DECLARE @CaseID INT;
    DECLARE @OldStatus NVARCHAR(50);
    
    -- Get current case info
    SELECT @CaseID = faceSheetID, @OldStatus = caseStatus
    FROM dbo.Section6FaceSheet
    WHERE clientID = @ClientID;
    
    IF @CaseID IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        RAISERROR('Case not found for client ID: %s', 16, 1, @ClientID);
        RETURN;
    END
    
    -- Update case status
    UPDATE dbo.Section6FaceSheet
    SET caseStatus = @NewStatus,
        updatedBy = @UpdatedBy,
        updatedAt = GETDATE()
    WHERE faceSheetID = @CaseID;
    
    -- Log status change in timeline
    INSERT INTO dbo.CaseTimeline (
        caseID, eventType, eventTitle, eventDescription, eventDate, 
        completed, completedAt, completedBy, createdBy, createdAt
    )
    VALUES (
        @CaseID, 'Status Change', 'Case Status Updated',
        CONCAT('Status changed from ', @OldStatus, ' to ', @NewStatus, 
               CASE WHEN @Reason IS NOT NULL THEN '. Reason: ' + @Reason ELSE '' END),
        GETDATE(), 1, GETDATE(), @UpdatedBy, @UpdatedBy, GETDATE()
    );
    
    COMMIT TRANSACTION;
    
    SELECT @@ROWCOUNT AS RowsAffected;
END;

-- Calculate and update case metrics
CREATE PROCEDURE sp_CalculateMetrics
    @ClientID NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- If no specific client, calculate for all active cases
    IF @ClientID IS NULL
    BEGIN
        -- Update completion percentages for all cases
        UPDATE fs
        SET completionPercentage = CASE 
            WHEN timeline_stats.total_milestones > 0 
            THEN (CAST(timeline_stats.completed_milestones AS FLOAT) / timeline_stats.total_milestones) * 100
            ELSE 0
        END,
        updatedAt = GETDATE()
        FROM dbo.Section6FaceSheet fs
        LEFT JOIN (
            SELECT 
                caseID,
                COUNT(*) AS total_milestones,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_milestones
            FROM dbo.CaseTimeline
            WHERE milestone = 1
            GROUP BY caseID
        ) timeline_stats ON fs.faceSheetID = timeline_stats.caseID
        WHERE fs.caseStatus = 'Active';
    END
    ELSE
    BEGIN
        -- Update specific case
        UPDATE fs
        SET completionPercentage = CASE 
            WHEN timeline_stats.total_milestones > 0 
            THEN (CAST(timeline_stats.completed_milestones AS FLOAT) / timeline_stats.total_milestones) * 100
            ELSE 0
        END,
        updatedAt = GETDATE()
        FROM dbo.Section6FaceSheet fs
        LEFT JOIN (
            SELECT 
                caseID,
                COUNT(*) AS total_milestones,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_milestones
            FROM dbo.CaseTimeline
            WHERE milestone = 1 AND caseID IN (
                SELECT faceSheetID FROM dbo.Section6FaceSheet WHERE clientID = @ClientID
            )
            GROUP BY caseID
        ) timeline_stats ON fs.faceSheetID = timeline_stats.caseID
        WHERE fs.clientID = @ClientID;
    END
    
    SELECT @@ROWCOUNT AS CasesUpdated;
END;

-- ========================================
-- INSERT SAMPLE DATA (Optional)
-- ========================================

-- Uncomment to insert sample data for testing
/*
INSERT INTO dbo.Section6FaceSheet (
    clientID, caseNumber, caseStatus, admissionDate, expectedDischargeDate,
    primaryCaseManager, backupCaseManager, completionPercentage, riskLevel, priorityLevel,
    caseComplexityScore, lengthOfStay, targetLOS, satisfactionScore,
    documentationComplete, createdBy, updatedBy
) VALUES (
    'CLIENT-SAMPLE-001', 'CS-2025-001', 'Active', '2025-07-10', '2025-07-25',
    'Sarah Johnson, LCSW', 'Michael Chen, MSW', 75.0, 'Medium', 'High',
    7, 7, 10, 4.2, 0, 'System', 'System'
);

-- Insert sample timeline events
DECLARE @SampleCaseID INT = SCOPE_IDENTITY();

INSERT INTO dbo.CaseTimeline (
    caseID, eventType, eventTitle, eventDescription, eventDate, 
    completed, milestone, required, createdBy
) VALUES 
(@SampleCaseID, 'Milestone', 'Initial Assessment', 'Complete initial client assessment', '2025-07-10', 1, 1, 1, 'System'),
(@SampleCaseID, 'Milestone', 'Care Plan Development', 'Develop comprehensive care plan', '2025-07-11', 1, 1, 1, 'System'),
(@SampleCaseID, 'Milestone', 'Service Coordination', 'Coordinate external services', '2025-07-12', 1, 1, 1, 'System'),
(@SampleCaseID, 'Milestone', 'Family Conference', 'Conduct family meeting', '2025-07-20', 0, 1, 1, 'System'),
(@SampleCaseID, 'Milestone', 'Discharge Planning', 'Complete discharge planning', '2025-07-22', 0, 1, 1, 'System');
*/

-- ========================================
-- GRANTS (Update based on your security model)
-- ========================================

-- Grant permissions to application roles
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Section6FaceSheet TO [YourApplicationRole];
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.CaseTimeline TO [YourApplicationRole];
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.CaseMetrics TO [YourApplicationRole];
-- GRANT SELECT ON vw_Section6Dashboard TO [YourReportingRole];
-- GRANT SELECT ON vw_CaseTimeline TO [YourReportingRole];
-- GRANT SELECT ON vw_CaseMetrics TO [YourReportingRole];
-- GRANT SELECT ON vw_CaseManagerWorkload TO [YourManagerRole];

PRINT 'Section 6 Case Management database schema created successfully!';
PRINT 'Tables created: Section6FaceSheet, CaseTimeline, CaseMetrics';
PRINT 'Views created: vw_Section6Dashboard, vw_CaseTimeline, vw_CaseMetrics, vw_CaseManagerWorkload';
PRINT 'Stored procedures created: sp_GetCaseDashboard, sp_UpdateCaseStatus, sp_CalculateMetrics';
PRINT 'Indexes created for optimal performance';
PRINT 'Ready for Section 6 Case Management system integration!';