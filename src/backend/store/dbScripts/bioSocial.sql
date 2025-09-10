-- =============================================
-- Bio-Social Assessment Database Schema
-- Version: 1.0
-- Created: 2025-07-18
-- Description: Comprehensive bio-social assessment system for client evaluations
-- =============================================

-- Set database context
USE [YourDatabaseName]; -- Replace with your actual database name
GO

-- =============================================
-- 1. MAIN BIO-SOCIAL ASSESSMENT TABLE
-- =============================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BioSocialAssessment' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[BioSocialAssessment] (
        -- Primary identifiers
        [bioSocialID] NVARCHAR(50) NOT NULL PRIMARY KEY,
        [clientID] NVARCHAR(50) NOT NULL,
        [assessmentID] NVARCHAR(50) NULL, -- Links to AssessmentCarePlans
        
        -- FINANCIAL SCREENING SECTION
        -- Income sources (stored as string amounts for flexibility)
        [clientCalWorks] NVARCHAR(20) NULL DEFAULT '0.00',
        [clientEmployment] NVARCHAR(20) NULL DEFAULT '0.00',
        [clientFoodStamps] NVARCHAR(20) NULL DEFAULT '0.00',
        [clientWidowBen] NVARCHAR(20) NULL DEFAULT '0.00',
        [clientCS] NVARCHAR(20) NULL DEFAULT '0.00',         -- Child Support
        [clientGenRelief] NVARCHAR(20) NULL DEFAULT '0.00',   -- General Relief
        [clientSSI] NVARCHAR(20) NULL DEFAULT '0.00',
        [clientSSDI] NVARCHAR(20) NULL DEFAULT '0.00',
        [clientTANF] NVARCHAR(20) NULL DEFAULT '0.00',
        [clientWorkComp] NVARCHAR(20) NULL DEFAULT '0.00',    -- Workers Compensation
        [clientUnEmp] NVARCHAR(20) NULL DEFAULT '0.00',       -- Unemployment
        [clientVetBen] NVARCHAR(20) NULL DEFAULT '0.00',      -- Veterans Benefits
        [clientStDis] NVARCHAR(20) NULL DEFAULT '0.00',       -- State Disability
        [clientInherit] NVARCHAR(20) NULL DEFAULT '0.00',     -- Inheritance
        [clientOtherInc] NVARCHAR(20) NULL DEFAULT '0.00',    -- Other Income
        [totalMonthlyIncome] DECIMAL(10,2) NULL DEFAULT 0.00, -- Calculated total
        
        -- Payee Information
        [payeeChoice] NVARCHAR(20) NULL,                      -- Yes/No/Client doesn't know
        [payeeName] NVARCHAR(100) NULL,
        [payeePhone] NVARCHAR(20) NULL,
        [payeeRelationship] NVARCHAR(50) NULL,
        
        -- EMPLOYMENT HISTORY SECTION
        [clientBeenEmployed] NVARCHAR(20) NULL,               -- Yes/No/Client doesn't know
        [clientEmpIntr] NVARCHAR(20) NULL,                    -- Employment Interest
        [clientEmployed] NVARCHAR(20) NULL,                   -- Currently Employed
        [clientEmployer] NVARCHAR(200) NULL,                  -- Name of Employer
        [lastEmploymentDate] DATETIME2 NULL,
        [employmentBarriers] NVARCHAR(MAX) NULL,              -- JSON array of barriers
        
        -- DEBT SECTION
        [clientDebt] NVARCHAR(20) NULL,                       -- Owe debt to public agency
        [clientDebtAmount] NVARCHAR(20) NULL,
        [clientBankrupt] NVARCHAR(20) NULL,                   -- Ever filed bankruptcy
        [bankruptcyDate] DATETIME2 NULL,
        
        -- HOUSING SCREENING SECTION
        [clientGovHousingApp] NVARCHAR(MAX) NULL,             -- Government housing applied for (comma-separated)
        [clientGovHousingLive] NVARCHAR(MAX) NULL,            -- Government housing lived in (comma-separated)
        [clientPastRenter] NVARCHAR(20) NULL,                 -- Ever rented before
        [clientPastRenterLate] NVARCHAR(20) NULL,             -- Ever served late notice
        [clientEvicted] NVARCHAR(20) NULL,                    -- Ever been evicted
        [clientLandlordProb] NVARCHAR(20) NULL,               -- Problems with landlords
        [clientUtilityBill] NVARCHAR(20) NULL,                -- Outstanding utility bills
        [clientCreditRating] NVARCHAR(20) NULL,               -- Credit rating (Excellent/Good/Fair/Poor)
        [clientHousingSummary] NVARCHAR(MAX) NULL,            -- Housing summary notes
        [housingStability] NVARCHAR(50) NULL,                 -- Stable/Unstable/Unknown
        
        -- FUNCTIONAL SCREENING SECTION
        -- Ambulatory Status
        [clientAmbulatory] NVARCHAR(MAX) NULL,                -- Walking abilities (comma-separated)
        [clientAmbulatorySummary] NVARCHAR(MAX) NULL,         -- Ambulatory status notes
        
        -- Activities of Daily Living (ADL)
        [clientEating] NVARCHAR(50) NULL,                     -- Self/Partial Assistance/Complete Assistance
        [clientBathing] NVARCHAR(50) NULL,                    -- Self/Partial Assistance/Complete Assistance
        [clientBrushing] NVARCHAR(50) NULL,                   -- Self/Partial Assistance/Complete Assistance (Teeth)
        [clientToileting] NVARCHAR(50) NULL,                  -- Self/Partial Assistance/Complete Assistance
        [clientCooking] NVARCHAR(50) NULL,                    -- Self/Partial Assistance/Complete Assistance
        [clientCleaning] NVARCHAR(50) NULL,                   -- Self/Partial Assistance/Complete Assistance
        [clientLaundry] NVARCHAR(50) NULL,                    -- Self/Partial Assistance/Complete Assistance
        [clientTakingMeds] NVARCHAR(50) NULL,                 -- Self/Partial Assistance/Complete Assistance
        [clientFunctionalAssist] NVARCHAR(MAX) NULL,          -- Functional assistance notes
        [adlScore] INT NULL DEFAULT 0,                        -- Calculated ADL score (0-32)
        [adlPercentage] DECIMAL(5,2) NULL DEFAULT 0.00,       -- ADL independence percentage
        
        -- COMMUNICATION & LANGUAGE SECTION
        [clientCommunication] NVARCHAR(MAX) NULL,             -- Communication methods (comma-separated)
        [primaryLanguage] NVARCHAR(50) NULL DEFAULT 'English',
        [interpreterNeeded] BIT NULL DEFAULT 0,
        [communicationBarriers] NVARCHAR(MAX) NULL,
        
        -- ASSESSMENT SUMMARY SECTION
        [clientBioSocialNotes] NVARCHAR(MAX) NULL,            -- Bio-social summary notes
        [riskFactors] NVARCHAR(MAX) NULL,                     -- Identified risk factors
        [strengths] NVARCHAR(MAX) NULL,                       -- Identified client strengths
        [recommendedServices] NVARCHAR(MAX) NULL,             -- Recommended services
        
        -- COMPLETION STATUS
        [completionStatus] NVARCHAR(50) NOT NULL DEFAULT 'Not Started', -- Not Started/In Progress/Complete
        [completionPercentage] DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        [timeSpent] DECIMAL(5,2) NULL DEFAULT 0.00,           -- Hours spent on assessment
        
        -- AUDIT FIELDS
        [createdBy] NVARCHAR(100) NOT NULL,
        [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updatedBy] NVARCHAR(100) NULL,
        [updatedAt] DATETIME2 NULL,
        [completedBy] NVARCHAR(100) NULL,
        [completedAt] DATETIME2 NULL,
        [isActive] BIT NOT NULL DEFAULT 1,
        [version] INT NOT NULL DEFAULT 1,
        
        -- CONSTRAINTS
        CONSTRAINT CK_BioSocialAssessment_CompletionPercentage 
            CHECK ([completionPercentage] >= 0 AND [completionPercentage] <= 100),
        CONSTRAINT CK_BioSocialAssessment_ADLScore 
            CHECK ([adlScore] >= 0 AND [adlScore] <= 32),
        CONSTRAINT CK_BioSocialAssessment_ADLPercentage 
            CHECK ([adlPercentage] >= 0 AND [adlPercentage] <= 100),
        CONSTRAINT CK_BioSocialAssessment_CompletionStatus 
            CHECK ([completionStatus] IN ('Not Started', 'In Progress', 'Complete', 'On Hold', 'Cancelled')),
        CONSTRAINT CK_BioSocialAssessment_TotalIncome 
            CHECK ([totalMonthlyIncome] >= 0),
        CONSTRAINT CK_BioSocialAssessment_TimeSpent 
            CHECK ([timeSpent] >= 0),
        CONSTRAINT CK_BioSocialAssessment_HousingStability 
            CHECK ([housingStability] IN ('Stable', 'Unstable', 'Unknown', 'Transitional', 'At Risk')),
        CONSTRAINT CK_BioSocialAssessment_CreditRating 
            CHECK ([clientCreditRating] IN ('Excellent', 'Good', 'Fair', 'Poor', 'Very Poor', '', NULL)),
        CONSTRAINT CK_BioSocialAssessment_ADLLevels 
            CHECK ([clientEating] IN ('Self', 'Partial Assistance', 'Complete Assistance', '', NULL) AND
                   [clientBathing] IN ('Self', 'Partial Assistance', 'Complete Assistance', '', NULL) AND
                   [clientToileting] IN ('Self', 'Partial Assistance', 'Complete Assistance', '', NULL) AND
                   [clientCooking] IN ('Self', 'Partial Assistance', 'Complete Assistance', '', NULL))
    );
    
    PRINT '✅ BioSocialAssessment table created successfully';
