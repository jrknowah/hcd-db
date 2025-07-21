-- =============================================
-- Assessment & Care Plans Database Schema
-- Version: 1.0
-- Created: 2025-07-18
-- Description: Comprehensive assessment and care planning system
-- =============================================

-- Set database context
USE [YourDatabaseName]; -- Replace with your actual database name
GO

-- =============================================
-- 1. MAIN ASSESSMENT CARE PLANS TABLE
-- =============================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssessmentCarePlans' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[AssessmentCarePlans] (
        -- Primary identifiers
        [assessmentID] NVARCHAR(50) NOT NULL PRIMARY KEY,
        [clientID] NVARCHAR(50) NOT NULL,
        [assessmentNumber] NVARCHAR(50) NOT NULL,
        
        -- Assessment details
        [assessmentType] NVARCHAR(50) NOT NULL DEFAULT 'Comprehensive',
        [assessmentStatus] NVARCHAR(50) NOT NULL DEFAULT 'In Progress',
        [startDate] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [expectedCompletionDate] DATETIME2 NULL,
        [actualCompletionDate] DATETIME2 NULL,
        
        -- Personnel and assessment info
        [primaryAssessor] NVARCHAR(100) NULL,
        [assessorRole] NVARCHAR(50) NULL DEFAULT 'Clinical Assessor',
        [supervisingClinician] NVARCHAR(100) NULL,
        
        -- Progress and metrics
        [completionPercentage] DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        [riskLevel] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        [priorityLevel] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        [complexityScore] INT NOT NULL DEFAULT 5,
        [targetDays] INT NOT NULL DEFAULT 14,
        [documentationComplete] BIT NOT NULL DEFAULT 0,
        
        -- Clinical information
        [clientDiagnosis] NVARCHAR(MAX) NULL,
        [treatmentRecommendations] NVARCHAR(MAX) NULL,
        [riskAssessmentSummary] NVARCHAR(MAX) NULL,
        [strengthsAssessmentSummary] NVARCHAR(MAX) NULL,
        [careGoals] NVARCHAR(MAX) NULL,
        [notes] NVARCHAR(MAX) NULL,
        
        -- Audit fields
        [createdBy] NVARCHAR(100) NOT NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updatedBy] NVARCHAR(100) NULL,
        [updatedAt] DATETIME2 NULL,
        [isActive] BIT NOT NULL DEFAULT 1,
        [version] INT NOT NULL DEFAULT 1,
        
        -- Constraints
        CONSTRAINT CK_AssessmentCarePlans_CompletionPercentage 
            CHECK ([completionPercentage] >= 0 AND [completionPercentage] <= 100),
        CONSTRAINT CK_AssessmentCarePlans_ComplexityScore 
            CHECK ([complexityScore] >= 1 AND [complexityScore] <= 10),
        CONSTRAINT CK_AssessmentCarePlans_RiskLevel 
            CHECK ([riskLevel] IN ('Low', 'Medium', 'High', 'Critical')),
        CONSTRAINT CK_AssessmentCarePlans_PriorityLevel 
            CHECK ([priorityLevel] IN ('Low', 'Medium', 'High', 'Urgent')),
        CONSTRAINT CK_AssessmentCarePlans_AssessmentStatus 
            CHECK ([assessmentStatus] IN ('Not Started', 'In Progress', 'Under Review', 'Complete', 'On Hold', 'Cancelled', 'Deleted')),
        CONSTRAINT CK_AssessmentCarePlans_AssessmentType 
            CHECK ([assessmentType] IN ('Initial', 'Comprehensive', 'Re-Assessment', 'Crisis', 'Discharge', 'Annual Review'))
    );
    
    PRINT '✅ AssessmentCarePlans table created successfully';
END
ELSE
BEGIN
    PRINT '⚠️  AssessmentCarePlans table already exists';
END
GO

