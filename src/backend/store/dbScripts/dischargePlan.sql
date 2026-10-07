-- ========================================
-- Section 5: Discharge Plan (one per client)
-- Idempotent: safe to run more than once. Run before deploying the backend
-- that includes /api/discharge-plan.
-- Patient name and date of birth come from the client record.
-- ========================================
IF OBJECT_ID('dbo.discharge_plan', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.discharge_plan (
        id                    INT IDENTITY(1,1) PRIMARY KEY,
        clientID              NVARCHAR(50)  NOT NULL CONSTRAINT UQ_discharge_plan_clientID UNIQUE,

        admissionDate         DATE          NULL,
        dischargeDate         DATE          NULL,
        primaryDiagnosis      NVARCHAR(MAX) NULL,

        assessmentGoals       NVARCHAR(MAX) NULL,   -- I.   Assessment and Goals
        dischargeDestination  NVARCHAR(MAX) NULL,   -- II.  Discharge Destination
        medicationManagement  NVARCHAR(MAX) NULL,   -- III. Medication Management
        medicalEquipment      NVARCHAR(MAX) NULL,   -- IV.  Medical Equipment and Supplies
        homeHealthServices    NVARCHAR(MAX) NULL,   -- V.   Home Health Services
        followUpAppointments  NVARCHAR(MAX) NULL,   -- VI.  Follow-up Appointments and Communication
        patientEducation      NVARCHAR(MAX) NULL,   -- VII. Patient and Caregiver Education

        createdBy             NVARCHAR(255) NULL,
        createdAt             DATETIME2     NOT NULL CONSTRAINT DF_discharge_plan_createdAt DEFAULT SYSUTCDATETIME(),
        updatedBy             NVARCHAR(255) NULL,
        updatedAt             DATETIME2     NULL
    );
    PRINT 'Created dbo.discharge_plan';
END
ELSE
    PRINT 'dbo.discharge_plan already exists';
