-- ========================================
-- IDT Provider Note Database Schema
-- ========================================

-- Drop existing objects if they exist (for updates)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_IDTProviderSummary')
    DROP VIEW vw_IDTProviderSummary;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ConsultationTracking')
    DROP VIEW vw_ConsultationTracking;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_DischargeReadiness')
    DROP VIEW vw_DischargeReadiness;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_LengthOfStayAnalysis')
    DROP VIEW vw_LengthOfStayAnalysis;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_CareTeamCoordination')
    DROP VIEW vw_CareTeamCoordination;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_GetIDTProfile' AND type = 'P')
    DROP PROCEDURE sp_GetIDTProfile;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_GenerateIDTReport' AND type = 'P')
    DROP PROCEDURE sp_GenerateIDTReport;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_UpdateConsultationStatus' AND type = 'P')
    DROP PROCEDURE sp_UpdateConsultationStatus;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_CalculateComplexityScore' AND type = 'P')
    DROP PROCEDURE sp_CalculateComplexityScore;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_DischargeReadinessCheck' AND type = 'P')
    DROP PROCEDURE sp_DischargeReadinessCheck;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'IDTProviderNote')
    DROP TABLE IDTProviderNote;

-- ========================================
-- CREATE TABLE: IDTProviderNote
-- ========================================

CREATE TABLE dbo.IDTProviderNote (
    -- Primary Key
    idtID INT IDENTITY(1,1) PRIMARY KEY,
    clientID NVARCHAR(50) NOT NULL,
    
    -- Hospital & Admission Information
    idtHospital NVARCHAR(200) NULL,
    idtAdmitDate DATE NULL,
    idtProviderName NVARCHAR(100) NULL,
    idtProviderRole NVARCHAR(50) NULL,
    
    -- Clinical Assessment
    idtDiag NVARCHAR(MAX) NULL,               -- Diagnosis and H&P pertinent
    idtProblems NVARCHAR(MAX) NULL,           -- Problems member having with life
    idtPriority NVARCHAR(MAX) NULL,           -- Priority problems for member
    idtFunctionalStatus NVARCHAR(MAX) NULL,   -- Functional assessment
    
    -- Consultation Management
    idtConsults NVARCHAR(MAX) NULL,           -- Consults being placed
    idtNoConsults NVARCHAR(MAX) NULL,         -- Alternative consult options
    idtConsultationStatus NVARCHAR(MAX) NULL, -- JSON: Status tracking for consults
    idtConsultationDates NVARCHAR(MAX) NULL,  -- JSON: Dates for consultations
    
    -- Discharge Planning
    idtPlans NVARCHAR(MAX) NULL,              -- Discharge plans for member
    idtDischarge NVARCHAR(MAX) NULL,          -- Barriers to discharge
    idtDischargeTarget DATE NULL,             -- Target discharge date
    idtDischargeReadiness NVARCHAR(50) NULL,  -- Readiness assessment
    
    -- Medical Clearance
    idtPatientClear NVARCHAR(20) NULL,        -- Yes/No/Pending
    idtPatientClearDate DATE NULL,            -- Date cleared
    idtPatientClearBy NVARCHAR(100) NULL,     -- Who cleared patient
    idtPatientClearNotes NVARCHAR(MAX) NULL,  -- Clearance notes
    
    -- Care Coordination
    idtCareTeam NVARCHAR(MAX) NULL,           -- JSON: Care team members
    idtGoals NVARCHAR(MAX) NULL,              -- Treatment goals
    idtInterventions NVARCHAR(MAX) NULL,      -- Planned interventions
    idtOutcomes NVARCHAR(MAX) NULL,           -- Expected outcomes
    
    -- Quality Metrics
    idtLengthOfStay INT NULL,                 -- Current LOS
    idtTargetLOS INT NULL,                    -- Target LOS
    idtComplexityScore INT NULL,              -- Case complexity (1-10)
    idtRiskLevel NVARCHAR(20) NULL,           -- Low/Medium/High/Critical
    
    -- Follow-up & Monitoring
    idtNextReview DATE NULL,                  -- Next IDT review date
    idtFollowUpNeeded NVARCHAR(MAX) NULL,     -- Follow-up requirements
    idtMonitoringPlan NVARCHAR(MAX) NULL,     -- Monitoring strategy
    
    -- Audit Fields
    createdBy NVARCHAR(100) NOT NULL DEFAULT 'System',
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(100) NOT NULL DEFAULT 'System',
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT CHK_IDT_ComplexityScore CHECK (idtComplexityScore BETWEEN 1 AND 10),
    CONSTRAINT CHK_IDT_LengthOfStay CHECK (idtLengthOfStay >= 0),
    CONSTRAINT CHK_IDT_TargetLOS CHECK (idtTargetLOS >= 0),
    CONSTRAINT CHK_IDT_RiskLevel CHECK (idtRiskLevel IN ('Low', 'Medium', 'High', 'Critical')),
    CONSTRAINT CHK_IDT_DischargeReadiness CHECK (idtDischargeReadiness IN ('Not Ready', 'Needs Planning', 'Nearly Ready', 'Ready', 'Discharged')),
    CONSTRAINT CHK_IDT_PatientClear CHECK (idtPatientClear IN ('Yes', 'No', 'Pending'))
);

