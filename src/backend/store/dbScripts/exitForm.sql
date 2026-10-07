-- ========================================
-- Section 1: Exit Form (one per client)
-- Idempotent: safe to run more than once. Run before deploying the backend
-- that includes /api/exit-form.
-- ========================================
IF OBJECT_ID('dbo.exit_form', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.exit_form (
        id                    INT IDENTITY(1,1) PRIMARY KEY,
        clientID              NVARCHAR(50)  NOT NULL CONSTRAINT UQ_exit_form_clientID UNIQUE,

        -- Exit request notification
        staffNotifiedDate     DATE          NULL,
        employeeNotified      NVARCHAR(255) NULL,
        notificationMethods   NVARCHAR(MAX) NULL,   -- JSON array: "Called", "Emailed"

        -- Submitting staff
        formDate              DATE          NULL,
        agency                NVARCHAR(255) NULL,
        staffName             NVARCHAR(255) NULL,
        staffPhone            NVARCHAR(255) NULL,

        -- Stay
        admitDate             DATE          NULL,   -- Interim Housing admit date
        exitDate              DATE          NULL,   -- Interim Housing exit date
        lengthOfStay          INT           NULL,   -- days, intake date counted, exit date not

        -- ICMS
        icmsProvider          NVARCHAR(255) NULL,
        icmsNotified          NVARCHAR(255) NULL,   -- Yes / No
        icmsCaseManager       NVARCHAR(255) NULL,
        icmsCaseManagerPhone  NVARCHAR(255) NULL,

        -- Exit reason
        exitReason            NVARCHAR(255) NULL,
        levelOfCareChange     NVARCHAR(255) NULL,   -- when exitReason = Change in Level of Care
        levelOfCareOther      NVARCHAR(255) NULL,
        permanentHousingType  NVARCHAR(255) NULL,   -- when the client moves to permanent housing
        otherReason           NVARCHAR(MAX) NULL,
        additionalInfo        NVARCHAR(MAX) NULL,
        dischargeDestination  NVARCHAR(MAX) NULL,

        createdBy             NVARCHAR(255) NULL,
        createdAt             DATETIME2     NOT NULL CONSTRAINT DF_exit_form_createdAt DEFAULT SYSUTCDATETIME(),
        updatedBy             NVARCHAR(255) NULL,
        updatedAt             DATETIME2     NULL
    );
    PRINT 'Created dbo.exit_form';
END
ELSE
    PRINT 'dbo.exit_form already exists';
