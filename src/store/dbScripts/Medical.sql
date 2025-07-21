-- ===================================================================
-- Medical Face Sheet Database Tables Creation Script
-- ===================================================================

-- Drop tables if they exist (for development/testing)
-- IF OBJECT_ID('dbo.MedicalAppointments', 'U') IS NOT NULL DROP TABLE dbo.MedicalAppointments;
-- IF OBJECT_ID('dbo.MedicalInfo', 'U') IS NOT NULL DROP TABLE dbo.MedicalInfo;
-- IF OBJECT_ID('dbo.AllergyOptions', 'U') IS NOT NULL DROP TABLE dbo.AllergyOptions;

-- ===================================================================
-- 1. MedicalInfo Table - Stores medical information for each client
-- ===================================================================

CREATE TABLE dbo.MedicalInfo (
    medicalInfoID INT IDENTITY(1,1) PRIMARY KEY,
    clientID NVARCHAR(50) NOT NULL UNIQUE,
    clientMedConditions NVARCHAR(MAX) NULL, -- JSON array of medical conditions
    clientAddMedHistory NVARCHAR(MAX) NULL, -- Additional medical history text
    clientMedPertinent NVARCHAR(MAX) NULL,  -- Pertinent medical information
    clientPreviousLab NVARCHAR(10) NULL,    -- Yes/No for previous lab work
    clientAllergies NVARCHAR(MAX) NULL,     -- JSON array of allergies
    createdBy NVARCHAR(255) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(255) NULL,
    updatedAt DATETIME2 NULL
);

-- Create indexes for MedicalInfo
CREATE INDEX IX_MedicalInfo_ClientID ON dbo.MedicalInfo (clientID);
CREATE INDEX IX_MedicalInfo_CreatedAt ON dbo.MedicalInfo (createdAt DESC);
CREATE INDEX IX_MedicalInfo_UpdatedAt ON dbo.MedicalInfo (updatedAt DESC);

-- ===================================================================
-- 2. MedicalAppointments Table - Stores medical appointments
-- ===================================================================

CREATE TABLE dbo.MedicalAppointments (
    appointmentID INT IDENTITY(1,1) PRIMARY KEY,
    clientID NVARCHAR(50) NOT NULL,
    medApptDate DATE NOT NULL,
    medApptLoc NVARCHAR(255) NOT NULL,
    medApptType NVARCHAR(100) NOT NULL,
    medApptProv NVARCHAR(255) NULL,     -- Provider name
    medApptTranport NVARCHAR(10) NULL,  -- Yes/No for transportation needed
    createdBy NVARCHAR(255) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(255) NULL,
    updatedAt DATETIME2 NULL
);

-- Create indexes for MedicalAppointments
CREATE INDEX IX_MedicalAppointments_ClientID ON dbo.MedicalAppointments (clientID);
CREATE INDEX IX_MedicalAppointments_Date ON dbo.MedicalAppointments (medApptDate DESC);
CREATE INDEX IX_MedicalAppointments_ClientID_Date ON dbo.MedicalAppointments (clientID, medApptDate DESC);
CREATE INDEX IX_MedicalAppointments_CreatedAt ON dbo.MedicalAppointments (createdAt DESC);
CREATE INDEX IX_MedicalAppointments_Transport ON dbo.MedicalAppointments (medApptTranport);

-- ===================================================================
-- 3. AllergyOptions Table - Master list of available allergies
-- ===================================================================

CREATE TABLE dbo.AllergyOptions (
    allergyID INT IDENTITY(1,1) PRIMARY KEY,
    allergyCode NVARCHAR(50) NOT NULL UNIQUE,
    allergyName NVARCHAR(255) NOT NULL,
    allergyDescription NVARCHAR(500) NULL,
    allergyCategory NVARCHAR(100) NULL, -- Food, Drug, Environmental, etc.
    isActive BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NULL
);