-- ========================================
-- CREATE INDEXES
-- ========================================

-- Primary lookup index
CREATE NONCLUSTERED INDEX IX_IDTProviderNote_ClientID 
ON dbo.IDTProviderNote (clientID);

-- Date-based indexes for reporting
CREATE NONCLUSTERED INDEX IX_IDTProviderNote_CreatedAt 
ON dbo.IDTProviderNote (createdAt DESC);

CREATE NONCLUSTERED INDEX IX_IDTProviderNote_AdmitDate 
ON dbo.IDTProviderNote (idtAdmitDate);

CREATE NONCLUSTERED INDEX IX_IDTProviderNote_DischargeTarget 
ON dbo.IDTProviderNote (idtDischargeTarget);

-- Quality metrics indexes
CREATE NONCLUSTERED INDEX IX_IDTProviderNote_ComplexityScore 
ON dbo.IDTProviderNote (idtComplexityScore);

CREATE NONCLUSTERED INDEX IX_IDTProviderNote_RiskLevel 
ON dbo.IDTProviderNote (idtRiskLevel);

-- Provider and hospital indexes
CREATE NONCLUSTERED INDEX IX_IDTProviderNote_Provider 
ON dbo.IDTProviderNote (idtProviderName, idtProviderRole);

CREATE NONCLUSTERED INDEX IX_IDTProviderNote_Hospital 
ON dbo.IDTProviderNote (idtHospital);

-- Composite index for common queries
CREATE NONCLUSTERED INDEX IX_IDTProviderNote_ClientID_CreatedAt 
ON dbo.IDTProviderNote (clientID, createdAt DESC);

-- ========================================
-- CREATE VIEWS
-- ========================================

-- Complete IDT overview with metrics
CREATE VIEW vw_IDTProviderSummary AS
SELECT 
    i.idtID,
    i.clientID,
    i.idtHospital,
    i.idtAdmitDate,
    i.idtProviderName,
    i.idtProviderRole,
    i.idtComplexityScore,
    i.idtRiskLevel,
    i.idtLengthOfStay,
    i.idtTargetLOS,
    CASE 
        WHEN i.idtLengthOfStay IS NOT NULL AND i.idtTargetLOS IS NOT NULL 
        THEN i.idtLengthOfStay - i.idtTargetLOS
        ELSE NULL
    END AS losVariance,
    i.idtDischargeReadiness,
    i.idtDischargeTarget,
    i.idtPatientClear,
    i.idtPatientClearDate,
    CASE 
        WHEN i.idtComplexityScore BETWEEN 1 AND 3 THEN 'Low'
        WHEN i.idtComplexityScore BETWEEN 4 AND 6 THEN 'Medium'
        WHEN i.idtComplexityScore BETWEEN 7 AND 10 THEN 'High'
        ELSE 'Unknown'
    END AS complexityCategory,
    DATEDIFF(DAY, i.createdAt, GETDATE()) AS daysSinceAssessment,
    i.createdBy,
    i.createdAt,
    i.updatedBy,
    i.updatedAt