-- =============================================
-- 2. ASSESSMENT MILESTONES TABLE
-- =============================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssessmentMilestones' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[AssessmentMilestones] (
        -- Primary identifiers
        [milestoneID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [assessmentID] NVARCHAR(50) NOT NULL,
        
        -- Milestone details
        [title] NVARCHAR(200) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [milestoneType] NVARCHAR(50) NOT NULL DEFAULT 'Assessment',
        [category] NVARCHAR(50) NULL,
        [sortOrder] INT NOT NULL DEFAULT 1,
        
        -- Status and timing
        [completed] BIT NOT NULL DEFAULT 0,
        [required] BIT NOT NULL DEFAULT 1,
        [dueDate] DATETIME2 NULL,
        [completedDate] DATETIME2 NULL,
        [completedBy] NVARCHAR(100) NULL,
        
        -- Time tracking
        [estimatedHours] DECIMAL(5,2) NULL DEFAULT 0.00,
        [actualHours] DECIMAL(5,2) NULL,
        [plannedStartDate] DATETIME2 NULL,
        [actualStartDate] DATETIME2 NULL,
        
        -- Additional information
        [notes] NVARCHAR(MAX) NULL,
        [prerequisites] NVARCHAR(MAX) NULL,
        [deliverables] NVARCHAR(MAX) NULL,
        [resourcesRequired] NVARCHAR(MAX) NULL,
        
        -- Audit fields
        [createdBy] NVARCHAR(100) NOT NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updatedBy] NVARCHAR(100) NULL,
        [updatedAt] DATETIME2 NULL,
        
        -- Foreign key
        FOREIGN KEY ([assessmentID]) REFERENCES [dbo].[AssessmentCarePlans]([assessmentID]) ON DELETE CASCADE,
        
        -- Constraints
        CONSTRAINT CK_AssessmentMilestones_EstimatedHours 
            CHECK ([estimatedHours] >= 0),
        CONSTRAINT CK_AssessmentMilestones_ActualHours 
            CHECK ([actualHours] >= 0),
        CONSTRAINT CK_AssessmentMilestones_CompletedDate 
            CHECK ([completedDate] IS NULL OR [completed] = 1),
        CONSTRAINT CK_AssessmentMilestones_MilestoneType 
            CHECK ([milestoneType] IN ('Assessment', 'Documentation', 'Review', 'Approval', 'Follow-up', 'Archive'))
    );
    
    PRINT '✅ AssessmentMilestones table created successfully';
END
ELSE
BEGIN
    PRINT '⚠️  AssessmentMilestones table already exists';
END
GO

-- =============================================
-- 3. ASSESSMENT DOCUMENTS TABLE
-- =============================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssessmentDocuments' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[AssessmentDocuments] (
        -- Primary identifiers
        [documentID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [assessmentID] NVARCHAR(50) NOT NULL,
        
        -- Document details
        [documentName] NVARCHAR(200) NOT NULL,
        [documentType] NVARCHAR(50) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [category] NVARCHAR(50) NULL,
        [required] BIT NOT NULL DEFAULT 1,
        
        -- Status and completion
        [completed] BIT NOT NULL DEFAULT 0,
        [completedDate] DATETIME2 NULL,
        [completedBy] NVARCHAR(100) NULL,
        [reviewedBy] NVARCHAR(100) NULL,
        [reviewedDate] DATETIME2 NULL,
        [approved] BIT NOT NULL DEFAULT 0,
        [approvedBy] NVARCHAR(100) NULL,
        [approvedDate] DATETIME2 NULL,
        
        -- File information
        [filePath] NVARCHAR(500) NULL,
        [fileName] NVARCHAR(200) NULL,
        [fileSize] BIGINT NULL,
        [mimeType] NVARCHAR(100) NULL,
        [documentVersion] INT NOT NULL DEFAULT 1,
        
        -- Additional information
        [notes] NVARCHAR(MAX) NULL,
        [dueDate] DATETIME2 NULL,
        [priority] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        
        -- Audit fields
        [createdBy] NVARCHAR(100) NOT NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updatedBy] NVARCHAR(100) NULL,
        [updatedAt] DATETIME2 NULL,
        
        -- Foreign key
        FOREIGN KEY ([assessmentID]) REFERENCES [dbo].[AssessmentCarePlans]([assessmentID]) ON DELETE CASCADE,
        
        -- Constraints
        CONSTRAINT CK_AssessmentDocuments_DocumentType 
            CHECK ([documentType] IN ('Bio-Social', 'Mental Health', 'Medical', 'Legal', 'Financial', 'Housing', 'Educational', 'Employment', 'Family', 'Risk Assessment', 'Strength Assessment', 'Care Plan', 'Progress Note', 'Report', 'Other')),
        CONSTRAINT CK_AssessmentDocuments_Priority 
            CHECK ([priority] IN ('Low', 'Medium', 'High', 'Critical'))
    );
    
    PRINT '✅ AssessmentDocuments table created successfully';
