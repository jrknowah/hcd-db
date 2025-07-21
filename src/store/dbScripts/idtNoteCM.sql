-- =============================================
-- IDT Case Manager Database Schema
-- Complete database setup for IDT Case Manager functionality
-- =============================================

-- Drop existing objects if they exist
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_IDTCaseManagerSummary')
    DROP VIEW vw_IDTCaseManagerSummary;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_IDTRiskAssessment')
    DROP VIEW vw_IDTRiskAssessment;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_IDTProgressTracking')
    DROP VIEW vw_IDTProgressTracking;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetIDTCaseManagerProfile')
    DROP PROCEDURE sp_GetIDTCaseManagerProfile;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CalculateIDTRiskScore')
    DROP PROCEDURE sp_CalculateIDTRiskScore;

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_UpdateIDTProgress')
    DROP PROCEDURE sp_UpdateIDTProgress;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'IDTCaseManager')
    DROP TABLE IDTCaseManager;

-- =============================================
-- Main IDTCaseManager Table
-- =============================================
CREATE TABLE dbo.IDTCaseManager (
    -- Primary Key
    idtCMID INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Client Reference
    clientID NVARCHAR(50) NOT NULL UNIQUE,
    
    -- Member Assessment
    idtMemberSituation NVARCHAR(MAX) NULL,          -- Mental health, living conditions, family, finances, transportation
    idtMemberSupport NVARCHAR(MAX) NULL,            -- Support system and dynamics (family, friends, significant other)
    
    -- Financial & Documentation
    idtIncomeSource NVARCHAR(500) NULL,             -- Member source of income
    clientGovIssued NVARCHAR(MAX) NULL,             -- Government issued ID (JSON array)
    idtResources NVARCHAR(MAX) NULL,                -- Resources/assistance we can provide
    
    -- Case Management
    idtHfhCM NVARCHAR(200) NULL,                    -- HFH case manager assigned to client
    idtRecommend NVARCHAR(MAX) NULL,                -- Recommendations to address problems
    
    -- Education & Employment
    clientHighEnd NVARCHAR(100) NULL,               -- Member's educational level
    idtGoals NVARCHAR(MAX) NULL,                    -- Work goal feasibility and timeline
    clientPayeeBarriers NVARCHAR(MAX) NULL,         -- Mental/physical barriers to employment
    clientPayeeAssistance NVARCHAR(MAX) NULL,       -- How we will assist in attaining goals
    
    -- Assessment Scores (Calculated)
    assessmentScore DECIMAL(5,2) NULL DEFAULT 0,    -- Overall assessment score (0-100)
    riskLevel NVARCHAR(50) NULL DEFAULT 'Unknown',  -- Low, Medium, High
    readinessLevel NVARCHAR(50) NULL DEFAULT 'Unknown', -- Employment readiness level
    supportStrength NVARCHAR(50) NULL DEFAULT 'Unknown', -- Support system strength
    
    -- Progress Tracking
    goalsCompleted INT NULL DEFAULT 0,              -- Number of completed goals
    goalsInProgress INT NULL DEFAULT 0,             -- Number of goals in progress
    goalsPending INT NULL DEFAULT 0,                -- Number of pending goals
    lastAssessmentDate DATE NULL,                   -- Date of last assessment
    nextFollowUpDate DATE NULL,                     -- Scheduled follow-up date
    
    -- Documentation Status
    documentationComplete BIT NULL DEFAULT 0,       -- All required docs complete
    missingDocuments NVARCHAR(MAX) NULL,            -- List of missing documents (JSON)
    lastDocumentUpdate DATETIME2 NULL,              -- Last document update
    
    -- Audit Fields
    createdBy NVARCHAR(100) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(100) NOT NULL,
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT CK_IDTCaseManager_RiskLevel CHECK (riskLevel IN ('Low', 'Medium', 'High', 'Unknown')),
    CONSTRAINT CK_IDTCaseManager_ReadinessLevel CHECK (readinessLevel IN ('Low', 'Moderate', 'High', 'Unknown')),
    CONSTRAINT CK_IDTCaseManager_SupportStrength CHECK (supportStrength IN ('Weak', 'Moderate', 'Strong', 'Unknown')),
    CONSTRAINT CK_IDTCaseManager_AssessmentScore CHECK (assessmentScore >= 0 AND assessmentScore <= 100),
    CONSTRAINT CK_IDTCaseManager_GoalCounts CHECK (goalsCompleted >= 0 AND goalsInProgress >= 0 AND goalsPending >= 0)
);