FROM dbo.IDTProviderNote i;

-- Active consultations and status
CREATE VIEW vw_ConsultationTracking AS
SELECT 
    i.idtID,
    i.clientID,
    i.idtProviderName,
    i.idtConsults,
    i.idtNoConsults,
    CASE 
        WHEN i.idtConsults IS NOT NULL AND LEN(TRIM(i.idtConsults)) > 0 THEN 'Active'
        WHEN i.idtNoConsults IS NOT NULL AND LEN(TRIM(i.idtNoConsults)) > 0 THEN 'Alternatives Identified'
        ELSE 'No Consultations'
    END AS consultationStatus,
    LEN(i.idtConsults) - LEN(REPLACE(i.idtConsults, ',', '')) + 1 AS consultationCount,
    i.createdAt as consultationDate
FROM dbo.IDTProviderNote i
WHERE i.idtConsults IS NOT NULL OR i.idtNoConsults IS NOT NULL;

-- Discharge planning status
CREATE VIEW vw_DischargeReadiness AS
SELECT 
    i.idtID,
    i.clientID,
    i.idtProviderName,
    i.idtDischargeReadiness,
    i.idtDischargeTarget,
    i.idtDischarge as dischargeBarriers,
    i.idtPlans as dischargePlans,
    i.idtPatientClear,
    i.idtPatientClearDate,
    CASE 
        WHEN i.idtDischargeTarget IS NOT NULL AND i.idtDischargeTarget < GETDATE() 
        THEN 'Overdue'
        WHEN i.idtDischargeTarget IS NOT NULL AND i.idtDischargeTarget <= DATEADD(DAY, 3, GETDATE()) 
        THEN 'Due Soon'
        WHEN i.idtDischargeTarget IS NOT NULL 
        THEN 'On Track'
        ELSE 'No Target Set'
    END AS dischargeTimingStatus,
    DATEDIFF(DAY, GETDATE(), i.idtDischargeTarget) AS daysToDischarge,
    i.createdAt
FROM dbo.IDTProviderNote i;

-- Length of stay analysis
CREATE VIEW vw_LengthOfStayAnalysis AS
SELECT 
    i.idtID,
    i.clientID,
    i.idtHospital,
    i.idtProviderName,
    i.idtLengthOfStay,
    i.idtTargetLOS,
    i.idtComplexityScore,
    i.idtRiskLevel,
    CASE 
        WHEN i.idtLengthOfStay IS NOT NULL AND i.idtTargetLOS IS NOT NULL 
        THEN i.idtLengthOfStay - i.idtTargetLOS
        ELSE NULL
    END AS losVariance,
    CASE 
        WHEN i.idtLengthOfStay IS NOT NULL AND i.idtTargetLOS IS NOT NULL AND i.idtLengthOfStay > i.idtTargetLOS 
        THEN 'Over Target'
        WHEN i.idtLengthOfStay IS NOT NULL AND i.idtTargetLOS IS NOT NULL AND i.idtLengthOfStay <= i.idtTargetLOS 
        THEN 'On Target'
        ELSE 'No Target'
    END AS losStatus,
    i.idtAdmitDate,
    i.createdAt
FROM dbo.IDTProviderNote i
WHERE i.idtLengthOfStay IS NOT NULL;

-- Care team coordination
CREATE VIEW vw_CareTeamCoordination AS
SELECT 
    i.idtID,
    i.clientID,
    i.idtProviderName,
    i.idtProviderRole,
    i.idtGoals,
    i.idtInterventions,
    i.idtOutcomes,
    i.idtNextReview,
    i.idtFollowUpNeeded,
    i.idtMonitoringPlan,
    CASE 
        WHEN i.idtNextReview IS NOT NULL AND i.idtNextReview < GETDATE() 
        THEN 'Review Overdue'
        WHEN i.idtNextReview IS NOT NULL AND i.idtNextReview <= DATEADD(DAY, 7, GETDATE()) 
        THEN 'Review Due Soon'
        WHEN i.idtNextReview IS NOT NULL 
        THEN 'Review Scheduled'
        ELSE 'No Review Scheduled'
    END AS reviewStatus,
    i.createdAt