END
ELSE
BEGIN
    PRINT '⚠️  AssessmentDocuments table already exists';
END
GO

-- =============================================
-- 4. ASSESSMENT RISK FACTORS TABLE
-- =============================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssessmentRiskFactors' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[AssessmentRiskFactors] (
        -- Primary identifiers
        [riskFactorID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [assessmentID] NVARCHAR(50) NOT NULL,
        
        -- Risk factor details
        [riskCategory] NVARCHAR(50) NOT NULL,
        [riskType] NVARCHAR(100) NOT NULL,
        [description] NVARCHAR(MAX) NOT NULL,
        [severity] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        [likelihood] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        [impact] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        [riskScore] INT NOT NULL DEFAULT 5,
        
        -- Risk management
        [mitigationStrategy] NVARCHAR(MAX) NULL,
        [monitoringPlan] NVARCHAR(MAX) NULL,
        [responsibleParty] NVARCHAR(100) NULL,
        [targetDate] DATETIME2 NULL,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'Identified',
        
        -- Additional information
        [evidenceSource] NVARCHAR(200) NULL,
        [assessmentMethod] NVARCHAR(100) NULL,
        [notes] NVARCHAR(MAX) NULL,
        
        -- Audit fields
        [identifiedBy] NVARCHAR(100) NOT NULL,
        [identifiedDate] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updatedBy] NVARCHAR(100) NULL,
        [updatedAt] DATETIME2 NULL,
        
        -- Foreign key
        FOREIGN KEY ([assessmentID]) REFERENCES [dbo].[AssessmentCarePlans]([assessmentID]) ON DELETE CASCADE,
        
        -- Constraints
        CONSTRAINT CK_AssessmentRiskFactors_Severity 
            CHECK ([severity] IN ('Low', 'Medium', 'High', 'Critical')),
        CONSTRAINT CK_AssessmentRiskFactors_Likelihood 
            CHECK ([likelihood] IN ('Low', 'Medium', 'High', 'Very High')),
        CONSTRAINT CK_AssessmentRiskFactors_Impact 
            CHECK ([impact] IN ('Low', 'Medium', 'High', 'Severe')),
        CONSTRAINT CK_AssessmentRiskFactors_RiskScore 
            CHECK ([riskScore] >= 1 AND [riskScore] <= 10),
        CONSTRAINT CK_AssessmentRiskFactors_Status 
            CHECK ([status] IN ('Identified', 'Assessing', 'Mitigating', 'Monitoring', 'Resolved', 'Escalated'))
    );
    
    PRINT '✅ AssessmentRiskFactors table created successfully';
END
ELSE
BEGIN
    PRINT '⚠️  AssessmentRiskFactors table already exists';
END
GO