-- Create Indexes for Performance
CREATE NONCLUSTERED INDEX IX_IDTCaseManager_ClientID ON dbo.IDTCaseManager (clientID);
CREATE NONCLUSTERED INDEX IX_IDTCaseManager_CaseManager ON dbo.IDTCaseManager (idtHfhCM);
CREATE NONCLUSTERED INDEX IX_IDTCaseManager_RiskLevel ON dbo.IDTCaseManager (riskLevel);
CREATE NONCLUSTERED INDEX IX_IDTCaseManager_AssessmentDate ON dbo.IDTCaseManager (lastAssessmentDate);
CREATE NONCLUSTERED INDEX IX_IDTCaseManager_FollowUpDate ON dbo.IDTCaseManager (nextFollowUpDate);
CREATE NONCLUSTERED INDEX IX_IDTCaseManager_CreatedAt ON dbo.IDTCaseManager (createdAt);

-- =============================================
-- Views for Reporting and Analytics
-- =============================================

-- IDT Case Manager Summary View
CREATE VIEW vw_IDTCaseManagerSummary AS
SELECT 
    i.idtCMID,
    i.clientID,
    i.idtHfhCM,
    i.assessmentScore,
    i.riskLevel,
    i.readinessLevel,
    i.supportStrength,
    i.goalsCompleted,
    i.goalsInProgress,
    i.goalsPending,
    (i.goalsCompleted + i.goalsInProgress + i.goalsPending) AS totalGoals,
    CASE 
        WHEN (i.goalsCompleted + i.goalsInProgress + i.goalsPending) = 0 THEN 0
        ELSE CAST(i.goalsCompleted AS FLOAT) / (i.goalsCompleted + i.goalsInProgress + i.goalsPending) * 100
    END AS goalCompletionPercentage,
    i.lastAssessmentDate,
    i.nextFollowUpDate,
    CASE 
        WHEN i.nextFollowUpDate < GETDATE() THEN 'Overdue'
        WHEN i.nextFollowUpDate <= DATEADD(day, 7, GETDATE()) THEN 'Due Soon'
        ELSE 'Scheduled'
    END AS followUpStatus,
    i.documentationComplete,
    -- Calculate completion percentage
    (CASE WHEN i.idtMemberSituation IS NOT NULL AND i.idtMemberSituation != '' THEN 1 ELSE 0 END +
     CASE WHEN i.idtMemberSupport IS NOT NULL AND i.idtMemberSupport != '' THEN 1 ELSE 0 END +
     CASE WHEN i.idtIncomeSource IS NOT NULL AND i.idtIncomeSource != '' THEN 1 ELSE 0 END +
     CASE WHEN i.clientGovIssued IS NOT NULL AND i.clientGovIssued != '[]' THEN 1 ELSE 0 END +
     CASE WHEN i.idtResources IS NOT NULL AND i.idtResources != '' THEN 1 ELSE 0 END +
     CASE WHEN i.idtHfhCM IS NOT NULL AND i.idtHfhCM != '' THEN 1 ELSE 0 END +
     CASE WHEN i.idtRecommend IS NOT NULL AND i.idtRecommend != '' THEN 1 ELSE 0 END +
     CASE WHEN i.clientHighEnd IS NOT NULL AND i.clientHighEnd != '' THEN 1 ELSE 0 END +
     CASE WHEN i.idtGoals IS NOT NULL AND i.idtGoals != '' THEN 1 ELSE 0 END +
     CASE WHEN i.clientPayeeBarriers IS NOT NULL AND i.clientPayeeBarriers != '' THEN 1 ELSE 0 END +
     CASE WHEN i.clientPayeeAssistance IS NOT NULL AND i.clientPayeeAssistance != '' THEN 1 ELSE 0 END) * 100.0 / 11 AS completionPercentage,
    i.createdAt,
    i.updatedAt,
    i.updatedBy
