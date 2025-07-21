-- =============================================
-- Nursing Admission Database Schema
-- Complete SQL setup for Nursing Admission system
-- =============================================

-- Drop existing objects if they exist (for clean re-creation)
IF OBJECT_ID('dbo.sp_GetAdmissionProfile', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetAdmissionProfile;

IF OBJECT_ID('dbo.sp_GenerateAdmissionReport', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GenerateAdmissionReport;

IF OBJECT_ID('dbo.sp_UpdateVitalSigns', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_UpdateVitalSigns;

IF OBJECT_ID('dbo.sp_CalculateADLScore', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CalculateADLScore;

IF OBJECT_ID('dbo.vw_NursingAdmissionSummary', 'V') IS NOT NULL
    DROP VIEW dbo.vw_NursingAdmissionSummary;

IF OBJECT_ID('dbo.vw_VitalSignsTrends', 'V') IS NOT NULL
    DROP VIEW dbo.vw_VitalSignsTrends;

IF OBJECT_ID('dbo.vw_ADLAssessment', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ADLAssessment;

IF OBJECT_ID('dbo.vw_BodyInspectionFindings', 'V') IS NOT NULL
    DROP VIEW dbo.vw_BodyInspectionFindings;

IF OBJECT_ID('dbo.NursingAdmission', 'U') IS NOT NULL
    DROP TABLE dbo.NursingAdmission;

-- =============================================
-- Create NursingAdmission Table
-- =============================================
CREATE TABLE dbo.NursingAdmission (
    -- Primary Key
    admissionID INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Client Reference
    clientID NVARCHAR(100) NOT NULL UNIQUE,
    
    -- ===== Basic Assessment =====
    loc NVARCHAR(MAX) NULL, -- JSON array
    orientedToList NVARCHAR(MAX) NULL, -- JSON array
    orientedToRoomList NVARCHAR(MAX) NULL, -- JSON array
    
    -- ===== Cardio-Pulmonary =====
    cpT NVARCHAR(50) NULL, -- Temperature
    cpP NVARCHAR(50) NULL, -- Pulse
    cpR NVARCHAR(50) NULL, -- Respiration
    cpBP NVARCHAR(50) NULL, -- Blood Pressure
    tList NVARCHAR(MAX) NULL, -- JSON array
    pList NVARCHAR(MAX) NULL, -- JSON array
    rList NVARCHAR(MAX) NULL, -- JSON array
    historyOf NVARCHAR(MAX) NULL, -- JSON array
    edema NVARCHAR(MAX) NULL, -- JSON array
    edemaLocation NVARCHAR(500) NULL,
    
    -- ===== Pain Assessment =====
    clientPain NVARCHAR(MAX) NULL, -- JSON array
    painHistory NVARCHAR(MAX) NULL, -- JSON array
    lungSounds NVARCHAR(MAX) NULL, -- JSON array
    
    -- ===== Bowel & Bladder =====
    bowelBladder NVARCHAR(MAX) NULL, -- JSON array
    cathType NVARCHAR(100) NULL,
    cathSize NVARCHAR(100) NULL,
    cathDiag NVARCHAR(500) NULL,
    elimMethUsed NVARCHAR(MAX) NULL, -- JSON array
    lastBowelDate DATE NULL,
    lastVoidDate DATE NULL,
    abdomen NVARCHAR(MAX) NULL, -- JSON array
    
    -- ===== Physical & Functional Status =====
    physicalFuncStat NVARCHAR(MAX) NULL, -- JSON array
    clientPhysicalFuncNotes NVARCHAR(MAX) NULL,
    weightBearing NVARCHAR(MAX) NULL, -- JSON array
    transfers NVARCHAR(MAX) NULL, -- JSON array
    ambulation NVARCHAR(MAX) NULL, -- JSON array
    mobDevices NVARCHAR(MAX) NULL, -- JSON array
    
    -- ===== Nutrition & Communication =====
    nutrHyd NVARCHAR(MAX) NULL, -- JSON array
    enteral NVARCHAR(MAX) NULL, -- JSON array
    oral NVARCHAR(MAX) NULL, -- JSON array
    hearing NVARCHAR(MAX) NULL, -- JSON array
    vision NVARCHAR(MAX) NULL, -- JSON array
    communication NVARCHAR(MAX) NULL, -- JSON array
    
    -- ===== ADL Levels =====
    bathing NVARCHAR(MAX) NULL, -- JSON array
    eating NVARCHAR(MAX) NULL, -- JSON array
    toileting NVARCHAR(MAX) NULL, -- JSON array
    bedMobility NVARCHAR(MAX) NULL, -- JSON array
    
    -- ===== Body Inspection =====
    frontBodyInspection NVARCHAR(MAX) NULL, -- JSON object
    rearBodyInspection NVARCHAR(MAX) NULL, -- JSON object
    
    -- ===== Audit Trail =====
    createdBy NVARCHAR(255) NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedBy NVARCHAR(255) NULL,
    updatedAt DATETIME2 NULL,
    
    -- Constraints
    CONSTRAINT CK_NursingAdmission_ClientID CHECK (LEN(clientID) > 0),
    CONSTRAINT CK_NursingAdmission_Dates CHECK (
        (lastBowelDate IS NULL OR lastBowelDate <= GETDATE()) AND
        (lastVoidDate IS NULL OR lastVoidDate <= GETDATE())
    )
);

-- =============================================
-- Create Indexes for Performance
-- =============================================

-- Primary index on clientID for fast client lookups
CREATE NONCLUSTERED INDEX IX_NursingAdmission_ClientID 
ON dbo.NursingAdmission (clientID, createdAt DESC);

-- Index for date-based queries
CREATE NONCLUSTERED INDEX IX_NursingAdmission_CreatedAt 
ON dbo.NursingAdmission (createdAt DESC)
INCLUDE (clientID, cpT, cpP, cpR, cpBP);

-- Index for vital signs queries
CREATE NONCLUSTERED INDEX IX_NursingAdmission_Vitals 
ON dbo.NursingAdmission (clientID, createdAt DESC)
WHERE cpT IS NOT NULL OR cpP IS NOT NULL OR cpR IS NOT NULL OR cpBP IS NOT NULL;

-- =============================================
-- Sample Data for Testing
-- =============================================
INSERT INTO dbo.NursingAdmission (
    clientID,
    loc, orientedToList, orientedToRoomList,
    cpT, cpP, cpR, cpBP,
    tList, pList, rList,
    historyOf, edema, clientPain, painHistory, lungSounds,
    bowelBladder, elimMethUsed, lastBowelDate, lastVoidDate, abdomen,
    physicalFuncStat, clientPhysicalFuncNotes, weightBearing, transfers, ambulation,
    nutrHyd, enteral, oral, hearing, vision, communication,
    bathing, eating, toileting, bedMobility,
    frontBodyInspection, rearBodyInspection,
    createdBy
) VALUES 
-- Sample admission for CLIENT-123
('CLIENT-123',
 '["Alert"]', '["Person", "Place", "Time"]', '["Room Layout", "Call Bell"]',
 '98.6', '72', '16', '120/80',
 '["Oral"]', '["Regular", "Strong"]', '["Regular", "Unlabored"]',
 '["Hypertension", "Diabetes Type 2"]', '["None"]', '["No Pain"]', '["Chronic back pain - managed"]', '["Clear bilaterally"]',
 '["Independent"]', '["Toilet"]', '2025-07-15', '2025-07-16', '["Soft", "Non-tender"]',
 '["Ambulates independently"]', 'Client demonstrates steady gait and good balance.', '["Full weight bearing"]', '["Independent"]', '["Independent"]',
 '["Independent oral intake"]', '["None"]', '["Regular diet", "Good appetite"]', '["Normal"]', '["Corrected with glasses"]', '["English", "Clear speech"]',
 '["Independent"]', '["Independent"]', '["Independent"]', '["Independent"]',
 '{"clientBodyFace": "Normal appearance, no lesions", "clientBodyChest": "Symmetrical expansion, no deformities", "clientBodyRUQ": "Soft, non-tender"}',
 '{"clientBodyHead": "No abnormalities noted", "clientBodyNeck": "Full range of motion", "clientBodyUB": "Normal spine alignment"}',
 'nurse@hospital.com'),

-- Sample admission for CLIENT-456
('CLIENT-456',
 '["Alert", "Oriented x3"]', '["Person", "Place", "Time"]', '["Room Layout", "Call Bell", "Bathroom"]',
 '99.2', '88', '20', '145/92',
 '["Oral"]', '["Rapid", "Weak"]', '["Shallow", "Labored"]',
 '["COPD", "Heart Disease"]', '["Lower extremities"]', '["Moderate Pain 5/10"]', '["Chronic chest pain"]', '["Wheezes bilateral"]',
 '["Assistance needed"]', '["Bedpan", "Commode"]', '2025-07-13', '2025-07-16', '["Distended", "Tender"]',
 '["Assistance with walking"]', 'Client requires assistance due to shortness of breath.', '["Partial weight bearing"]', '["Two person assist"]', '["Walker"]',
 '["Soft diet with supplements"]', '["None"]', '["Soft diet", "Poor appetite"]', '["Hearing aid"]', '["Glasses"]', '["English", "Some difficulty"]',
 '["Partial assistance"]', '["Assistance needed"]', '["Assistance needed"]', '["Partial assistance"]',
 '{"clientBodyFace": "Pale, diaphoretic", "clientBodyChest": "Increased work of breathing", "clientBodyRUQ": "Tender to palpation"}',
 '{"clientBodyHead": "Normal", "clientBodyNeck": "Limited ROM", "clientBodyUB": "Kyphosis noted"}',
 'nurse2@hospital.com');

-- =============================================
-- Create Views for Reporting and Analytics
-- =============================================

-- View: Complete nursing admission summary
CREATE VIEW dbo.vw_NursingAdmissionSummary AS
SELECT 
    n.admissionID,
    n.clientID,
    n.createdAt as admissionDate,
    n.createdBy as admittingNurse,
    
    -- Basic Assessment Summary
    CASE 
        WHEN JSON_VALUE(n.loc, '$[0]') = 'Alert' THEN 'Alert'
        WHEN JSON_VALUE(n.loc, '$[0]') LIKE '%Confused%' THEN 'Confused'
        ELSE 'Assessment Needed'
    END as locStatus,
    
    -- Vital Signs
    n.cpT as temperature,
    n.cpP as pulse,
    n.cpR as respiration,
    n.cpBP as bloodPressure,
    
    -- Risk Assessment
    CASE 
        WHEN JSON_VALUE(n.historyOf, '$[0]') IS NOT NULL THEN 1 ELSE 0
    END + 
    CASE 
        WHEN JSON_VALUE(n.clientPain, '$[0]') LIKE '%High%' OR JSON_VALUE(n.clientPain, '$[0]') LIKE '%Severe%' THEN 2 ELSE 0
    END +
    CASE 
        WHEN n.cpBP LIKE '%/%' AND (
            TRY_CAST(LEFT(n.cpBP, CHARINDEX('/', n.cpBP) - 1) AS INT) > 140 OR
            TRY_CAST(RIGHT(n.cpBP, LEN(n.cpBP) - CHARINDEX('/', n.cpBP)) AS INT) > 90
        ) THEN 1 ELSE 0
    END as riskScore,
    
    -- ADL Independence (simplified calculation)
    CASE 
        WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Independent%' AND
             JSON_VALUE(n.eating, '$[0]') LIKE '%Independent%' AND
             JSON_VALUE(n.toileting, '$[0]') LIKE '%Independent%' AND
             JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Independent%' 
        THEN 'Fully Independent'
        WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Assistance%' OR
             JSON_VALUE(n.eating, '$[0]') LIKE '%Assistance%' OR
             JSON_VALUE(n.toileting, '$[0]') LIKE '%Assistance%' OR
             JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Assistance%'
        THEN 'Partial Independence'
        ELSE 'Dependent'
    END as adlStatus,
    
    -- Follow-up Requirements
    CASE 
        WHEN JSON_VALUE(n.clientPain, '$[0]') LIKE '%High%' OR
             JSON_VALUE(n.clientPain, '$[0]') LIKE '%Severe%' OR
             n.cathType IS NOT NULL AND n.cathType != '' OR
             JSON_VALUE(n.edema, '$[0]') != 'None'
        THEN 1 ELSE 0
    END as requiresFollowUp,
    
    n.updatedAt as lastUpdated,
    n.updatedBy as lastUpdatedBy
FROM dbo.NursingAdmission n;

-- View: Vital signs trends
CREATE VIEW dbo.vw_VitalSignsTrends AS
SELECT 
    n.clientID,
    n.admissionID,
    CAST(n.createdAt AS DATE) as measurementDate,
    n.cpT as temperature,
    n.cpP as pulse,
    n.cpR as respiration,
    n.cpBP as bloodPressure,
    
    -- Vital signs interpretation
    CASE 
        WHEN TRY_CAST(n.cpT AS FLOAT) < 97.0 THEN 'Hypothermic'
        WHEN TRY_CAST(n.cpT AS FLOAT) > 100.4 THEN 'Febrile'
        ELSE 'Normal'
    END as temperatureStatus,
    
    CASE 
        WHEN TRY_CAST(n.cpP AS INT) < 60 THEN 'Bradycardic'
        WHEN TRY_CAST(n.cpP AS INT) > 100 THEN 'Tachycardic'
        ELSE 'Normal'
    END as pulseStatus,
    
    CASE 
        WHEN TRY_CAST(n.cpR AS INT) < 12 THEN 'Bradypneic'
        WHEN TRY_CAST(n.cpR AS INT) > 20 THEN 'Tachypneic'
        ELSE 'Normal'
    END as respirationStatus,
    
    CASE 
        WHEN n.cpBP LIKE '%/%' AND (
            TRY_CAST(LEFT(n.cpBP, CHARINDEX('/', n.cpBP) - 1) AS INT) > 140 OR
            TRY_CAST(RIGHT(n.cpBP, LEN(n.cpBP) - CHARINDEX('/', n.cpBP)) AS INT) > 90
        ) THEN 'Hypertensive'
        WHEN n.cpBP LIKE '%/%' AND (
            TRY_CAST(LEFT(n.cpBP, CHARINDEX('/', n.cpBP) - 1) AS INT) < 90 OR
            TRY_CAST(RIGHT(n.cpBP, LEN(n.cpBP) - CHARINDEX('/', n.cpBP)) AS INT) < 60
        ) THEN 'Hypotensive'
        ELSE 'Normal'
    END as bpStatus,
    
    n.createdAt,
    n.createdBy
FROM dbo.NursingAdmission n
WHERE n.cpT IS NOT NULL OR n.cpP IS NOT NULL OR n.cpR IS NOT NULL OR n.cpBP IS NOT NULL;

-- View: ADL assessment analysis
CREATE VIEW dbo.vw_ADLAssessment AS
SELECT 
    n.clientID,
    n.admissionID,
    
    -- Individual ADL scores (4=Independent, 3=Supervised, 2=Partial, 1=Dependent)
    CASE 
        WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Independent%' THEN 4
        WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Supervised%' THEN 3
        WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Partial%' THEN 2
        ELSE 1
    END as bathingScore,
    
    CASE 
        WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Independent%' THEN 4
        WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Supervised%' THEN 3
        WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Partial%' THEN 2
        ELSE 1
    END as eatingScore,
    
    CASE 
        WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Independent%' THEN 4
        WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Supervised%' THEN 3
        WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Partial%' THEN 2
        ELSE 1
    END as toiletingScore,
    
    CASE 
        WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Independent%' THEN 4
        WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Supervised%' THEN 3
        WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Partial%' THEN 2
        ELSE 1
    END as bedMobilityScore,
    
    -- Total ADL Score (16 = Fully Independent, 4 = Fully Dependent)
    (CASE 
        WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Independent%' THEN 4
        WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Supervised%' THEN 3
        WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Partial%' THEN 2
        ELSE 1
    END +
    CASE 
        WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Independent%' THEN 4
        WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Supervised%' THEN 3
        WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Partial%' THEN 2
        ELSE 1
    END +
    CASE 
        WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Independent%' THEN 4
        WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Supervised%' THEN 3
        WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Partial%' THEN 2
        ELSE 1
    END +
    CASE 
        WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Independent%' THEN 4
        WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Supervised%' THEN 3
        WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Partial%' THEN 2
        ELSE 1
    END) as totalADLScore,
    
    -- ADL Classification
    CASE 
        WHEN (CASE 
            WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END +
        CASE 
            WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END +
        CASE 
            WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END +
        CASE 
            WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END) >= 15 THEN 'Fully Independent'
        WHEN (CASE 
            WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END +
        CASE 
            WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END +
        CASE 
            WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END +
        CASE 
            WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END) >= 10 THEN 'Mostly Independent'
        WHEN (CASE 
            WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.bathing, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END +
        CASE 
            WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.eating, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END +
        CASE 
            WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.toileting, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END +
        CASE 
            WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Independent%' THEN 4
            WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Supervised%' THEN 3
            WHEN JSON_VALUE(n.bedMobility, '$[0]') LIKE '%Partial%' THEN 2
            ELSE 1
        END) >= 6 THEN 'Partially Dependent'
        ELSE 'Fully Dependent'
    END as adlClassification,
    
    n.createdAt,
    n.createdBy
FROM dbo.NursingAdmission n;

-- View: Body inspection findings summary
CREATE VIEW dbo.vw_BodyInspectionFindings AS
SELECT 
    n.clientID,
    n.admissionID,
    
    -- Count of body areas with findings
    (
        CASE WHEN JSON_VALUE(n.frontBodyInspection, '$.clientBodyFace') IS NOT NULL AND JSON_VALUE(n.frontBodyInspection, '$.clientBodyFace') != '' THEN 1 ELSE 0 END +
        CASE WHEN JSON_VALUE(n.frontBodyInspection, '$.clientBodyChest') IS NOT NULL AND JSON_VALUE(n.frontBodyInspection, '$.clientBodyChest') != '' THEN 1 ELSE 0 END +
        CASE WHEN JSON_VALUE(n.rearBodyInspection, '$.clientBodyHead') IS NOT NULL AND JSON_VALUE(n.rearBodyInspection, '$.clientBodyHead') != '' THEN 1 ELSE 0 END +
        CASE WHEN JSON_VALUE(n.rearBodyInspection, '$.clientBodyNeck') IS NOT NULL AND JSON_VALUE(n.rearBodyInspection, '$.clientBodyNeck') != '' THEN 1 ELSE 0 END
    ) as totalFindingsCount,
    
    -- Specific findings
    JSON_VALUE(n.frontBodyInspection, '$.clientBodyFace') as faceFindings,
    JSON_VALUE(n.frontBodyInspection, '$.clientBodyChest') as chestFindings,
    JSON_VALUE(n.frontBodyInspection, '$.clientBodyRUQ') as ruqFindings,
    JSON_VALUE(n.rearBodyInspection, '$.clientBodyHead') as headFindings,
    JSON_VALUE(n.rearBodyInspection, '$.clientBodyNeck') as neckFindings,
    JSON_VALUE(n.rearBodyInspection, '$.clientBodyUB') as upperBackFindings,
    
    -- Assessment completeness
    CASE 
        WHEN n.frontBodyInspection IS NOT NULL AND n.rearBodyInspection IS NOT NULL 
        THEN 'Complete'
        WHEN n.frontBodyInspection IS NOT NULL OR n.rearBodyInspection IS NOT NULL 
        THEN 'Partial'
        ELSE 'Not Completed'
    END as inspectionCompleteness,
    
    n.createdAt,
    n.createdBy
FROM dbo.NursingAdmission n;

-- =============================================
-- Stored Procedures
-- =============================================

-- Procedure: Get complete client admission profile
CREATE PROCEDURE dbo.sp_GetAdmissionProfile
    @ClientID NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Client admission summary
    SELECT 
        @ClientID as clientID,
        COUNT(*) as totalAdmissions,
        MAX(createdAt) as lastAdmissionDate,
        MIN(createdAt) as firstAdmissionDate,
        COUNT(CASE WHEN JSON_VALUE(historyOf, '$[0]') IS NOT NULL THEN 1 END) as withMedicalHistory,
        COUNT(CASE WHEN JSON_VALUE(clientPain, '$[0]') LIKE '%Pain%' THEN 1 END) as withPainIssues
    FROM dbo.NursingAdmission 
    WHERE clientID = @ClientID;
    
    -- Latest admission details
    SELECT TOP 1 *
    FROM dbo.vw_NursingAdmissionSummary 
    WHERE clientID = @ClientID
    ORDER BY admissionDate DESC;
    
    -- ADL trends
    SELECT *
    FROM dbo.vw_ADLAssessment 
    WHERE clientID = @ClientID
    ORDER BY createdAt DESC;
    
    -- Vital signs history
    SELECT TOP 10 *
    FROM dbo.vw_VitalSignsTrends 
    WHERE clientID = @ClientID
    ORDER BY measurementDate DESC, createdAt DESC;
END;

-- Procedure: Generate comprehensive admission report
CREATE PROCEDURE dbo.sp_GenerateAdmissionReport
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
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
        @ClientFilter as clientFilter,
        GETDATE() as reportGeneratedAt;
    
    -- Summary statistics
    SELECT 
        COUNT(*) as totalAdmissions,
        COUNT(DISTINCT clientID) as uniqueClients,
        COUNT(DISTINCT createdBy) as nursingStaff,
        AVG(CAST(riskScore AS FLOAT)) as avgRiskScore,
        COUNT(CASE WHEN requiresFollowUp = 1 THEN 1 END) as requireFollowUp,
        COUNT(CASE WHEN adlStatus = 'Fully Independent' THEN 1 END) as fullyIndependent,
        COUNT(CASE WHEN adlStatus = 'Dependent' THEN 1 END) as dependent
    FROM dbo.vw_NursingAdmissionSummary 
    WHERE admissionDate BETWEEN @StartDate AND @EndDate
      AND (@ClientFilter IS NULL OR clientID = @ClientFilter);
    
    -- ADL distribution
    SELECT 
        adlStatus,
        COUNT(*) as admissionCount,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
    FROM dbo.vw_NursingAdmissionSummary 
    WHERE admissionDate BETWEEN @StartDate AND @EndDate
      AND (@ClientFilter IS NULL OR clientID = @ClientFilter)
    GROUP BY adlStatus
    ORDER BY admissionCount DESC;
    
    -- Risk assessment summary
    SELECT 
        CASE 
            WHEN riskScore >= 4 THEN 'High Risk'
            WHEN riskScore >= 2 THEN 'Moderate Risk'
            ELSE 'Low Risk'
        END as riskCategory,
        COUNT(*) as admissionCount,
        AVG(CAST(riskScore AS FLOAT)) as avgScore
    FROM dbo.vw_NursingAdmissionSummary 
    WHERE admissionDate BETWEEN @StartDate AND @EndDate
      AND (@ClientFilter IS NULL OR clientID = @ClientFilter)
    GROUP BY 
        CASE 
            WHEN riskScore >= 4 THEN 'High Risk'
            WHEN riskScore >= 2 THEN 'Moderate Risk'
            ELSE 'Low Risk'
        END
    ORDER BY avgScore DESC;
END;

-- Procedure: Update vital signs only
CREATE PROCEDURE dbo.sp_UpdateVitalSigns
    @ClientID NVARCHAR(100),
    @Temperature NVARCHAR(50) = NULL,
    @Pulse NVARCHAR(50) = NULL,
    @Respiration NVARCHAR(50) = NULL,
    @BloodPressure NVARCHAR(50) = NULL,
    @UpdatedBy NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.NursingAdmission 
    SET 
        cpT = ISNULL(@Temperature, cpT),
        cpP = ISNULL(@Pulse, cpP),
        cpR = ISNULL(@Respiration, cpR),
        cpBP = ISNULL(@BloodPressure, cpBP),
        updatedBy = @UpdatedBy,
        updatedAt = GETDATE()
    WHERE clientID = @ClientID;
    
    SELECT @@ROWCOUNT as rowsUpdated;
END;

-- Procedure: Calculate ADL Score
CREATE PROCEDURE dbo.sp_CalculateADLScore
    @ClientID NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        clientID,
        bathingScore,
        eatingScore,
        toiletingScore,
        bedMobilityScore,
        totalADLScore,
        adlClassification,
        CASE 
            WHEN totalADLScore >= 15 THEN 'Excellent'
            WHEN totalADLScore >= 12 THEN 'Good'
            WHEN totalADLScore >= 8 THEN 'Fair'
            ELSE 'Poor'
        END as functionalStatus
    FROM dbo.vw_ADLAssessment 
    WHERE clientID = @ClientID
    ORDER BY createdAt DESC;
END;

-- =============================================
-- Grant Permissions (adjust as needed for your security model)
-- =============================================

-- Grant execute permissions on stored procedures
-- GRANT EXECUTE ON dbo.sp_GetAdmissionProfile TO [YourAppRole];
-- GRANT EXECUTE ON dbo.sp_GenerateAdmissionReport TO [YourAdminRole];
-- GRANT EXECUTE ON dbo.sp_UpdateVitalSigns TO [YourNurseRole];
-- GRANT EXECUTE ON dbo.sp_CalculateADLScore TO [YourAppRole];

-- Grant select permissions on views
-- GRANT SELECT ON dbo.vw_NursingAdmissionSummary TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_VitalSignsTrends TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_ADLAssessment TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_BodyInspectionFindings TO [YourAppRole];

-- =============================================
-- Test the Installation
-- =============================================

-- Test basic functionality
SELECT 'Nursing Admission table created successfully' as status;
SELECT COUNT(*) as sampleRecordsInserted FROM dbo.NursingAdmission;

-- Test views
SELECT 'Summary view test:' as test;
SELECT TOP 5 * FROM dbo.vw_NursingAdmissionSummary ORDER BY admissionDate DESC;

SELECT 'Vital signs view test:' as test;
SELECT * FROM dbo.vw_VitalSignsTrends;

SELECT 'ADL assessment view test:' as test;
SELECT * FROM dbo.vw_ADLAssessment;

SELECT 'Body inspection view test:' as test;
SELECT * FROM dbo.vw_BodyInspectionFindings;

-- Test stored procedures
EXEC dbo.sp_GetAdmissionProfile @ClientID = 'CLIENT-123';
EXEC dbo.sp_CalculateADLScore @ClientID = 'CLIENT-123';
EXEC dbo.sp_GenerateAdmissionReport;

PRINT 'Nursing Admission database setup completed successfully!';
PRINT 'Ready for integration with the Nursing Admission application.';