END
ELSE
BEGIN
    PRINT '⚠️  BioSocialAssessment table already exists';
END
GO

-- =============================================
-- 2. FINANCIAL SUMMARY TABLE (Optional - for historical tracking)
-- =============================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BioSocialFinancialHistory' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[BioSocialFinancialHistory] (
        [historyID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [bioSocialID] NVARCHAR(50) NOT NULL,
        [clientID] NVARCHAR(50) NOT NULL,
        [snapshotDate] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [totalMonthlyIncome] DECIMAL(10,2) NOT NULL,
        [disabilityIncome] DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        [assistanceIncome] DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        [employmentIncome] DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        [otherIncome] DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        [financialStability] NVARCHAR(20) NOT NULL,
        [hasDebt] BIT NOT NULL DEFAULT 0,
        [hasPayee] BIT NOT NULL DEFAULT 0,
        [createdBy] NVARCHAR(100) NOT NULL,
        
        -- Foreign key
        FOREIGN KEY ([bioSocialID]) REFERENCES [dbo].[BioSocialAssessment]([bioSocialID]) ON DELETE CASCADE,
        
        -- Constraints
        CONSTRAINT CK_BioSocialFinancialHistory_Stability 
            CHECK ([financialStability] IN ('Stable', 'Moderate', 'At Risk', 'High Risk'))
    );
    
    PRINT '✅ BioSocialFinancialHistory table created successfully';
