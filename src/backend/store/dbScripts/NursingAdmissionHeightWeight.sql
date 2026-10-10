-- Adds Height and Weight to the Section 5 Nursing Assessment (dbo.nursing_admission).
-- Free text like the other vital signs (cpT, cpP, cpR, cpBP), e.g. height 5' 9", weight 165 (lbs).
-- Safe to run more than once.
IF COL_LENGTH('dbo.nursing_admission', 'height') IS NULL
    ALTER TABLE dbo.nursing_admission ADD height NVARCHAR(50) NULL;

IF COL_LENGTH('dbo.nursing_admission', 'weight') IS NULL
    ALTER TABLE dbo.nursing_admission ADD weight NVARCHAR(50) NULL;
GO
