-- mentalHealthSoftDelete.sql (Azure SQL / T-SQL)
--
-- Run ONCE before deploying the backend that includes the Section 3
-- remove/permanent-delete routes (routes/mentalHealth.js). Safe to re-run:
-- every change is guarded.
--
-- Adds soft-delete columns so removing a Mental Health Provider,
-- Hospitalization or Psychiatric Medication marks it inactive (keeping the
-- clinical history) and records who removed it, when, and why.

-- Hospitalizations had no active flag; existing rows stay active.
IF COL_LENGTH('dbo.MentalHealthHospitalizations', 'active') IS NULL
    ALTER TABLE dbo.MentalHealthHospitalizations
        ADD active BIT NOT NULL CONSTRAINT DF_MentalHealthHospitalizations_active DEFAULT 1;
GO

IF COL_LENGTH('dbo.MentalHealthProviders', 'deletedBy') IS NULL
    ALTER TABLE dbo.MentalHealthProviders ADD deletedBy NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.MentalHealthProviders', 'deletedAt') IS NULL
    ALTER TABLE dbo.MentalHealthProviders ADD deletedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.MentalHealthProviders', 'deleteReason') IS NULL
    ALTER TABLE dbo.MentalHealthProviders ADD deleteReason NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.MentalHealthHospitalizations', 'deletedBy') IS NULL
    ALTER TABLE dbo.MentalHealthHospitalizations ADD deletedBy NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.MentalHealthHospitalizations', 'deletedAt') IS NULL
    ALTER TABLE dbo.MentalHealthHospitalizations ADD deletedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.MentalHealthHospitalizations', 'deleteReason') IS NULL
    ALTER TABLE dbo.MentalHealthHospitalizations ADD deleteReason NVARCHAR(500) NULL;
GO

IF COL_LENGTH('dbo.MentalHealthMedications', 'deletedBy') IS NULL
    ALTER TABLE dbo.MentalHealthMedications ADD deletedBy NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.MentalHealthMedications', 'deletedAt') IS NULL
    ALTER TABLE dbo.MentalHealthMedications ADD deletedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.MentalHealthMedications', 'deleteReason') IS NULL
    ALTER TABLE dbo.MentalHealthMedications ADD deleteReason NVARCHAR(500) NULL;
GO