END
ELSE
BEGIN
    PRINT '⚠️  BioSocialFinancialHistory table already exists';
END
GO

-- =============================================
-- 3. INDEXES FOR PERFORMANCE
-- =============================================

-- Primary lookup indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_BioSocialAssessment_ClientID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BioSocialAssessment_ClientID] 
    ON [dbo].[BioSocialAssessment] ([clientID], [createdAt] DESC);
    PRINT '✅ Index IX_BioSocialAssessment_ClientID created';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_BioSocialAssessment_AssessmentID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BioSocialAssessment_AssessmentID] 
    ON [dbo].[BioSocialAssessment] ([assessmentID], [completionStatus]);
    PRINT '✅ Index IX_BioSocialAssessment_AssessmentID created';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_BioSocialAssessment_Completion')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BioSocialAssessment_Completion] 
    ON [dbo].[BioSocialAssessment] ([completionStatus], [completionPercentage], [completedAt]);
    PRINT '✅ Index IX_BioSocialAssessment_Completion created';
END

-- Financial analysis index
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_BioSocialAssessment_Financial')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BioSocialAssessment_Financial] 
    ON [dbo].[BioSocialAssessment] ([totalMonthlyIncome], [clientDebt], [payeeChoice]);
    PRINT '✅ Index IX_BioSocialAssessment_Financial created';
END

-- ADL analysis index
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_BioSocialAssessment_ADL')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BioSocialAssessment_ADL] 
    ON [dbo].[BioSocialAssessment] ([adlScore], [adlPercentage]);
    PRINT '✅ Index IX_BioSocialAssessment_ADL created';
END

-- =============================================
-- 4. VIEWS FOR REPORTING AND ANALYTICS
-- =============================================