FROM dbo.IDTProviderNote i;

-- ========================================
-- CREATE STORED PROCEDURES
-- ========================================

-- Get complete client IDT profile
CREATE PROCEDURE sp_GetIDTProfile
    @ClientID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        i.*,
        s.complexityCategory,
        s.losVariance,
        s.daysSinceAssessment,
        d.dischargeTimingStatus,
        d.daysToDischarge,
        c.consultationStatus,
        c.consultationCount
    FROM dbo.IDTProviderNote i
    LEFT JOIN vw_IDTProviderSummary s ON i.idtID = s.idtID
    LEFT JOIN vw_DischargeReadiness d ON i.idtID = d.idtID
    LEFT JOIN vw_ConsultationTracking c ON i.idtID = c.idtID
    WHERE i.clientID = @ClientID
    ORDER BY i.createdAt DESC;
END;

-- Generate comprehensive IDT reports
CREATE PROCEDURE sp_GenerateIDTReport
    @ClientID NVARCHAR(50) = NULL,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @Hospital NVARCHAR(200) = NULL,
    @Provider NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        s.*,
        d.dischargeTimingStatus,
        d.daysToDischarge,
        c.consultationStatus,
        l.losStatus
    FROM vw_IDTProviderSummary s
    LEFT JOIN vw_DischargeReadiness d ON s.idtID = d.idtID
    LEFT JOIN vw_ConsultationTracking c ON s.idtID = c.idtID
    LEFT JOIN vw_LengthOfStayAnalysis l ON s.idtID = l.idtID
    WHERE (@ClientID IS NULL OR s.clientID = @ClientID)
      AND (@StartDate IS NULL OR s.createdAt >= @StartDate)
      AND (@EndDate IS NULL OR s.createdAt <= @EndDate)
      AND (@Hospital IS NULL OR s.idtHospital = @Hospital)
      AND (@Provider IS NULL OR s.idtProviderName = @Provider)
    ORDER BY s.createdAt DESC;
END;

-- Update consultation status
CREATE PROCEDURE sp_UpdateConsultationStatus
    @IDTID INT,
    @ConsultationStatus NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.IDTProviderNote 
    SET idtConsultationStatus = @ConsultationStatus,
        updatedAt = GETDATE()
    WHERE idtID = @IDTID;
    
    SELECT @@ROWCOUNT AS RowsAffected;
END;

-- Calculate case complexity score
CREATE PROCEDURE sp_CalculateComplexityScore
    @IDTID INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ComplexityScore INT = 1;
    DECLARE @DiagnosisComplexity INT = 1;
    DECLARE @ConsultationComplexity INT = 1;
    DECLARE @DischargeComplexity INT = 1;
    
    SELECT 
        @DiagnosisComplexity = CASE 
            WHEN LEN(idtDiag) > 200 THEN 3
            WHEN LEN(idtDiag) > 100 THEN 2
            ELSE 1
        END,
        @ConsultationComplexity = CASE 
            WHEN LEN(idtConsults) - LEN(REPLACE(idtConsults, ',', '')) + 1 > 3 THEN 2
            WHEN LEN(idtConsults) > 0 THEN 1
            ELSE 0
        END,
        @DischargeComplexity = CASE 
            WHEN LEN(idtDischarge) > 100 THEN 3
            WHEN LEN(idtDischarge) > 50 THEN 2
            WHEN LEN(idtDischarge) > 0 THEN 1
            ELSE 0
        END
    FROM dbo.IDTProviderNote 
    WHERE idtID = @IDTID;
    
    SET @ComplexityScore = @DiagnosisComplexity + @ConsultationComplexity + @DischargeComplexity;
    SET @ComplexityScore = CASE WHEN @ComplexityScore > 10 THEN 10 ELSE @ComplexityScore END;
    
    UPDATE dbo.IDTProviderNote 
    SET idtComplexityScore = @ComplexityScore,
        updatedAt = GETDATE()
    WHERE idtID = @IDTID;
    
    SELECT @ComplexityScore AS CalculatedComplexityScore;