-- Create indexes for AllergyOptions
CREATE INDEX IX_AllergyOptions_Code ON dbo.AllergyOptions (allergyCode);
CREATE INDEX IX_AllergyOptions_Name ON dbo.AllergyOptions (allergyName);
CREATE INDEX IX_AllergyOptions_Category ON dbo.AllergyOptions (allergyCategory);
CREATE INDEX IX_AllergyOptions_Active ON dbo.AllergyOptions (isActive);

-- ===================================================================
-- Add constraints
-- ===================================================================

-- MedicalInfo constraints
ALTER TABLE dbo.MedicalInfo
ADD CONSTRAINT CK_MedicalInfo_PreviousLab 
CHECK (clientPreviousLab IN ('Yes', 'No', NULL));

-- MedicalAppointments constraints
ALTER TABLE dbo.MedicalAppointments
ADD CONSTRAINT CK_MedicalAppointments_Transport 
CHECK (medApptTranport IN ('Yes', 'No', NULL));

ALTER TABLE dbo.MedicalAppointments
ADD CONSTRAINT CK_MedicalAppointments_Date 
CHECK (medApptDate >= '2020-01-01'); -- Reasonable date range

-- Foreign key constraints (uncomment if you have a Clients table)
-- ALTER TABLE dbo.MedicalInfo
-- ADD CONSTRAINT FK_MedicalInfo_ClientID 
-- FOREIGN KEY (clientID) REFERENCES dbo.Clients(clientID);

-- ALTER TABLE dbo.MedicalAppointments
-- ADD CONSTRAINT FK_MedicalAppointments_ClientID 
-- FOREIGN KEY (clientID) REFERENCES dbo.Clients(clientID);

-- ===================================================================
-- Populate AllergyOptions with common allergies
-- ===================================================================

INSERT INTO dbo.AllergyOptions (allergyCode, allergyName, allergyDescription, allergyCategory) VALUES
-- Drug Allergies
('penicillin', 'Penicillin', 'Severe allergic reaction to penicillin antibiotics', 'Drug'),
('sulfa', 'Sulfa Drugs', 'Allergic reaction to sulfonamide medications', 'Drug'),
('aspirin', 'Aspirin', 'Sensitivity to aspirin and related medications', 'Drug'),
('codeine', 'Codeine', 'Allergic reaction to codeine-based pain medications', 'Drug'),
('iodine', 'Iodine', 'Reaction to iodine-based contrast agents', 'Drug'),

-- Food Allergies
('shellfish', 'Shellfish', 'Anaphylactic reaction to shellfish', 'Food'),
('nuts', 'Tree Nuts', 'Severe allergy to tree nuts (almonds, walnuts, etc.)', 'Food'),
('peanuts', 'Peanuts', 'Severe peanut allergy', 'Food'),
('dairy', 'Dairy Products', 'Lactose intolerance or milk protein allergy', 'Food'),
('eggs', 'Eggs', 'Allergic reaction to eggs', 'Food'),
('soy', 'Soy', 'Soy protein allergy', 'Food'),
('wheat', 'Wheat/Gluten', 'Celiac disease or wheat allergy', 'Food'),

-- Environmental Allergies
('latex', 'Latex', 'Latex sensitivity causing skin reactions', 'Environmental'),
('pollen', 'Pollen', 'Seasonal allergies to various pollens', 'Environmental'),
('dust', 'Dust Mites', 'Allergy to dust mites', 'Environmental'),
('mold', 'Mold', 'Sensitivity to mold spores', 'Environmental'),
('pets', 'Pet Dander', 'Allergic to cat/dog dander', 'Environmental'),

-- Other Common Allergies
('adhesive', 'Adhesive/Tape', 'Skin reaction to medical adhesives', 'Other'),
('contrast', 'Contrast Dye', 'Reaction to medical imaging contrast agents', 'Other'),
('nickel', 'Nickel', 'Contact dermatitis from nickel exposure', 'Other');