FROM dbo.IDTCaseManager i;

-- IDT Risk Assessment View
CREATE VIEW vw_IDTRiskAssessment AS
SELECT 
    i.idtCMID,
    i.clientID,
    i.riskLevel,
    i.readinessLevel,
    i.supportStrength,
    -- Risk factors analysis
    CASE 
        WHEN i.clientPayeeBarriers LIKE '%mental%' OR i.clientPayeeBarriers LIKE '%depression%' OR i.clientPayeeBarriers LIKE '%anxiety%' THEN 1 
        ELSE 0 
    END AS hasMentalHealthRisk,
    CASE 
        WHEN i.clientPayeeBarriers LIKE '%physical%' OR i.clientPayeeBarriers LIKE '%disability%' THEN 1 
        ELSE 0 
    END AS hasPhysicalBarriers,
    CASE 
        WHEN i.idtIncomeSource IS NULL OR i.idtIncomeSource = '' OR i.idtIncomeSource LIKE '%none%' THEN 1 
        ELSE 0 
    END AS hasIncomeRisk,
    CASE 
        WHEN i.idtMemberSupport IS NULL OR i.idtMemberSupport = '' OR LEN(i.idtMemberSupport) < 50 THEN 1 
        ELSE 0 
    END AS hasLimitedSupport,
    CASE 
        WHEN i.idtMemberSituation LIKE '%transportation%' OR i.idtMemberSituation LIKE '%housing%' THEN 1 
        ELSE 0 
    END AS hasLogisticalBarriers,
    -- Risk score calculation
    (CASE WHEN i.clientPayeeBarriers LIKE '%mental%' THEN 2 ELSE 0 END +
     CASE WHEN i.clientPayeeBarriers LIKE '%physical%' THEN 1 ELSE 0 END +
     CASE WHEN i.idtIncomeSource IS NULL OR i.idtIncomeSource LIKE '%none%' THEN 2 ELSE 0 END +
     CASE WHEN LEN(ISNULL(i.idtMemberSupport, '')) < 50 THEN 1 ELSE 0 END +
     CASE WHEN i.idtMemberSituation LIKE '%transportation%' THEN 1 ELSE 0 END) AS calculatedRiskScore,
    i.lastAssessmentDate,
    i.updatedAt
FROM dbo.IDTCaseManager i;

-- IDT Progress Tracking View
CREATE VIEW vw_IDTProgressTracking AS
SELECT 
    i.idtCMID,
    i.clientID,
    i.idtHfhCM,
    i.goalsCompleted,
    i.goalsInProgress,
    i.goalsPending,
    (i.goalsCompleted + i.goalsInProgress + i.goalsPending) AS totalGoals,
    CASE 
        WHEN (i.goalsCompleted + i.goalsInProgress + i.goalsPending) = 0 THEN 0
        ELSE CAST(i.goalsCompleted AS FLOAT) / (i.goalsCompleted + i.goalsInProgress + i.goalsPending) * 100
    END AS progressPercentage,
    i.assessmentScore,
    i.lastAssessmentDate,
    i.nextFollowUpDate,
    DATEDIFF(day, i.lastAssessmentDate, GETDATE()) AS daysSinceLastAssessment,
    DATEDIFF(day, GETDATE(), i.nextFollowUpDate) AS daysUntilFollowUp,
    CASE 
        WHEN i.nextFollowUpDate < GETDATE() THEN 'Overdue'
        WHEN i.nextFollowUpDate <= DATEADD(day, 7, GETDATE()) THEN 'Due Soon'
        WHEN i.nextFollowUpDate <= DATEADD(day, 30, GETDATE()) THEN 'Upcoming'
        ELSE 'Scheduled'
    END AS followUpStatus,
    i.documentationComplete,
    i.updatedAt
