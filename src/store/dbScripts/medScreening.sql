-- ===================================================================
-- Medical Screening Database Table Creation Script
-- ===================================================================

-- Drop table if it exists (for development/testing)
-- IF OBJECT_ID('dbo.MedicalScreening', 'U') IS NOT NULL DROP TABLE dbo.MedicalScreening;

-- ===================================================================
-- MedicalScreening Table - Comprehensive medical screening data
-- ===================================================================

CREATE TABLE dbo.MedicalScreening (
    screeningID INT IDENTITY(1,1) PRIMARY KEY,
    clientID NVARCHAR(50) NOT NULL UNIQUE,
    
    -- Medical Assistance & Conditions
    clientMedConditions NVARCHAR(MAX) NULL,         -- JSON array of medical assistance needs
    clientHepAB NVARCHAR(MAX) NULL,                 -- JSON array of hepatitis diagnoses
    clientAlcoholRisk NVARCHAR(10) NULL,            -- Yes/No for alcohol withdrawal risk
    clientAlcoholRiskMed NVARCHAR(10) NULL,         -- Yes/No for alcohol withdrawal medications
    
    -- Tuberculosis Clearance
    clientLastTBTest DATE NULL,                     -- Date of last TB test
    clientLastTBTestResults NVARCHAR(20) NULL,      -- Positive/Negative/Unknown
    clientLastTBTestResultsTreatment NVARCHAR(10) NULL, -- Yes/No for treatment
    clientLastTBTestResultsTreatmentOutcome NVARCHAR(500) NULL, -- Treatment outcome text
    tbCough NVARCHAR(10) NULL,                      -- Yes/No for cough >3 weeks
    tbCoughBlood NVARCHAR(10) NULL,                 -- Yes/No for coughing blood
    medSweat NVARCHAR(10) NULL,                     -- Yes/No for night sweats
    clientFever NVARCHAR(10) NULL,                  -- Yes/No for high fevers
    clientWeightLoss NVARCHAR(10) NULL,             -- Yes/No for unexplained weight loss
    
    -- Medications & Surgery History
    clientMedications NVARCHAR(MAX) NULL,           -- JSON array of medications
    clientSurgeries NVARCHAR(MAX) NULL,             -- JSON array of surgeries/hospitalizations
    
    -- Women's Health History
    clientBC NVARCHAR(10) NULL,                     -- Yes/No for birth control
    clientBCName NVARCHAR(255) NULL,                -- Name of birth control
    clientBCDate DATE NULL,                         -- Date of last dose
    clientBCLoc NVARCHAR(255) NULL,                 -- Location receiving birth control
    clientBCPreg NVARCHAR(50) NULL,                 -- Total number of pregnancies
    clientBCPregDate DATE NULL,                     -- Date of last pregnancy
    clientBCPap DATE NULL,                          -- Date of last Pap smear
    clientBCMam DATE NULL,                          -- Date of last mammogram
    
    -- Sexual History
    clientSexLastYear NVARCHAR(50) NULL,            -- Number of partners last year
    clientSexLastMonth NVARCHAR(50) NULL,           -- Number of partners last month
    clientLastSexDate DATE NULL,                    -- Date of last sexual activity
    clientSexRelations NVARCHAR(50) NULL,           -- Sexual orientation/relations
    clientRiskFactors NVARCHAR(MAX) NULL,           -- JSON array of risk factors
    clientSTDDate DATE NULL,                        -- Date of last STD test
    clientSTDStatus NVARCHAR(MAX) NULL,             -- JSON array of STD history
    
    -- Audit fields
    createdBy NVARCHAR(255) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(255) NULL,
    updatedAt DATETIME2 NULL
);

-- ===================================================================
-- Create indexes for better performance
-- ===================================================================

CREATE INDEX IX_MedicalScreening_ClientID 
ON dbo.MedicalScreening (clientID);

CREATE INDEX IX_MedicalScreening_CreatedAt 
ON dbo.MedicalScreening (createdAt DESC);

CREATE INDEX IX_MedicalScreening_UpdatedAt 
ON dbo.MedicalScreening (updatedAt DESC);

CREATE INDEX IX_MedicalScreening_TBTest 
ON dbo.MedicalScreening (clientLastTBTest DESC);

CREATE INDEX IX_MedicalScreening_AlcoholRisk 
ON dbo.MedicalScreening (clientAlcoholRisk);

CREATE INDEX IX_MedicalScreening_TBSymptoms 
ON dbo.MedicalScreening (tbCough, tbCoughBlood, medSweat, clientFever, clientWeightLoss);

-- ===================================================================
-- Add constraints
-- ===================================================================

