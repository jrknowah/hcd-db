-- reassessmentDiagCode.sql (Azure SQL / T-SQL)
--
-- Section 3 Re-Assessment: the ICD Code field can hold several codes
-- (e.g. "300.02 309.81 F32.9 F10.11"), but diagDescriptCode was created too
-- short, so saving failed with "String or binary data would be truncated".
-- Widens the column to NVARCHAR(255). Safe to re-run: only alters a column
-- that is still shorter than 255 characters. The backend also applies this
-- automatically on the first Re-Assessment save (reassessmentService.js).

IF COLUMNPROPERTY(OBJECT_ID('dbo.ReassessmentData'), 'diagDescriptCode', 'CharMaxLength') BETWEEN 1 AND 254
    ALTER TABLE dbo.ReassessmentData ALTER COLUMN diagDescriptCode NVARCHAR(255) NULL;
GO
