-- ========================================
-- Client care team (dbo.Clients)
--   clientBehavioralStaffEmail / Name - assigned behavioral health person
--                                       (picked from the HOPE_case Entra group)
--   clientMedicalStaffEmail / Name    - assigned medical person
--                                       (picked from the HOPE_nursing Entra group)
-- The email is the person's sign-in name (UPN) and identifies them; the name
-- is kept for display so the dashboard needs no directory lookup.
-- Set from the client profile card (PUT /api/clients/:clientID).
--
-- A readmission's archived stay copies these with the rest of the row
-- (usp_ReadmitClient), so the care team of each earlier stay is kept.
--
-- Idempotent: safe to run more than once. Run BEFORE deploying the backend
-- that writes these columns.
-- ========================================
IF COL_LENGTH('dbo.Clients', 'clientBehavioralStaffEmail') IS NULL
    ALTER TABLE dbo.Clients ADD clientBehavioralStaffEmail NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.Clients', 'clientBehavioralStaffName') IS NULL
    ALTER TABLE dbo.Clients ADD clientBehavioralStaffName NVARCHAR(200) NULL;

IF COL_LENGTH('dbo.Clients', 'clientMedicalStaffEmail') IS NULL
    ALTER TABLE dbo.Clients ADD clientMedicalStaffEmail NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.Clients', 'clientMedicalStaffName') IS NULL
    ALTER TABLE dbo.Clients ADD clientMedicalStaffName NVARCHAR(200) NULL;
GO