-- Comprehensive Bio-Social Overview View
IF NOT EXISTS (SELECT * FROM sys.views WHERE name='vw_BioSocialOverview')
BEGIN
    EXEC('
    CREATE VIEW [dbo].[vw_BioSocialOverview] AS
    SELECT 
        bs.bioSocialID,
        bs.clientID,
        bs.assessmentID,
        
        -- Assessment Status
        bs.completionStatus,
        bs.completionPercentage,
        bs.timeSpent,
        
        -- Financial Profile
        bs.totalMonthlyIncome,
        (CAST(bs.clientSSI AS DECIMAL) + CAST(bs.clientSSDI AS DECIMAL)) as disabilityIncome,
        (CAST(bs.clientCalWorks AS DECIMAL) + CAST(bs.clientTANF AS DECIMAL) + CAST(bs.clientGenRelief AS DECIMAL)) as assistanceIncome,
        (CAST(bs.clientEmployment AS DECIMAL) + CAST(bs.clientWorkComp AS DECIMAL) + CAST(bs.clientUnEmp AS DECIMAL)) as employmentIncome,
        CAST(bs.clientFoodStamps AS DECIMAL) as foodAssistance,
        
        -- Financial Stability Assessment
        CASE 
            WHEN bs.totalMonthlyIncome < 1000 THEN ''High Risk''
            WHEN bs.totalMonthlyIncome < 2000 THEN ''Moderate Risk''
            WHEN bs.totalMonthlyIncome < 3000 THEN ''Stable''
            ELSE ''Well Secured''
        END as financialStability,
        
        -- Risk Indicators
        CASE WHEN bs.clientDebt = ''Yes'' THEN 1 ELSE 0 END as hasDebt,
        CASE WHEN bs.payeeChoice = ''Yes'' THEN 1 ELSE 0 END as hasPayee,
        CASE WHEN bs.clientEvicted = ''Yes'' THEN 1 ELSE 0 END as hasEvictionHistory,
        CASE WHEN bs.clientEmployed = ''Yes'' THEN 1 ELSE 0 END as currentlyEmployed,
        
        -- ADL Profile
        bs.adlScore,
        bs.adlPercentage,
        CASE 
            WHEN bs.adlPercentage >= 90 THEN ''Highly Independent''
            WHEN bs.adlPercentage >= 75 THEN ''Mostly Independent''
            WHEN bs.adlPercentage >= 50 THEN ''Partially Independent''
            ELSE ''Needs Significant Support''
        END as independenceLevel,
        
        -- Housing Profile
        bs.housingStability,
        bs.clientCreditRating,
        CASE 
            WHEN bs.clientEvicted = ''Yes'' OR bs.clientLandlordProb = ''Yes'' THEN ''High Risk''
            WHEN bs.clientPastRenter = ''Yes'' AND bs.clientPastRenterLate = ''No'' THEN ''Low Risk''
            ELSE ''Moderate Risk''
        END as housingRisk,
        
        -- Communication Profile
        bs.primaryLanguage,
        bs.interpreterNeeded,
        
        -- Assessment Metadata
        bs.createdBy,
        bs.createdAt,
        bs.completedBy,
        bs.completedAt,
        DATEDIFF(day, bs.createdAt, GETDATE()) as daysSinceAssessment
        
    FROM BioSocialAssessment bs
    WHERE bs.isActive = 1
    ');
    PRINT '✅ View vw_BioSocialOverview created';
END
ELSE
BEGIN
    PRINT '⚠️  View vw_BioSocialOverview already exists';
END
GO

-- Financial Analytics View
IF NOT EXISTS (SELECT * FROM sys.views WHERE name='vw_BioSocialFinancialAnalytics')
BEGIN
    EXEC('
    CREATE VIEW [dbo].[vw_BioSocialFinancialAnalytics] AS
    SELECT 
        YEAR(bs.createdAt) as assessmentYear,
        MONTH(bs.createdAt) as assessmentMonth,
        
        -- Volume Metrics
        COUNT(*) as totalAssessments,
        COUNT(CASE WHEN bs.completionStatus = ''Complete'' THEN 1 END) as completedAssessments,
        
        -- Financial Metrics
        AVG(bs.totalMonthlyIncome) as avgMonthlyIncome,
        MIN(bs.totalMonthlyIncome) as minMonthlyIncome,
        MAX(bs.totalMonthlyIncome) as maxMonthlyIncome,
        
        -- Risk Distribution
        COUNT(CASE WHEN bs.totalMonthlyIncome < 1000 THEN 1 END) as highFinancialRisk,
        COUNT(CASE WHEN bs.totalMonthlyIncome BETWEEN 1000 AND 1999 THEN 1 END) as moderateFinancialRisk,
        COUNT(CASE WHEN bs.totalMonthlyIncome >= 2000 THEN 1 END) as stableFinancial,
        
        -- Debt and Support Metrics
        COUNT(CASE WHEN bs.clientDebt = ''Yes'' THEN 1 END) as clientsWithDebt,
        COUNT(CASE WHEN bs.payeeChoice = ''Yes'' THEN 1 END) as clientsWithPayee,
        COUNT(CASE WHEN bs.clientEmployed = ''Yes'' THEN 1 END) as employedClients,
        
        -- Housing Risk Metrics
        COUNT(CASE WHEN bs.clientEvicted = ''Yes'' THEN 1 END) as clientsWithEvictions,
        COUNT(CASE WHEN bs.housingStability = ''Unstable'' THEN 1 END) as unstableHousing,
        
        -- ADL Metrics
        AVG(CAST(bs.adlScore AS FLOAT)) as avgADLScore,
        AVG(CAST(bs.adlPercentage AS FLOAT)) as avgADLPercentage,
        COUNT(CASE WHEN bs.adlPercentage < 50 THEN 1 END) as highSupportNeeds,
        
        -- Completion Metrics
        AVG(CAST(bs.completionPercentage AS FLOAT)) as avgCompletionPercentage,
        AVG(CAST(bs.timeSpent AS FLOAT)) as avgTimeSpent
        
    FROM BioSocialAssessment bs
    WHERE bs.isActive = 1 
    AND bs.createdAt >= DATEADD(year, -2, GETDATE()) -- Last 2 years
    GROUP BY 
        YEAR(bs.createdAt),
        MONTH(bs.createdAt)
    ');
    PRINT '✅ View vw_BioSocialFinancialAnalytics created';
END
ELSE
BEGIN
    PRINT '⚠️  View vw_BioSocialFinancialAnalytics already exists';
END
GO

-- ADL Independence Analysis View
IF NOT EXISTS (SELECT * FROM sys.views WHERE name='vw_BioSocialADLAnalysis')
BEGIN
    EXEC('
    CREATE VIEW [dbo].[vw_BioSocialADLAnalysis] AS
    SELECT 
        bs.bioSocialID,
        bs.clientID,
        bs.adlScore,
        bs.adlPercentage,
        
        -- Individual ADL Scores (Self=4, Partial=2, Complete=1, null/empty=0)
        CASE bs.clientEating 
            WHEN ''Self'' THEN 4 
            WHEN ''Partial Assistance'' THEN 2 
            WHEN ''Complete Assistance'' THEN 1 
            ELSE 0 
        END as eatingScore,
        
        CASE bs.clientBathing 
            WHEN ''Self'' THEN 4 
            WHEN ''Partial Assistance'' THEN 2 
            WHEN ''Complete Assistance'' THEN 1 
            ELSE 0 
        END as bathingScore,
        
        CASE bs.clientToileting 
            WHEN ''Self'' THEN 4 
            WHEN ''Partial Assistance'' THEN 2 
            WHEN ''Complete Assistance'' THEN 1 
            ELSE 0 
        END as toiletingScore,
        
        CASE bs.clientCooking 
            WHEN ''Self'' THEN 4 
            WHEN ''Partial Assistance'' THEN 2 
            WHEN ''Complete Assistance'' THEN 1 
            ELSE 0 
        END as cookingScore,
        
        CASE bs.clientCleaning 
            WHEN ''Self'' THEN 4 
            WHEN ''Partial Assistance'' THEN 2 
            WHEN ''Complete Assistance'' THEN 1 
            ELSE 0 
        END as cleaningScore,
        
        CASE bs.clientLaundry 
            WHEN ''Self'' THEN 4 
            WHEN ''Partial Assistance'' THEN 2 
            WHEN ''Complete Assistance'' THEN 1 
            ELSE 0 
        END as laundryScore,
        
        CASE bs.clientTakingMeds 
            WHEN ''Self'' THEN 4 
            WHEN ''Partial Assistance'' THEN 2 
            WHEN ''Complete Assistance'' THEN 1 
            ELSE 0 
        END as medicationScore,
        
        -- Independence Categories
        CASE 
            WHEN bs.adlPercentage >= 90 THEN ''Highly Independent''
            WHEN bs.adlPercentage >= 75 THEN ''Mostly Independent''
            WHEN bs.adlPercentage >= 50 THEN ''Partially Independent''
            ELSE ''Needs Significant Support''
        END as independenceCategory,
        
        -- Support Needs Assessment
        CASE 
            WHEN bs.adlPercentage < 25 THEN ''24/7 Care Required''
            WHEN bs.adlPercentage < 50 THEN ''Extensive Support Needed''
            WHEN bs.adlPercentage < 75 THEN ''Moderate Support Needed''
            WHEN bs.adlPercentage < 90 THEN ''Minimal Support Needed''
            ELSE ''Independent Living Capable''
        END as supportLevel,
        
        bs.clientFunctionalAssist as assistanceNotes,
        bs.createdAt as assessmentDate
        
    FROM BioSocialAssessment bs
    WHERE bs.isActive = 1
    ');
    PRINT '✅ View vw_BioSocialADLAnalysis created';
END
ELSE
BEGIN
    PRINT '⚠️  View vw_BioSocialADLAnalysis already exists';
END
GO

-- =============================================
-- 5. STORED PROCEDURES
-- =============================================

-- Procedure to get comprehensive bio-social profile
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name='sp_GetBioSocialProfile')
BEGIN
    EXEC('
    CREATE PROCEDURE [dbo].[sp_GetBioSocialProfile]
        @ClientID NVARCHAR(50)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- Get latest bio-social assessment overview
        SELECT * FROM vw_BioSocialOverview 
        WHERE clientID = @ClientID 
        ORDER BY createdAt DESC;
        
        -- Get ADL analysis
        SELECT * FROM vw_BioSocialADLAnalysis 
        WHERE clientID = @ClientID 
        ORDER BY assessmentDate DESC;
        
        -- Get financial trends (if multiple assessments exist)
        SELECT 
            createdAt as assessmentDate,
            totalMonthlyIncome,
            CASE 
                WHEN totalMonthlyIncome < 1000 THEN ''High Risk''
                WHEN totalMonthlyIncome < 2000 THEN ''Moderate Risk''
                ELSE ''Stable''
            END as financialStability
        FROM BioSocialAssessment
        WHERE clientID = @ClientID 
        AND isActive = 1
        ORDER BY createdAt DESC;
    END
    ');
    PRINT '✅ Procedure sp_GetBioSocialProfile created';
END
ELSE
BEGIN
    PRINT '⚠️  Procedure sp_GetBioSocialProfile already exists';
END
GO

-- Procedure to calculate and update ADL score
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name='sp_CalculateADLScore')
BEGIN
    EXEC('
    CREATE PROCEDURE [dbo].[sp_CalculateADLScore]
        @BioSocialID NVARCHAR(50),
        @UpdatedBy NVARCHAR(100)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @ADLScore INT = 0;
        DECLARE @ADLPercentage DECIMAL(5,2) = 0.00;
        
        -- Calculate ADL score based on individual ADL assessments
        SELECT @ADLScore = 
            CASE clientEating 
                WHEN ''Self'' THEN 4 
                WHEN ''Partial Assistance'' THEN 2 
                WHEN ''Complete Assistance'' THEN 1 
                ELSE 0 
            END +
            CASE clientBathing 
                WHEN ''Self'' THEN 4 
                WHEN ''Partial Assistance'' THEN 2 
                WHEN ''Complete Assistance'' THEN 1 
                ELSE 0 
            END +
            CASE clientBrushing 
                WHEN ''Self'' THEN 4 
                WHEN ''Partial Assistance'' THEN 2 
                WHEN ''Complete Assistance'' THEN 1 
                ELSE 0 
            END +
            CASE clientToileting 
                WHEN ''Self'' THEN 4 
                WHEN ''Partial Assistance'' THEN 2 
                WHEN ''Complete Assistance'' THEN 1 
                ELSE 0 
            END +
            CASE clientCooking 
                WHEN ''Self'' THEN 4 
                WHEN ''Partial Assistance'' THEN 2 
                WHEN ''Complete Assistance'' THEN 1 
                ELSE 0 
            END +
            CASE clientCleaning 
                WHEN ''Self'' THEN 4 
                WHEN ''Partial Assistance'' THEN 2 
                WHEN ''Complete Assistance'' THEN 1 
                ELSE 0 
            END +
            CASE clientLaundry 
                WHEN ''Self'' THEN 4 
                WHEN ''Partial Assistance'' THEN 2 
                WHEN ''Complete Assistance'' THEN 1 
                ELSE 0 
            END +
            CASE clientTakingMeds 
                WHEN ''Self'' THEN 4 
                WHEN ''Partial Assistance'' THEN 2 
                WHEN ''Complete Assistance'' THEN 1 
                ELSE 0 
            END
        FROM BioSocialAssessment 
        WHERE bioSocialID = @BioSocialID;
        
        -- Calculate percentage (max score is 32)
        SET @ADLPercentage = CAST((@ADLScore * 100.0 / 32) AS DECIMAL(5,2));
        
        -- Update the record
        UPDATE BioSocialAssessment 
        SET 
            adlScore = @ADLScore,
            adlPercentage = @ADLPercentage,
            updatedBy = @UpdatedBy,
            updatedAt = GETDATE()
        WHERE bioSocialID = @BioSocialID;
        
        -- Return results
        SELECT 
            @ADLScore as adlScore,
            @ADLPercentage as adlPercentage,
            CASE 
                WHEN @ADLPercentage >= 90 THEN ''Highly Independent''
                WHEN @ADLPercentage >= 75 THEN ''Mostly Independent''
                WHEN @ADLPercentage >= 50 THEN ''Partially Independent''
                ELSE ''Needs Significant Support''
            END as interpretation;
    END
    ');
    PRINT '✅ Procedure sp_CalculateADLScore created';
END
ELSE
BEGIN
    PRINT '⚠️  Procedure sp_CalculateADLScore already exists';
END
GO

-- Procedure to update total monthly income
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name='sp_UpdateTotalIncome')
BEGIN
    EXEC('
    CREATE PROCEDURE [dbo].[sp_UpdateTotalIncome]
        @BioSocialID NVARCHAR(50),
        @UpdatedBy NVARCHAR(100)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @TotalIncome DECIMAL(10,2) = 0.00;
        
        -- Calculate total monthly income from all sources
        SELECT @TotalIncome = 
            ISNULL(CAST(clientCalWorks AS DECIMAL), 0) +
            ISNULL(CAST(clientEmployment AS DECIMAL), 0) +
            ISNULL(CAST(clientFoodStamps AS DECIMAL), 0) +
            ISNULL(CAST(clientWidowBen AS DECIMAL), 0) +
            ISNULL(CAST(clientCS AS DECIMAL), 0) +
            ISNULL(CAST(clientGenRelief AS DECIMAL), 0) +
            ISNULL(CAST(clientSSI AS DECIMAL), 0) +
            ISNULL(CAST(clientSSDI AS DECIMAL), 0) +
            ISNULL(CAST(clientTANF AS DECIMAL), 0) +
            ISNULL(CAST(clientWorkComp AS DECIMAL), 0) +
            ISNULL(CAST(clientUnEmp AS DECIMAL), 0) +
            ISNULL(CAST(clientVetBen AS DECIMAL), 0) +
            ISNULL(CAST(clientStDis AS DECIMAL), 0) +
            ISNULL(CAST(clientInherit AS DECIMAL), 0) +
            ISNULL(CAST(clientOtherInc AS DECIMAL), 0)
        FROM BioSocialAssessment 
        WHERE bioSocialID = @BioSocialID;
        
        -- Update the record
        UPDATE BioSocialAssessment 
        SET 
            totalMonthlyIncome = @TotalIncome,
            updatedBy = @UpdatedBy,
            updatedAt = GETDATE()
        WHERE bioSocialID = @BioSocialID;
        
        -- Return results
        SELECT 
            @TotalIncome as totalMonthlyIncome,
            CASE 
                WHEN @TotalIncome < 1000 THEN ''High Risk''
                WHEN @TotalIncome < 2000 THEN ''Moderate Risk''
                WHEN @TotalIncome < 3000 THEN ''Stable''
                ELSE ''Well Secured''
            END as financialStability;
    END
    ');
    PRINT '✅ Procedure sp_UpdateTotalIncome created';
END
ELSE
BEGIN
    PRINT '⚠️  Procedure sp_UpdateTotalIncome already exists';
END
GO

-- Procedure to generate bio-social summary report
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name='sp_GenerateBioSocialSummary')
BEGIN
    EXEC('
    CREATE PROCEDURE [dbo].[sp_GenerateBioSocialSummary]
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
            ''Bio-Social Summary'' as ReportSection,
            COUNT(*) as TotalAssessments,
            COUNT(CASE WHEN completionStatus = ''Complete'' THEN 1 END) as CompletedAssessments,
            COUNT(CASE WHEN completionStatus = ''In Progress'' THEN 1 END) as InProgressAssessments,
            AVG(CAST(completionPercentage AS FLOAT)) as AvgCompletionPercentage,
            AVG(CAST(timeSpent AS FLOAT)) as AvgTimeSpentHours,
            AVG(totalMonthlyIncome) as AvgMonthlyIncome,
            AVG(CAST(adlScore AS FLOAT)) as AvgADLScore,
            AVG(CAST(adlPercentage AS FLOAT)) as AvgADLPercentage
        FROM BioSocialAssessment
        WHERE createdAt BETWEEN @StartDate AND @EndDate
        AND (@AssessorEmail IS NULL OR createdBy = @AssessorEmail)
        AND isActive = 1;
        
        -- Financial risk distribution
        SELECT 
            ''Financial Risk Distribution'' as ReportSection,
            COUNT(CASE WHEN totalMonthlyIncome < 1000 THEN 1 END) as HighRisk,
            COUNT(CASE WHEN totalMonthlyIncome BETWEEN 1000 AND 1999 THEN 1 END) as ModerateRisk,
            COUNT(CASE WHEN totalMonthlyIncome >= 2000 THEN 1 END) as Stable,
            COUNT(CASE WHEN clientDebt = ''Yes'' THEN 1 END) as ClientsWithDebt,
            COUNT(CASE WHEN payeeChoice = ''Yes'' THEN 1 END) as ClientsWithPayee
        FROM BioSocialAssessment
        WHERE createdAt BETWEEN @StartDate AND @EndDate
        AND (@AssessorEmail IS NULL OR createdBy = @AssessorEmail)
        AND isActive = 1;
        
        -- ADL independence distribution
        SELECT 
            ''ADL Independence Distribution'' as ReportSection,
            COUNT(CASE WHEN adlPercentage >= 90 THEN 1 END) as HighlyIndependent,
            COUNT(CASE WHEN adlPercentage BETWEEN 75 AND 89 THEN 1 END) as MostlyIndependent,
            COUNT(CASE WHEN adlPercentage BETWEEN 50 AND 74 THEN 1 END) as PartiallyIndependent,
            COUNT(CASE WHEN adlPercentage < 50 THEN 1 END) as NeedsSignificantSupport
        FROM BioSocialAssessment
        WHERE createdAt BETWEEN @StartDate AND @EndDate
        AND (@AssessorEmail IS NULL OR createdBy = @AssessorEmail)
        AND isActive = 1;
        
        -- Housing risk factors
        SELECT 
            ''Housing Risk Factors'' as ReportSection,
            COUNT(CASE WHEN clientEvicted = ''Yes'' THEN 1 END) as EvictionHistory,
            COUNT(CASE WHEN clientLandlordProb = ''Yes'' THEN 1 END) as LandlordProblems,
            COUNT(CASE WHEN clientUtilityBill = ''Yes'' THEN 1 END) as OutstandingUtilities,
            COUNT(CASE WHEN housingStability = ''Unstable'' THEN 1 END) as UnstableHousing,
            COUNT(CASE WHEN clientCreditRating IN (''Poor'', ''Very Poor'') THEN 1 END) as PoorCredit
        FROM BioSocialAssessment
        WHERE createdAt BETWEEN @StartDate AND @EndDate
        AND (@AssessorEmail IS NULL OR createdBy = @AssessorEmail)
        AND isActive = 1;
    END
    ');
    PRINT '✅ Procedure sp_GenerateBioSocialSummary created';
END
ELSE
BEGIN
    PRINT '⚠️  Procedure sp_GenerateBioSocialSummary already exists';
END
GO

-- =============================================
-- 6. TRIGGERS FOR AUTOMATIC CALCULATIONS
-- =============================================

-- Trigger to automatically calculate totals when ADL or income fields are updated
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name='tr_BioSocialAssessment_AutoCalculate')
BEGIN
    EXEC('
    CREATE TRIGGER [dbo].[tr_BioSocialAssessment_AutoCalculate]
    ON [dbo].[BioSocialAssessment]
    AFTER INSERT, UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- Update total income for modified records
        UPDATE bs
        SET totalMonthlyIncome = 
            ISNULL(CAST(bs.clientCalWorks AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientEmployment AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientFoodStamps AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientWidowBen AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientCS AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientGenRelief AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientSSI AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientSSDI AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientTANF AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientWorkComp AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientUnEmp AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientVetBen AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientStDis AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientInherit AS DECIMAL), 0) +
            ISNULL(CAST(bs.clientOtherInc AS DECIMAL), 0)
        FROM BioSocialAssessment bs
        INNER JOIN inserted i ON bs.bioSocialID = i.bioSocialID;
        
        -- Update ADL score for modified records
        UPDATE bs
        SET 
            adlScore = 
                CASE bs.clientEating 
                    WHEN ''Self'' THEN 4 WHEN ''Partial Assistance'' THEN 2 WHEN ''Complete Assistance'' THEN 1 ELSE 0 
                END +
                CASE bs.clientBathing 
                    WHEN ''Self'' THEN 4 WHEN ''Partial Assistance'' THEN 2 WHEN ''Complete Assistance'' THEN 1 ELSE 0 
                END +
                CASE bs.clientBrushing 
                    WHEN ''Self'' THEN 4 WHEN ''Partial Assistance'' THEN 2 WHEN ''Complete Assistance'' THEN 1 ELSE 0 
                END +
                CASE bs.clientToileting 
                    WHEN ''Self'' THEN 4 WHEN ''Partial Assistance'' THEN 2 WHEN ''Complete Assistance'' THEN 1 ELSE 0 
                END +
                CASE bs.clientCooking 
                    WHEN ''Self'' THEN 4 WHEN ''Partial Assistance'' THEN 2 WHEN ''Complete Assistance'' THEN 1 ELSE 0 
                END +
                CASE bs.clientCleaning 
                    WHEN ''Self'' THEN 4 WHEN ''Partial Assistance'' THEN 2 WHEN ''Complete Assistance'' THEN 1 ELSE 0 
                END +
                CASE bs.clientLaundry 
                    WHEN ''Self'' THEN 4 WHEN ''Partial Assistance'' THEN 2 WHEN ''Complete Assistance'' THEN 1 ELSE 0 
                END +
                CASE bs.clientTakingMeds 
                    WHEN ''Self'' THEN 4 WHEN ''Partial Assistance'' THEN 2 WHEN ''Complete Assistance'' THEN 1 ELSE 0 
                END
        FROM BioSocialAssessment bs
        INNER JOIN inserted i ON bs.bioSocialID = i.bioSocialID;
        
        -- Update ADL percentage
        UPDATE bs
        SET adlPercentage = CAST((bs.adlScore * 100.0 / 32) AS DECIMAL(5,2))
        FROM BioSocialAssessment bs
        INNER JOIN inserted i ON bs.bioSocialID = i.bioSocialID;
    END
    ');
    PRINT '✅ Trigger tr_BioSocialAssessment_AutoCalculate created';
END
ELSE
BEGIN
    PRINT '⚠️  Trigger tr_BioSocialAssessment_AutoCalculate already exists';
END
GO

-- =============================================
-- 7. DEFAULT DATA AND CONSTRAINTS
-- =============================================

-- Add foreign key constraint to link with AssessmentCarePlans if that table exists
IF EXISTS (SELECT * FROM sysobjects WHERE name='AssessmentCarePlans' AND xtype='U')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name='FK_BioSocialAssessment_AssessmentCarePlans')
    BEGIN
        ALTER TABLE [dbo].[BioSocialAssessment]
        ADD CONSTRAINT [FK_BioSocialAssessment_AssessmentCarePlans]
        FOREIGN KEY ([assessmentID]) REFERENCES [dbo].[AssessmentCarePlans]([assessmentID]);
        
        PRINT '✅ Foreign key constraint FK_BioSocialAssessment_AssessmentCarePlans added';
    END
END

-- =============================================
-- 8. SAMPLE DATA FOR TESTING (Optional)
-- =============================================

/*
-- Uncomment to insert sample data for testing

INSERT INTO BioSocialAssessment (
    bioSocialID, clientID, assessmentID,
    clientCalWorks, clientEmployment, clientFoodStamps, clientGenRelief, clientSSI,
    payeeChoice, payeeName, payeePhone,
    clientBeenEmployed, clientEmpIntr, clientEmployed,
    clientDebt, clientBankrupt,
    clientPastRenter, clientEvicted, clientCreditRating,
    clientEating, clientBathing, clientToileting, clientCooking,
    completionStatus, createdBy
) VALUES (
    ''BS-TEST-001'', ''CLIENT-123'', ''ACP-2025-0001'',
    ''450.00'', ''0.00'', ''200.00'', ''300.00'', ''850.00'',
    ''Yes'', ''Mary Johnson'', ''(555) 123-4567'',
    ''Yes'', ''Yes'', ''No'',
    ''No'', ''No'',
    ''Yes'', ''No'', ''Fair'',
    ''Self'', ''Self'', ''Self'', ''Partial Assistance'',
    ''Complete'', ''test@example.com''
);
*/

PRINT '===========================================';
PRINT 'Bio-Social Assessment Database Setup Complete!';
PRINT '===========================================';
PRINT '';
PRINT '✅ Tables Created:';
PRINT '   - BioSocialAssessment (Main bio-social data)';
PRINT '   - BioSocialFinancialHistory (Historical tracking)';
PRINT '';
PRINT '✅ Views Created:';
PRINT '   - vw_BioSocialOverview (Comprehensive overview)';
PRINT '   - vw_BioSocialFinancialAnalytics (Financial analytics)';
PRINT '   - vw_BioSocialADLAnalysis (ADL analysis)';
PRINT '';
PRINT '✅ Stored Procedures Created:';
PRINT '   - sp_GetBioSocialProfile (Get client profile)';
PRINT '   - sp_CalculateADLScore (Calculate ADL scores)';
PRINT '   - sp_UpdateTotalIncome (Update income totals)';
PRINT '   - sp_GenerateBioSocialSummary (Generate reports)';
PRINT '';
PRINT '✅ Triggers Created:';
PRINT '   - tr_BioSocialAssessment_AutoCalculate (Auto calculations)';
PRINT '';
PRINT '✅ Indexes Created for optimal performance';
PRINT '';
PRINT '🚀 Ready for Bio-Social Assessment integration!';
PRINT '';

-- Example usage:
/*
-- Get bio-social profile
EXEC sp_GetBioSocialProfile ''CLIENT-123'';

-- Calculate ADL score
EXEC sp_CalculateADLScore ''BS-TEST-001'', ''user@example.com'';

-- Update total income
EXEC sp_UpdateTotalIncome ''BS-TEST-001'', ''user@example.com'';

-- Generate summary report
EXEC sp_GenerateBioSocialSummary;
*/