FROM dbo.IDTCaseManager i;

-- =============================================
-- Stored Procedures
-- =============================================

-- Get Complete IDT Case Manager Profile
CREATE PROCEDURE sp_GetIDTCaseManagerProfile
    @clientID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        i.*,
        s.completionPercentage,
        s.goalCompletionPercentage,
        s.followUpStatus,
        r.calculatedRiskScore,
        r.hasMentalHealthRisk,
        r.hasPhysicalBarriers,
        r.hasIncomeRisk,
        r.hasLimitedSupport,
        r.hasLogisticalBarriers
    FROM dbo.IDTCaseManager i
    LEFT JOIN vw_IDTCaseManagerSummary s ON i.idtCMID = s.idtCMID
    LEFT JOIN vw_IDTRiskAssessment r ON i.idtCMID = r.idtCMID
    WHERE i.clientID = @clientID;
END;

-- Calculate IDT Risk Score
CREATE PROCEDURE sp_CalculateIDTRiskScore
    @clientID NVARCHAR(50),
    @riskScore INT OUTPUT,
    @riskLevel NVARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        @riskScore = calculatedRiskScore,
        @riskLevel = CASE 
            WHEN calculatedRiskScore >= 5 THEN 'High'
            WHEN calculatedRiskScore >= 3 THEN 'Medium'
            ELSE 'Low'
        END
    FROM vw_IDTRiskAssessment
    WHERE clientID = @clientID;
    
    -- Update the record with calculated risk level
    UPDATE dbo.IDTCaseManager
    SET riskLevel = @riskLevel,
        updatedAt = GETDATE()
    WHERE clientID = @clientID;
END;

-- Update IDT Progress
CREATE PROCEDURE sp_UpdateIDTProgress
    @clientID NVARCHAR(50),
    @goalsCompleted INT = NULL,
    @goalsInProgress INT = NULL,
    @goalsPending INT = NULL,
    @updatedBy NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.IDTCaseManager
    SET goalsCompleted = ISNULL(@goalsCompleted, goalsCompleted),
        goalsInProgress = ISNULL(@goalsInProgress, goalsInProgress),
        goalsPending = ISNULL(@goalsPending, goalsPending),
        lastAssessmentDate = GETDATE(),
        nextFollowUpDate = DATEADD(month, 1, GETDATE()),
        updatedBy = @updatedBy,
        updatedAt = GETDATE()
    WHERE clientID = @clientID;
END;

-- =============================================
-- Sample Data for Testing
-- =============================================