-- =============================================
-- 5. ASSESSMENT STRENGTHS TABLE
-- =============================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssessmentStrengths' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[AssessmentStrengths] (
        -- Primary identifiers
        [strengthID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [assessmentID] NVARCHAR(50) NOT NULL,
        
        -- Strength details
        [strengthCategory] NVARCHAR(50) NOT NULL,
        [strengthType] NVARCHAR(100) NOT NULL,
        [description] NVARCHAR(MAX) NOT NULL,
        [level] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        [reliability] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        [utilization] NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        [strengthScore] INT NOT NULL DEFAULT 5,
        
        -- Strength application
        [applicationStrategy] NVARCHAR(MAX) NULL,
        [developmentPlan] NVARCHAR(MAX) NULL,
        [supportRequired] NVARCHAR(MAX) NULL,
        [responsibleParty] NVARCHAR(100) NULL,
        [targetDate] DATETIME2 NULL,
        
        -- Additional information
        [evidenceSource] NVARCHAR(200) NULL,
        [assessmentMethod] NVARCHAR(100) NULL,
        [notes] NVARCHAR(MAX) NULL,
        
        -- Audit fields
        [identifiedBy] NVARCHAR(100) NOT NULL,
        [identifiedDate] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updatedBy] NVARCHAR(100) NULL,
        [updatedAt] DATETIME2 NULL,
        
        -- Foreign key
        FOREIGN KEY ([assessmentID]) REFERENCES [dbo].[AssessmentCarePlans]([assessmentID]) ON DELETE CASCADE,
        
        -- Constraints
        CONSTRAINT CK_AssessmentStrengths_Level 
            CHECK ([level] IN ('Low', 'Medium', 'High', 'Exceptional')),
        CONSTRAINT CK_AssessmentStrengths_Reliability 
            CHECK ([reliability] IN ('Low', 'Medium', 'High', 'Consistent')),
        CONSTRAINT CK_AssessmentStrengths_Utilization 
            CHECK ([utilization] IN ('Low', 'Medium', 'High', 'Optimal')),
        CONSTRAINT CK_AssessmentStrengths_StrengthScore 
            CHECK ([strengthScore] >= 1 AND [strengthScore] <= 10)
    );
    
    PRINT '✅ AssessmentStrengths table created successfully';
END
ELSE
BEGIN
    PRINT '⚠️  AssessmentStrengths table already exists';
END
GO

-- =============================================
-- 6. INDEXES FOR PERFORMANCE
-- =============================================

-- Primary lookup indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_AssessmentCarePlans_ClientID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AssessmentCarePlans_ClientID] 
    ON [dbo].[AssessmentCarePlans] ([clientID], [createdAt] DESC);
    PRINT '✅ Index IX_AssessmentCarePlans_ClientID created';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_AssessmentCarePlans_Status_Date')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AssessmentCarePlans_Status_Date] 
    ON [dbo].[AssessmentCarePlans] ([assessmentStatus], [startDate], [expectedCompletionDate]);
    PRINT '✅ Index IX_AssessmentCarePlans_Status_Date created';
END

-- Milestone indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_AssessmentMilestones_AssessmentID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AssessmentMilestones_AssessmentID] 
    ON [dbo].[AssessmentMilestones] ([assessmentID], [sortOrder], [completed]);
    PRINT '✅ Index IX_AssessmentMilestones_AssessmentID created';
END

-- Document indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_AssessmentDocuments_AssessmentID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AssessmentDocuments_AssessmentID] 
    ON [dbo].[AssessmentDocuments] ([assessmentID], [completed], [required]);
    PRINT '✅ Index IX_AssessmentDocuments_AssessmentID created';
END

-- =============================================
-- 7. VIEWS FOR REPORTING AND ANALYTICS
-- =============================================