-- Yes/No constraints for various fields
ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_AlcoholRisk 
CHECK (clientAlcoholRisk IN ('Yes', 'No', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_AlcoholRiskMed 
CHECK (clientAlcoholRiskMed IN ('Yes', 'No', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_TBTestResults 
CHECK (clientLastTBTestResults IN ('Positive', 'Negative', 'Unknown', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_TBTreatment 
CHECK (clientLastTBTestResultsTreatment IN ('Yes', 'No', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_TBCough 
CHECK (tbCough IN ('Yes', 'No', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_TBCoughBlood 
CHECK (tbCoughBlood IN ('Yes', 'No', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_MedSweat 
CHECK (medSweat IN ('Yes', 'No', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_ClientFever 
CHECK (clientFever IN ('Yes', 'No', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_WeightLoss 
CHECK (clientWeightLoss IN ('Yes', 'No', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_BC 
CHECK (clientBC IN ('Yes', 'No', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_SexLastYear 
CHECK (clientSexLastYear IN ('None', 'One', '2-5', '6-10', '11 or more', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_SexLastMonth 
CHECK (clientSexLastMonth IN ('None', 'One', '2-5', '6-10', '11 or more', NULL, ''));

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_SexRelations 
CHECK (clientSexRelations IN ('Men', 'Women', 'Both', 'N/A-None', NULL, ''));

-- Date constraints (reasonable date ranges)
ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_TBTestDate 
CHECK (clientLastTBTest >= '1990-01-01' OR clientLastTBTest IS NULL);

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_BCPapDate 
CHECK (clientBCPap >= '1990-01-01' OR clientBCPap IS NULL);

ALTER TABLE dbo.MedicalScreening
ADD CONSTRAINT CK_MedicalScreening_BCMamDate 
CHECK (clientBCMam >= '1990-01-01' OR clientBCMam IS NULL);

-- Foreign key constraint (uncomment if you have a Clients table)
-- ALTER TABLE dbo.MedicalScreening
-- ADD CONSTRAINT FK_MedicalScreening_ClientID 
-- FOREIGN KEY (clientID) REFERENCES dbo.Clients(clientID);

-- ===================================================================
-- Sample data for testing (optional)
-- ===================================================================

/*
INSERT INTO dbo.MedicalScreening (
    clientID, clientMedConditions, clientHepAB, clientAlcoholRisk, clientAlcoholRiskMed,
    clientLastTBTest, clientLastTBTestResults, tbCough, tbCoughBlood, medSweat, 
    clientFever, clientWeightLoss, clientMedications, clientSurgeries,
    clientBC, clientBCPap, clientBCMam, clientSexLastYear, clientSexLastMonth,
    clientSexRelations, clientRiskFactors, clientSTDDate, clientSTDStatus,
    createdBy, createdAt
) VALUES 
(
    'DEMO-001',
    '[{"value":"wheelchair","label":"Wheelchair"},{"value":"walker","label":"Walker"}]',
    '[{"value":"hepatitis_b","label":"Hepatitis B"}]',
    'No', 'No',
    '2024-01-15', 'Negative', 'No', 'No', 'No',
    'No', 'No',
    '[{"clientMedName":"Metformin","clientMedDose":"500mg twice daily","clientMedSideEffects":"Mild nausea","clientMedTaking":"Yes"}]',
    '[{"clientSurgeryType":"Appendectomy","clientSurgeryDate":"2020-05-15"}]',
    'No', '2023-06-10', '2023-08-20', 'One', 'None',
    'Men', '[{"value":"multiple_partners","label":"Multiple partners"}]',
    '2023-06-01', '[{"value":"none","label":"None"}]',
    'demo@example.com', GETDATE()
),
(
    'DEMO-002',
    '[{"value":"hearing_aid","label":"Hearing Aid"}]',
    '[]',
    'Yes', 'Yes',
    '2023-12-01', 'Negative', 'No', 'No', 'No',
    'No', 'No',
    '[{"clientMedName":"Lisinopril","clientMedDose":"10mg daily","clientMedSideEffects":"None","clientMedTaking":"Yes"}]',
    '[]',
    'Yes', '2023-03-15', '2023-07-22', 'None', 'None',
    'Women', '[]',
    '2023-05-15', '[{"value":"chlamydia","label":"Chlamydia - Treated"}]',
    'demo@example.com', GETDATE()
);
*/

-- ===================================================================
-- Views for reporting and analytics
-- ===================================================================

-- View for medical screening summary
CREATE VIEW dbo.vw_MedicalScreeningSummary AS
SELECT 
    ms.clientID,
    ms.screeningID,
    -- Medical assistance summary
    CASE WHEN LEN(ms.clientMedConditions) > 10 THEN 1 ELSE 0 END as hasAssistanceNeeds,
    CASE WHEN LEN(ms.clientHepAB) > 10 THEN 1 ELSE 0 END as hasHepatitisHistory,
    
    -- Risk assessment
    CASE WHEN ms.clientAlcoholRisk = 'Yes' THEN 1 ELSE 0 END as hasAlcoholRisk,
    CASE WHEN ms.clientLastTBTestResults = 'Positive' THEN 1 ELSE 0 END as hasTBRisk,
    CASE WHEN ms.tbCough = 'Yes' OR ms.tbCoughBlood = 'Yes' OR ms.medSweat = 'Yes' 
              OR ms.clientFever = 'Yes' OR ms.clientWeightLoss = 'Yes' THEN 1 ELSE 0 END as hasTBSymptoms,
    
    -- Medication and surgery counts
    LEN(ms.clientMedications) - LEN(REPLACE(ms.clientMedications, '}', '')) as medicationCount,
    LEN(ms.clientSurgeries) - LEN(REPLACE(ms.clientSurgeries, '}', '')) as surgeryCount,
    
    -- Women's health
    CASE WHEN ms.clientBC = 'Yes' THEN 1 ELSE 0 END as onBirthControl,
    CASE WHEN ms.clientBCPap IS NOT NULL AND ms.clientBCPap >= DATEADD(YEAR, -3, GETDATE()) THEN 1 ELSE 0 END as hasRecentPap,
    CASE WHEN ms.clientBCMam IS NOT NULL AND ms.clientBCMam >= DATEADD(YEAR, -2, GETDATE()) THEN 1 ELSE 0 END as hasRecentMammogram,
    
    -- Sexual health
    LEN(ms.clientRiskFactors) - LEN(REPLACE(ms.clientRiskFactors, ',', '')) + 1 as riskFactorCount,
    CASE WHEN ms.clientSTDDate IS NOT NULL AND ms.clientSTDDate >= DATEADD(YEAR, -1, GETDATE()) THEN 1 ELSE 0 END as hasRecentSTDTest,
    
    -- Audit info
    ms.createdBy,
    ms.createdAt,
    ms.updatedBy,
    ms.updatedAt
FROM dbo.MedicalScreening ms;

-- View for risk assessment
CREATE VIEW dbo.vw_MedicalRiskAssessment AS
SELECT 
    ms.clientID,
    ms.screeningID,
    -- Individual risk factors
    CASE WHEN ms.clientAlcoholRisk = 'Yes' THEN 2 ELSE 0 END as alcoholRiskScore,
    CASE WHEN ms.clientLastTBTestResults = 'Positive' THEN 3 ELSE 0 END as tbPositiveScore,
    CASE WHEN ms.tbCough = 'Yes' OR ms.tbCoughBlood = 'Yes' OR ms.medSweat = 'Yes' 
              OR ms.clientFever = 'Yes' OR ms.clientWeightLoss = 'Yes' THEN 3 ELSE 0 END as tbSymptomsScore,
    CASE WHEN LEN(ms.clientRiskFactors) > 10 THEN 1 ELSE 0 END as sexualRiskScore,
    CASE WHEN LEN(ms.clientSTDStatus) > 10 AND ms.clientSTDStatus NOT LIKE '%none%' THEN 1 ELSE 0 END as stdHistoryScore,
    
    -- Overall risk calculation
    (CASE WHEN ms.clientAlcoholRisk = 'Yes' THEN 2 ELSE 0 END +
     CASE WHEN ms.clientLastTBTestResults = 'Positive' THEN 3 ELSE 0 END +
     CASE WHEN ms.tbCough = 'Yes' OR ms.tbCoughBlood = 'Yes' OR ms.medSweat = 'Yes' 
               OR ms.clientFever = 'Yes' OR ms.clientWeightLoss = 'Yes' THEN 3 ELSE 0 END +
     CASE WHEN LEN(ms.clientRiskFactors) > 10 THEN 1 ELSE 0 END +
     CASE WHEN LEN(ms.clientSTDStatus) > 10 AND ms.clientSTDStatus NOT LIKE '%none%' THEN 1 ELSE 0 END) as totalRiskScore,
    
    -- Risk level categorization
    CASE 
        WHEN (CASE WHEN ms.clientAlcoholRisk = 'Yes' THEN 2 ELSE 0 END +
              CASE WHEN ms.clientLastTBTestResults = 'Positive' THEN 3 ELSE 0 END +
              CASE WHEN ms.tbCough = 'Yes' OR ms.tbCoughBlood = 'Yes' OR ms.medSweat = 'Yes' 
                        OR ms.clientFever = 'Yes' OR ms.clientWeightLoss = 'Yes' THEN 3 ELSE 0 END +
              CASE WHEN LEN(ms.clientRiskFactors) > 10 THEN 1 ELSE 0 END +
              CASE WHEN LEN(ms.clientSTDStatus) > 10 AND ms.clientSTDStatus NOT LIKE '%none%' THEN 1 ELSE 0 END) >= 5 
        THEN 'High'
        WHEN (CASE WHEN ms.clientAlcoholRisk = 'Yes' THEN 2 ELSE 0 END +
              CASE WHEN ms.clientLastTBTestResults = 'Positive' THEN 3 ELSE 0 END +
              CASE WHEN ms.tbCough = 'Yes' OR ms.tbCoughBlood = 'Yes' OR ms.medSweat = 'Yes' 
                        OR ms.clientFever = 'Yes' OR ms.clientWeightLoss = 'Yes' THEN 3 ELSE 0 END +
              CASE WHEN LEN(ms.clientRiskFactors) > 10 THEN 1 ELSE 0 END +
              CASE WHEN LEN(ms.clientSTDStatus) > 10 AND ms.clientSTDStatus NOT LIKE '%none%' THEN 1 ELSE 0 END) >= 3 
        THEN 'Medium'
        ELSE 'Low'
    END as riskLevel,
    
    ms.createdAt as assessmentDate
FROM dbo.MedicalScreening ms;

-- View for medication tracking
CREATE VIEW dbo.vw_ClientMedications AS
SELECT 
    ms.clientID,
    ms.screeningID,
    ms.clientMedications as medicationsJSON,
    LEN(ms.clientMedications) - LEN(REPLACE(ms.clientMedications, '}', '')) as medicationCount,
    ms.updatedAt as lastMedicationUpdate,
    ms.updatedBy as lastUpdatedBy
FROM dbo.MedicalScreening ms
WHERE ms.clientMedications IS NOT NULL 
  AND LEN(ms.clientMedications) > 10;

-- ===================================================================
-- Stored Procedures
-- ===================================================================

-- Procedure to get complete medical screening profile
CREATE PROCEDURE sp_GetMedicalScreeningProfile
    @ClientID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Main screening data
    SELECT * FROM dbo.MedicalScreening WHERE clientID = @ClientID;
    
    -- Summary statistics
    SELECT * FROM dbo.vw_MedicalScreeningSummary WHERE clientID = @ClientID;
    
    -- Risk assessment
    SELECT * FROM dbo.vw_MedicalRiskAssessment WHERE clientID = @ClientID;
    
    -- Medication details
    SELECT * FROM dbo.vw_ClientMedications WHERE clientID = @ClientID;
END;
GO

-- Procedure for TB clearance check
CREATE PROCEDURE sp_CheckTBClearance
    @ClientID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        clientID,
        clientLastTBTest,
        clientLastTBTestResults,
        clientLastTBTestResultsTreatment,
        clientLastTBTestResultsTreatmentOutcome,
        tbCough,
        tbCoughBlood,
        medSweat,
        clientFever,
        clientWeightLoss,
        CASE 
            WHEN clientLastTBTestResults = 'Negative' 
                 AND (tbCough != 'Yes' AND tbCoughBlood != 'Yes' AND medSweat != 'Yes' 
                      AND clientFever != 'Yes' AND clientWeightLoss != 'Yes')
            THEN 'Cleared'
            WHEN clientLastTBTestResults = 'Positive'
                 OR (tbCough = 'Yes' OR tbCoughBlood = 'Yes' OR medSweat = 'Yes' 
                     OR clientFever = 'Yes' OR clientWeightLoss = 'Yes')
            THEN 'Requires Follow-up'
            ELSE 'Incomplete Assessment'
        END as tbClearanceStatus,
        CASE 
            WHEN clientLastTBTest IS NULL OR clientLastTBTest < DATEADD(YEAR, -1, GETDATE())
            THEN 'Test Needed'
            ELSE 'Current'
        END as testStatus
    FROM dbo.MedicalScreening
    WHERE clientID = @ClientID;
END;
GO

-- Procedure to update medications only
CREATE PROCEDURE sp_UpdateClientMedications
    @ClientID NVARCHAR(50),
    @Medications NVARCHAR(MAX),
    @UpdatedBy NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.MedicalScreening
    SET clientMedications = @Medications,
        updatedBy = @UpdatedBy,
        updatedAt = GETDATE()
    WHERE clientID = @ClientID;
    
    SELECT @@ROWCOUNT as UpdatedRecords;
END;
GO

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.MedicalScreening TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_MedicalScreeningSummary TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_MedicalRiskAssessment TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_ClientMedications TO [YourAppRole];
-- GRANT EXECUTE ON sp_GetMedicalScreeningProfile TO [YourAppRole];
-- GRANT EXECUTE ON sp_CheckTBClearance TO [YourAppRole];
-- GRANT EXECUTE ON sp_UpdateClientMedications TO [YourAppRole];