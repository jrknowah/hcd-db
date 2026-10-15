-- ========================================
-- Client program and discharge status (dbo.Clients)
--   clientProgram        - LAHSA / ODR / DHS / DMH, chosen on the Section 1 Face Sheet
--   clientDischargeDate  - exit date from the Section 1 Exit Form; the client shows
--                          as Discharged on the dashboard once this date arrives
--   clientExitReason     - exit reason from the Exit Form
-- Saving the Exit Form keeps the last two in step (routes/exitForm.js).
--
-- Idempotent: safe to run more than once. Run BEFORE deploying the backend
-- that reads these columns.
-- ========================================
IF COL_LENGTH('dbo.Clients', 'clientProgram') IS NULL
    ALTER TABLE dbo.Clients ADD clientProgram NVARCHAR(50) NULL;

IF COL_LENGTH('dbo.Clients', 'clientDischargeDate') IS NULL
    ALTER TABLE dbo.Clients ADD clientDischargeDate DATE NULL;

IF COL_LENGTH('dbo.Clients', 'clientExitReason') IS NULL
    ALTER TABLE dbo.Clients ADD clientExitReason NVARCHAR(255) NULL;
GO

-- Backfill from Exit Forms already saved
IF OBJECT_ID('dbo.exit_form', 'U') IS NOT NULL
BEGIN
    UPDATE c
    SET c.clientDischargeDate = e.exitDate,
        c.clientExitReason    = e.exitReason
    FROM dbo.Clients c
    JOIN dbo.exit_form e ON e.clientID = c.clientID
    WHERE e.exitDate IS NOT NULL
      AND c.clientDischargeDate IS NULL;

    PRINT CONCAT('Backfilled discharge dates for ', @@ROWCOUNT, ' client(s)');
END
GO