-- Assessment Overview View
IF NOT EXISTS (SELECT * FROM sys.views WHERE name='vw_AssessmentOverview')
BEGIN
    EXEC('
    CREATE VIEW [dbo].[vw_AssessmentOverview] AS
    SELECT 
        acp.assessmentID,
        acp.clientID,
        acp.assessmentNumber,
        acp.assessmentType,
        acp.assessmentStatus,
        acp.startDate,
        acp.expectedCompletionDate,
        acp.actualCompletionDate,
        acp.primaryAssessor,
        acp.completionPercentage,
        acp.riskLevel,
        acp.priorityLevel,
        acp.complexityScore,
        
        -- Calculated fields
        DATEDIFF(day, acp.startDate, GETDATE()) as daysInProgress,
        DATEDIFF(day, GETDATE(), acp.expectedCompletionDate) as daysRemaining,
        CASE 
            WHEN acp.expectedCompletionDate < GETDATE() AND acp.assessmentStatus NOT IN (''Complete'', ''Cancelled'') 
            THEN CAST(1 AS BIT) 
            ELSE CAST(0 AS BIT) 
        END as isOverdue,
        
        -- Milestone counts
        (SELECT COUNT(*) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID) as totalMilestones,
        (SELECT COUNT(*) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID AND am.completed = 1) as completedMilestones,
        (SELECT COUNT(*) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID AND am.required = 1 AND am.completed = 0) as requiredPending,
        
        -- Document counts
        (SELECT COUNT(*) FROM AssessmentDocuments ad WHERE ad.assessmentID = acp.assessmentID) as totalDocuments,
        (SELECT COUNT(*) FROM AssessmentDocuments ad WHERE ad.assessmentID = acp.assessmentID AND ad.completed = 1) as completedDocuments,
        
        -- Risk and strength counts
        (SELECT COUNT(*) FROM AssessmentRiskFactors arf WHERE arf.assessmentID = acp.assessmentID) as riskFactorCount,
        (SELECT COUNT(*) FROM AssessmentStrengths ast WHERE ast.assessmentID = acp.assessmentID) as strengthCount,
        
        acp.createdBy,
        acp.createdAt,
        acp.updatedBy,
        acp.updatedAt
    FROM AssessmentCarePlans acp
    WHERE acp.isActive = 1
    ');
    PRINT '✅ View vw_AssessmentOverview created';
END
ELSE
BEGIN
    PRINT '⚠️  View vw_AssessmentOverview already exists';
END
GO

-- Assessment Performance Metrics View
IF NOT EXISTS (SELECT * FROM sys.views WHERE name='vw_AssessmentMetrics')
BEGIN
    EXEC('
    CREATE VIEW [dbo].[vw_AssessmentMetrics] AS
    SELECT 
        YEAR(acp.startDate) as assessmentYear,
        MONTH(acp.startDate) as assessmentMonth,
        acp.assessmentType,
        acp.primaryAssessor,
        
        -- Volume metrics
        COUNT(*) as totalAssessments,
        COUNT(CASE WHEN acp.assessmentStatus = ''Complete'' THEN 1 END) as completedAssessments,
        COUNT(CASE WHEN acp.assessmentStatus = ''In Progress'' THEN 1 END) as inProgressAssessments,
        COUNT(CASE WHEN acp.expectedCompletionDate < GETDATE() AND acp.assessmentStatus NOT IN (''Complete'', ''Cancelled'') THEN 1 END) as overdueAssessments,
        
        -- Quality metrics
        AVG(CAST(acp.completionPercentage AS FLOAT)) as avgCompletionPercentage,
        AVG(CAST(acp.complexityScore AS FLOAT)) as avgComplexityScore,
        AVG(CASE WHEN acp.actualCompletionDate IS NOT NULL THEN DATEDIFF(day, acp.startDate, acp.actualCompletionDate) END) as avgCompletionDays,
        
        -- Risk distribution
        COUNT(CASE WHEN acp.riskLevel = ''Low'' THEN 1 END) as lowRiskCount,
        COUNT(CASE WHEN acp.riskLevel = ''Medium'' THEN 1 END) as mediumRiskCount,
        COUNT(CASE WHEN acp.riskLevel = ''High'' THEN 1 END) as highRiskCount,
        COUNT(CASE WHEN acp.riskLevel = ''Critical'' THEN 1 END) as criticalRiskCount
        
    FROM AssessmentCarePlans acp
    WHERE acp.isActive = 1 
    AND acp.startDate >= DATEADD(year, -2, GETDATE()) -- Last 2 years
    GROUP BY 
        YEAR(acp.startDate),
        MONTH(acp.startDate),
        acp.assessmentType,
        acp.primaryAssessor
    ');
    PRINT '✅ View vw_AssessmentMetrics created';
END
ELSE
BEGIN
    PRINT '⚠️  View vw_AssessmentMetrics already exists';
END
GO

-- =============================================
-- 8. STORED PROCEDURES
-- =============================================

-- Procedure to get comprehensive assessment profile
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name='sp_GetAssessmentProfile')
BEGIN
    EXEC('
    CREATE PROCEDURE [dbo].[sp_GetAssessmentProfile]
        @ClientID NVARCHAR(50)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- Get latest assessment overview
        SELECT * FROM vw_AssessmentOverview 
        WHERE clientID = @ClientID 
        ORDER BY createdAt DESC;
        
        -- Get milestones for latest assessment
        SELECT am.* 
        FROM AssessmentMilestones am
        INNER JOIN (
            SELECT TOP 1 assessmentID 
            FROM AssessmentCarePlans 
            WHERE clientID = @ClientID 
            ORDER BY createdAt DESC
        ) latest ON am.assessmentID = latest.assessmentID
        ORDER BY am.sortOrder, am.milestoneID;
        
        -- Get risk factors
        SELECT arf.* 
        FROM AssessmentRiskFactors arf
        INNER JOIN (
            SELECT TOP 1 assessmentID 
            FROM AssessmentCarePlans 
            WHERE clientID = @ClientID 
            ORDER BY createdAt DESC
        ) latest ON arf.assessmentID = latest.assessmentID
        ORDER BY arf.severity DESC, arf.riskScore DESC;
        
        -- Get strengths
        SELECT ast.* 
        FROM AssessmentStrengths ast
        INNER JOIN (
            SELECT TOP 1 assessmentID 
            FROM AssessmentCarePlans 
            WHERE clientID = @ClientID 
            ORDER BY createdAt DESC
        ) latest ON ast.assessmentID = latest.assessmentID
        ORDER BY ast.level DESC, ast.strengthScore DESC;
    END
    ');
    PRINT '✅ Procedure sp_GetAssessmentProfile created';
END
ELSE
BEGIN
    PRINT '⚠️  Procedure sp_GetAssessmentProfile already exists';
END
GO

-- Procedure to update assessment progress
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name='sp_UpdateAssessmentProgress')
BEGIN
    EXEC('
    CREATE PROCEDURE [dbo].[sp_UpdateAssessmentProgress]
        @AssessmentID NVARCHAR(50),
        @UpdatedBy NVARCHAR(100)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @CompletionPercentage DECIMAL(5,2);
        DECLARE @TotalMilestones INT;
        DECLARE @CompletedMilestones INT;
        
        -- Calculate completion percentage based on milestones
        SELECT 
            @TotalMilestones = COUNT(*),
            @CompletedMilestones = COUNT(CASE WHEN completed = 1 THEN 1 END)
        FROM AssessmentMilestones 
        WHERE assessmentID = @AssessmentID;
        
        IF @TotalMilestones > 0
        BEGIN
            SET @CompletionPercentage = CAST((@CompletedMilestones * 100.0 / @TotalMilestones) AS DECIMAL(5,2));
        END
        ELSE
        BEGIN
            SET @CompletionPercentage = 0;
        END
        
        -- Update assessment
        UPDATE AssessmentCarePlans 
        SET 
            completionPercentage = @CompletionPercentage,
            assessmentStatus = CASE 
                WHEN @CompletionPercentage = 100 THEN ''Complete''
                WHEN @CompletionPercentage > 0 THEN ''In Progress''
                ELSE assessmentStatus 
            END,
            actualCompletionDate = CASE 
                WHEN @CompletionPercentage = 100 AND actualCompletionDate IS NULL THEN GETDATE()
                ELSE actualCompletionDate 
            END,
            updatedBy = @UpdatedBy,
            updatedAt = GETDATE()
        WHERE assessmentID = @AssessmentID;
        
        -- Return updated assessment info
        SELECT 
            assessmentID,
            completionPercentage,
            assessmentStatus,
            actualCompletionDate
        FROM AssessmentCarePlans 
        WHERE assessmentID = @AssessmentID;
    END
    ');
    PRINT '✅ Procedure sp_UpdateAssessmentProgress created';
END
ELSE
BEGIN
    PRINT '⚠️  Procedure sp_UpdateAssessmentProgress already exists';
END
GO

-- Procedure to generate assessment summary report
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name='sp_GenerateAssessmentSummary')
BEGIN
    EXEC('
    CREATE PROCEDURE [dbo].[sp_GenerateAssessmentSummary]
        @StartDate DATETIME2 = NULL,
        @EndDate DATETIME2 = NULL,
        @AssessorEmail NVARCHAR(100) = NULL
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- Default to last 30 days if no dates provided
        IF @StartDate IS NULL SET @StartDate = DATEADD(day, -30, GETDATE());
        IF @EndDate IS NULL SET @EndDate = GETDATE();
        
        -- Summary metrics
        SELECT 
            ''Summary'' as ReportSection,
            COUNT(*) as TotalAssessments,
            COUNT(CASE WHEN assessmentStatus = ''Complete'' THEN 1 END) as CompletedAssessments,
            COUNT(CASE WHEN assessmentStatus = ''In Progress'' THEN 1 END) as InProgressAssessments,
            COUNT(CASE WHEN expectedCompletionDate < GETDATE() AND assessmentStatus NOT IN (''Complete'', ''Cancelled'') THEN 1 END) as OverdueAssessments,
            AVG(CAST(completionPercentage AS FLOAT)) as AvgCompletionPercentage,
            AVG(CAST(complexityScore AS FLOAT)) as AvgComplexityScore
        FROM AssessmentCarePlans
        WHERE startDate BETWEEN @StartDate AND @EndDate
        AND (@AssessorEmail IS NULL OR primaryAssessor = @AssessorEmail)
        AND isActive = 1;
        
        -- Assessor performance
        SELECT 
            ''Assessor Performance'' as ReportSection,
            primaryAssessor,
            COUNT(*) as AssessmentsAssigned,
            COUNT(CASE WHEN assessmentStatus = ''Complete'' THEN 1 END) as CompletedAssessments,
            AVG(CAST(completionPercentage AS FLOAT)) as AvgCompletionPercentage,
            AVG(CASE WHEN actualCompletionDate IS NOT NULL THEN DATEDIFF(day, startDate, actualCompletionDate) END) as AvgCompletionDays
        FROM AssessmentCarePlans
        WHERE startDate BETWEEN @StartDate AND @EndDate
        AND (@AssessorEmail IS NULL OR primaryAssessor = @AssessorEmail)
        AND isActive = 1
        GROUP BY primaryAssessor
        ORDER BY COUNT(*) DESC;
        
        -- Risk level distribution
        SELECT 
            ''Risk Distribution'' as ReportSection,
            riskLevel,
            COUNT(*) as AssessmentCount,
            AVG(CAST(complexityScore AS FLOAT)) as AvgComplexityScore
        FROM AssessmentCarePlans
        WHERE startDate BETWEEN @StartDate AND @EndDate
        AND (@AssessorEmail IS NULL OR primaryAssessor = @AssessorEmail)
        AND isActive = 1
        GROUP BY riskLevel
        ORDER BY 
            CASE riskLevel 
                WHEN ''Critical'' THEN 1 
                WHEN ''High'' THEN 2 
                WHEN ''Medium'' THEN 3 
                WHEN ''Low'' THEN 4 
            END;
    END
    ');
    PRINT '✅ Procedure sp_GenerateAssessmentSummary created';
END
ELSE
BEGIN
    PRINT '⚠️  Procedure sp_GenerateAssessmentSummary already exists';
END
GO

-- =============================================
-- 9. INSERT DEFAULT MILESTONE TEMPLATES
-- =============================================

-- This procedure creates default milestones for new assessments
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name='sp_CreateDefaultMilestones')
BEGIN
    EXEC('
    CREATE PROCEDURE [dbo].[sp_CreateDefaultMilestones]
        @AssessmentID NVARCHAR(50),
        @CreatedBy NVARCHAR(100)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- Check if milestones already exist
        IF NOT EXISTS (SELECT 1 FROM AssessmentMilestones WHERE assessmentID = @AssessmentID)
        BEGIN
            INSERT INTO AssessmentMilestones (
                assessmentID, title, description, milestoneType, required, 
                estimatedHours, sortOrder, createdBy
            ) VALUES
            (@AssessmentID, ''Bio-Social Assessment'', ''Comprehensive financial, employment, housing, and social support assessment'', ''Assessment'', 1, 2.0, 1, @CreatedBy),
            (@AssessmentID, ''Mental Health Assessment'', ''Psychiatric evaluation, mental status exam, and psychological assessment'', ''Assessment'', 1, 3.0, 2, @CreatedBy),
            (@AssessmentID, ''Re-Assessment'', ''Follow-up assessment and progress evaluation with updated recommendations'', ''Assessment'', 1, 2.0, 3, @CreatedBy),
            (@AssessmentID, ''Section 3 Archive'', ''Document archival, final documentation, and case closure activities'', ''Documentation'', 0, 1.0, 4, @CreatedBy);
            
            -- Set due dates (staggered over the target period)
            DECLARE @StartDate DATETIME2;
            SELECT @StartDate = startDate FROM AssessmentCarePlans WHERE assessmentID = @AssessmentID;
            
            UPDATE AssessmentMilestones 
            SET dueDate = CASE sortOrder
                WHEN 1 THEN DATEADD(day, 3, @StartDate)   -- Bio-Social: 3 days
                WHEN 2 THEN DATEADD(day, 7, @StartDate)   -- Mental Health: 7 days  
                WHEN 3 THEN DATEADD(day, 12, @StartDate)  -- Re-Assessment: 12 days
                WHEN 4 THEN DATEADD(day, 14, @StartDate)  -- Archive: 14 days
            END
            WHERE assessmentID = @AssessmentID;
        END
    END
    ');
    PRINT '✅ Procedure sp_CreateDefaultMilestones created';
END
ELSE
BEGIN
    PRINT '⚠️  Procedure sp_CreateDefaultMilestones already exists';
END
GO

-- =============================================
-- 10. SAMPLE DATA FOR TESTING
-- =============================================

PRINT '===========================================';
PRINT 'Assessment & Care Plans Database Setup Complete!';
PRINT '===========================================';
PRINT '';
PRINT '✅ Tables Created:';
PRINT '   - AssessmentCarePlans (Main assessment data)';
PRINT '   - AssessmentMilestones (Progress tracking)';
PRINT '   - AssessmentDocuments (Document management)';
PRINT '   - AssessmentRiskFactors (Risk assessment)';
PRINT '   - AssessmentStrengths (Strength assessment)';
PRINT '';
PRINT '✅ Views Created:';
PRINT '   - vw_AssessmentOverview (Comprehensive overview)';
PRINT '   - vw_AssessmentMetrics (Performance analytics)';
PRINT '';
PRINT '✅ Stored Procedures Created:';
PRINT '   - sp_GetAssessmentProfile (Get full client profile)';
PRINT '   - sp_UpdateAssessmentProgress (Update completion status)';
PRINT '   - sp_GenerateAssessmentSummary (Generate reports)';
PRINT '   - sp_CreateDefaultMilestones (Create milestone templates)';
PRINT '';
PRINT '✅ Indexes Created for optimal performance';
PRINT '';
PRINT '🚀 Ready for Assessment & Care Plans integration!';
PRINT '';

-- Example usage:
/*
-- Create a new assessment
INSERT INTO AssessmentCarePlans (
    assessmentID, clientID, assessmentNumber, assessmentType, 
    primaryAssessor, expectedCompletionDate, riskLevel, priorityLevel, 
    complexityScore, createdBy
) VALUES (
    'ACP-2025-0001', 'CLIENT-123', 'ACP-2025-0001', 'Comprehensive',
    'dr.rodriguez@example.com', DATEADD(day, 14, GETDATE()), 'Medium', 'High',
    6, 'system@example.com'
);

-- Create default milestones
EXEC sp_CreateDefaultMilestones 'ACP-2025-0001', 'system@example.com';

-- Get assessment profile
EXEC sp_GetAssessmentProfile 'CLIENT-123';

-- Generate summary report
EXEC sp_GenerateAssessmentSummary;
*/