-- Insert sample IDT Case Manager records
INSERT INTO dbo.IDTCaseManager (
    clientID, idtMemberSituation, idtMemberSupport, idtIncomeSource, clientGovIssued,
    idtResources, idtHfhCM, idtRecommend, clientHighEnd, idtGoals,
    clientPayeeBarriers, clientPayeeAssistance, assessmentScore, riskLevel,
    readinessLevel, supportStrength, goalsCompleted, goalsInProgress, goalsPending,
    lastAssessmentDate, nextFollowUpDate, documentationComplete,
    createdBy, updatedBy
) VALUES 
(
    'CLIENT-001',
    'Client demonstrates stable mental health with some anxiety regarding housing. Living with supportive family temporarily. Limited transportation but has bus pass. Receives SSI benefits which covers basic needs.',
    'Strong family support system with mother and sister actively involved. Has a supportive boyfriend who visits regularly. Limited friend network but quality relationships with case workers from previous programs.',
    'SSI Disability Benefits - $943/month',
    '["state_id", "ssn_card", "medical_card"]',
    'Can provide housing voucher assistance, transportation vouchers, mental health counseling referrals, job training programs, and benefits advocacy support.',
    'Sarah Johnson, LCSW',
    'Continue mental health services, assist with permanent housing placement, provide vocational assessment for possible part-time employment opportunities.',
    'High School Diploma',
    'Part-time employment goal feasible within 6-8 months after housing stability achieved. Client interested in customer service or clerical work.',
    'Anxiety and depression symptoms may interfere with work performance. No significant physical barriers identified.',
    'Will provide job coaching, interview preparation, workplace accommodation assistance, and ongoing mental health support to maintain employment stability.',
    75.5, 'Medium', 'Moderate', 'Strong', 2, 3, 1,
    '2025-07-15', '2025-08-15', 1,
    'system@example.com', 'system@example.com'
),
(
    'CLIENT-002',
    'Client experiencing housing instability and financial stress. Currently staying in temporary shelter. Has reliable transportation via public transit. Medical conditions well-managed with medication.',
    'Limited family support due to geographic distance. Has developed positive relationships with shelter staff and peer support groups. Actively participates in AA meetings.',
    'Part-time employment - $800/month',
    '["drivers_license", "ssn_card"]',
    'Housing assistance, financial counseling, job placement services, healthcare coordination, substance abuse support services.',
    'Michael Rodriguez, MSW',
    'Prioritize permanent housing placement, increase work hours or find additional employment, maintain sobriety support systems.',
    'Some College',
    'Full-time employment goal realistic within 3-4 months with appropriate support. Client has construction experience and strong work ethic.',
    'History of substance abuse (6 months sober). Some physical limitations from previous injury affecting heavy lifting.',
    'Provide employment coaching, sobriety support coordination, accommodate physical limitations in job placement, and offer ongoing case management.',
    68.0, 'Medium', 'High', 'Moderate', 1, 4, 2,
    '2025-07-10', '2025-08-10', 0,
    'system@example.com', 'system@example.com'
),
(
    'CLIENT-003',
    'Client has been homeless for extended period. Significant mental health challenges with medication compliance issues. No stable income source. Limited transportation access.',
    'Estranged from family. Few social connections. Recently began working with mental health provider. Resistant to some services but engaging with street outreach team.',
    'None currently - applying for benefits',
    '["birth_certificate"]',
    'Mental health services, benefits assistance, medication management, basic needs support, gradual housing placement.',
    'Lisa Chen, LMHC',
    'Stabilize mental health treatment, establish benefits, provide basic needs support, work toward transitional housing when ready.',
    'Did not complete High School',
    'Employment goals not feasible at this time. Focus should be on stabilization and basic needs. Reassess in 6 months.',
    'Severe mental illness with psychotic episodes. Medication compliance issues. Limited literacy skills. Trust issues with service providers.',
    'Intensive case management, medication monitoring, trauma-informed care approach, basic education support, and gradual engagement building.',
    32.0, 'High', 'Low', 'Weak', 0, 1, 5,
    '2025-07-05', '2025-07-19', 0,
    'system@example.com', 'system@example.com'
);

-- =============================================
-- Verify Installation
-- =============================================

-- Check table creation
SELECT 'IDTCaseManager table created successfully' AS Status
WHERE EXISTS (SELECT * FROM sys.tables WHERE name = 'IDTCaseManager');

-- Check view creation
SELECT 'Views created successfully' AS Status
WHERE EXISTS (SELECT * FROM sys.views WHERE name = 'vw_IDTCaseManagerSummary');

-- Check stored procedure creation
SELECT 'Stored procedures created successfully' AS Status
WHERE EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_GetIDTCaseManagerProfile');

-- Check sample data
SELECT 'Sample data inserted - ' + CAST(COUNT(*) AS NVARCHAR(10)) + ' records' AS Status
FROM dbo.IDTCaseManager;

-- Display sample summary data
SELECT TOP 3
    clientID,
    idtHfhCM,
    riskLevel,
    readinessLevel,
    completionPercentage,
    followUpStatus
FROM vw_IDTCaseManagerSummary
ORDER BY updatedAt DESC;

PRINT 'IDT Case Manager database schema installation completed successfully!';
PRINT 'Tables: IDTCaseManager';
PRINT 'Views: vw_IDTCaseManagerSummary, vw_IDTRiskAssessment, vw_IDTProgressTracking';
PRINT 'Procedures: sp_GetIDTCaseManagerProfile, sp_CalculateIDTRiskScore, sp_UpdateIDTProgress';