END;

-- Check discharge readiness
CREATE PROCEDURE sp_DischargeReadinessCheck
    @ClientID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        d.*,
        CASE 
            WHEN d.idtPatientClear = 'Yes' AND d.dischargeBarriers IS NULL THEN 'Ready'
            WHEN d.idtPatientClear = 'Yes' AND d.dischargeBarriers IS NOT NULL THEN 'Barriers Present'
            WHEN d.idtPatientClear = 'Pending' THEN 'Awaiting Clearance'
            WHEN d.idtPatientClear = 'No' THEN 'Not Cleared'
            ELSE 'Assessment Needed'
        END AS readinessAssessment,
        CASE 
            WHEN d.idtPatientClear = 'Yes' AND d.dischargeBarriers IS NULL AND d.dischargePlans IS NOT NULL THEN 1
            ELSE 0
        END AS isReadyForDischarge
    FROM vw_DischargeReadiness d
    WHERE d.clientID = @ClientID
    ORDER BY d.createdAt DESC;
END;

-- ========================================
-- INSERT SAMPLE DATA (Optional)
-- ========================================

-- Uncomment to insert sample data for testing
/*
INSERT INTO dbo.IDTProviderNote (
    clientID, idtHospital, idtAdmitDate, idtProviderName, idtProviderRole,
    idtDiag, idtProblems, idtPriority, idtFunctionalStatus,
    idtConsults, idtNoConsults, idtPlans, idtDischarge,
    idtDischargeReadiness, idtPatientClear, idtComplexityScore, idtRiskLevel,
    idtLengthOfStay, idtTargetLOS, idtGoals, idtInterventions, idtOutcomes,
    createdBy, updatedBy
) VALUES (
    'CLIENT-SAMPLE-001', 'City General Hospital', '2025-07-10', 'Dr. Sarah Johnson', 'Attending Physician',
    'Acute myocardial infarction with complications, diabetes mellitus type 2',
    'Chest pain, shortness of breath, mobility limitations, blood sugar control',
    'Cardiac stabilization, pain management, diabetes control',
    'Limited mobility, requires assistance with ADLs',
    'Cardiology - scheduled, Physical Therapy - pending, Endocrinology - requested',
    'Consider nutrition counseling, social work evaluation',
    'Step-down to telemetry, cardiac rehabilitation referral, diabetes education',
    'Family support arrangements needed, home safety evaluation required',
    'Needs Planning', 'Pending', 7, 'High',
    5, 7, 'Hemodynamic stability, pain control, diabetes management',
    'Cardiac monitoring, medication optimization, patient education',
    'Stable vitals, improved mobility, controlled blood glucose',
    'System', 'System'
);
*/

-- ========================================
-- GRANTS (Update based on your security model)
-- ========================================

-- Grant permissions to application roles
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.IDTProviderNote TO [YourApplicationRole];
-- GRANT SELECT ON vw_IDTProviderSummary TO [YourReportingRole];
-- GRANT SELECT ON vw_ConsultationTracking TO [YourReportingRole];
-- GRANT SELECT ON vw_DischargeReadiness TO [YourReportingRole];
-- GRANT SELECT ON vw_LengthOfStayAnalysis TO [YourReportingRole];
-- GRANT SELECT ON vw_CareTeamCoordination TO [YourReportingRole];

PRINT 'IDT Provider Note database schema created successfully!';
PRINT 'Tables created: IDTProviderNote';
PRINT 'Views created: vw_IDTProviderSummary, vw_ConsultationTracking, vw_DischargeReadiness, vw_LengthOfStayAnalysis, vw_CareTeamCoordination';
PRINT 'Stored procedures created: sp_GetIDTProfile, sp_GenerateIDTReport, sp_UpdateConsultationStatus, sp_CalculateComplexityScore, sp_DischargeReadinessCheck';
PRINT 'Indexes created for optimal performance';
PRINT 'Ready for IDT Provider Note system integration!';