-- ===================================================================
-- Sample data for testing (optional)
-- ===================================================================

/*
-- Sample medical information
INSERT INTO dbo.MedicalInfo (
    clientID, clientMedConditions, clientAddMedHistory, clientMedPertinent, 
    clientPreviousLab, clientAllergies, createdBy, createdAt
) VALUES 
(
    'DEMO-001', 
    '[{"value":"diabetes","label":"Diabetes Type 2"},{"value":"hypertension","label":"Hypertension"}]',
    'Patient diagnosed with Type 2 diabetes 5 years ago. Currently managed with metformin. Blood pressure elevated in recent visits.',
    'Patient reports occasional dizziness and fatigue. Family history of cardiovascular disease.',
    'Yes',
    '[{"value":"penicillin","label":"Penicillin - Severe allergic reaction"},{"value":"shellfish","label":"Shellfish - Anaphylaxis"}]',
    'demo@example.com',
    GETDATE()
),
(
    'DEMO-002',
    '[{"value":"asthma","label":"Asthma"},{"value":"anxiety","label":"Anxiety Disorder"}]',
    'Long-standing asthma since childhood. Uses albuterol inhaler as needed. Anxiety managed with therapy.',
    'Patient very compliant with medications. Has good support system.',
    'No',
    '[{"value":"nuts","label":"Tree Nuts - Severe allergy"}]',
    'demo@example.com',
    GETDATE()
);

-- Sample appointments
INSERT INTO dbo.MedicalAppointments (
    clientID, medApptDate, medApptLoc, medApptType, medApptProv, medApptTranport, createdBy, createdAt
) VALUES 
('DEMO-001', '2024-03-20', 'Main Medical Center', 'Follow-up', 'Dr. Smith', 'Yes', 'demo@example.com', GETDATE()),
('DEMO-001', '2024-03-25', 'Cardiology Clinic', 'Specialist Consultation', 'Dr. Johnson', 'No', 'demo@example.com', GETDATE()),
('DEMO-001', '2024-04-01', 'Lab Services', 'Blood Work', 'Lab Tech', 'Yes', 'demo@example.com', GETDATE()),
('DEMO-002', '2024-03-22', 'Pulmonology Clinic', 'Asthma Check-up', 'Dr. Williams', 'No', 'demo@example.com', GETDATE()),
('DEMO-002', '2024-03-28', 'Mental Health Center', 'Therapy Session', 'Dr. Brown', 'Yes', 'demo@example.com', GETDATE());
*/

-- ===================================================================
-- Views for reporting and analytics
-- ===================================================================

-- View for medical information summary
CREATE VIEW dbo.vw_MedicalInfoSummary AS
SELECT 
    mi.clientID,
    mi.clientPreviousLab,
    LEN(mi.clientMedConditions) - LEN(REPLACE(mi.clientMedConditions, ',', '')) + 1 as EstimatedConditionCount,
    LEN(mi.clientAllergies) - LEN(REPLACE(mi.clientAllergies, ',', '')) + 1 as EstimatedAllergyCount,
    CASE WHEN LEN(mi.clientAddMedHistory) > 0 THEN 1 ELSE 0 END as HasMedicalHistory,
    CASE WHEN LEN(mi.clientMedPertinent) > 0 THEN 1 ELSE 0 END as HasPertinentInfo,
    mi.createdBy,
    mi.createdAt,
    mi.updatedBy,
    mi.updatedAt
FROM dbo.MedicalInfo mi;

-- View for appointment statistics
CREATE VIEW dbo.vw_AppointmentStats AS
SELECT 
    ma.clientID,
    COUNT(*) as TotalAppointments,
    COUNT(CASE WHEN ma.medApptDate >= GETDATE() THEN 1 END) as UpcomingAppointments,
    COUNT(CASE WHEN ma.medApptDate < GETDATE() THEN 1 END) as PastAppointments,
    COUNT(CASE WHEN ma.medApptTranport = 'Yes' THEN 1 END) as AppointmentsNeedingTransport,
    MAX(CASE WHEN ma.medApptDate >= GETDATE() THEN ma.medApptDate END) as NextAppointmentDate,
    MIN(ma.medApptDate) as FirstAppointmentDate,
    MAX(ma.medApptDate) as LastAppointmentDate
FROM dbo.MedicalAppointments ma
GROUP BY ma.clientID;

-- View for recent medical activity
CREATE VIEW dbo.vw_RecentMedicalActivity AS
SELECT TOP 100
    'Medical Info' as ActivityType,
    mi.clientID,
    mi.createdBy as ActionBy,
    mi.createdAt as ActivityDate,
    'Medical information updated' as ActivityDescription
FROM dbo.MedicalInfo mi
WHERE mi.updatedAt IS NOT NULL
UNION ALL
SELECT TOP 100
    'Appointment' as ActivityType,
    ma.clientID,
    ma.createdBy as ActionBy,
    ma.createdAt as ActivityDate,
    CONCAT('Appointment scheduled: ', ma.medApptType, ' at ', ma.medApptLoc) as ActivityDescription
FROM dbo.MedicalAppointments ma
ORDER BY ActivityDate DESC;

-- ===================================================================
-- Stored Procedures
-- ===================================================================

-- Procedure to get complete medical profile for a client
CREATE PROCEDURE sp_GetClientMedicalProfile
    @ClientID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Medical Information
    SELECT 
        clientID,
        clientMedConditions,
        clientAddMedHistory,
        clientMedPertinent,
        clientPreviousLab,
        clientAllergies,
        createdBy,
        createdAt,
        updatedBy,
        updatedAt
    FROM dbo.MedicalInfo
    WHERE clientID = @ClientID;
    
    -- Appointments
    SELECT 
        appointmentID,
        clientID,
        medApptDate,
        medApptLoc,
        medApptType,
        medApptProv,
        medApptTranport,
        createdBy,
        createdAt,
        updatedBy,
        updatedAt
    FROM dbo.MedicalAppointments
    WHERE clientID = @ClientID
    ORDER BY medApptDate DESC;
    
    -- Statistics
    SELECT * FROM dbo.vw_AppointmentStats WHERE clientID = @ClientID;
END;
GO

-- Procedure to clean up old appointments
CREATE PROCEDURE sp_CleanupOldAppointments
    @DaysOld INT = 365,
    @DryRun BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CutoffDate DATE = DATEADD(DAY, -@DaysOld, GETDATE());
    
    IF @DryRun = 1
    BEGIN
        -- Show what would be deleted
        SELECT 
            COUNT(*) as AppointmentsToDelete,
            MIN(medApptDate) as OldestAppointment,
            MAX(medApptDate) as NewestToDelete
        FROM dbo.MedicalAppointments
        WHERE medApptDate < @CutoffDate;
        
        SELECT 
            clientID,
            medApptDate,
            medApptType,
            medApptLoc
        FROM dbo.MedicalAppointments
        WHERE medApptDate < @CutoffDate
        ORDER BY medApptDate;
    END
    ELSE
    BEGIN
        -- Actually delete old appointments
        DELETE FROM dbo.MedicalAppointments
        WHERE medApptDate < @CutoffDate;
        
        SELECT @@ROWCOUNT as DeletedAppointments;
    END
END;
GO

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.MedicalInfo TO [YourAppRole];
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.MedicalAppointments TO [YourAppRole];
-- GRANT SELECT ON dbo.AllergyOptions TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_MedicalInfoSummary TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_AppointmentStats TO [YourAppRole];
-- GRANT SELECT ON dbo.vw_RecentMedicalActivity TO [YourAppRole];
-- GRANT EXECUTE ON sp_GetClientMedicalProfile TO [YourAppRole];
-- GRANT EXECUTE ON sp_CleanupOldAppointments TO [YourAdminRole];