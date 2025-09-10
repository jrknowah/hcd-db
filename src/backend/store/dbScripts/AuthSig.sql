-- ========================================
-- Authorization Forms Database Schema
-- ========================================

-- Drop existing objects if they exist (for updates)
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_AuthorizationDashboard')
    DROP VIEW vw_AuthorizationDashboard;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_FormCompletionStatus')
    DROP VIEW vw_FormCompletionStatus;

IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_SubmissionTracking')
    DROP VIEW vw_SubmissionTracking;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_GetClientAuthorizationDashboard' AND type = 'P')
    DROP PROCEDURE sp_GetClientAuthorizationDashboard;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_UpdateFormStatus' AND type = 'P')
    DROP PROCEDURE sp_UpdateFormStatus;

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'sp_CalculateCompletionMetrics' AND type = 'P')
    DROP PROCEDURE sp_CalculateCompletionMetrics;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FormSubmissions')
    DROP TABLE FormSubmissions;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'FormAuditLog')
    DROP TABLE FormAuditLog;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'AuthorizationForms')
    DROP TABLE AuthorizationForms;

-- ========================================
-- CREATE TABLE: AuthorizationForms
-- ========================================

CREATE TABLE dbo.AuthorizationForms (
    -- Primary Key
    formID INT IDENTITY(1,1) PRIMARY KEY,
    clientID NVARCHAR(50) NOT NULL,
    
    -- Form Information
    formType NVARCHAR(50) NOT NULL,
    formTitle NVARCHAR(200) NULL,
    formDescription NVARCHAR(500) NULL,
    
    -- Form Data (JSON)
    checkboxData NVARCHAR(MAX) NULL,        -- JSON for checkbox states
    formData NVARCHAR(MAX) NULL,            -- JSON for additional form fields
    signature NVARCHAR(200) NULL,           -- Electronic signature
    
    -- Completion Tracking
    completionPercentage DECIMAL(5,2) NULL DEFAULT 0.00,
    status NVARCHAR(20) NOT NULL DEFAULT 'not_started',
    priority NVARCHAR(10) NOT NULL DEFAULT 'medium',
    
    -- Timestamps
    startedAt DATETIME2 NULL,
    completedAt DATETIME2 NULL,
    lastAutoSave DATETIME2 NULL,
    
    -- User Tracking
    completedBy NVARCHAR(100) NULL,
    witnessSignature NVARCHAR(200) NULL,
    witnessName NVARCHAR(100) NULL,
    
    -- Submission Tracking
    submissionID INT NULL,
    submittedAt DATETIME2 NULL,
    approvedAt DATETIME2 NULL,
    approvedBy NVARCHAR(100) NULL,
    
    -- Version Control
    version INT NOT NULL DEFAULT 1,
    isLatestVersion BIT NOT NULL DEFAULT 1,
    previousVersionID INT NULL,
    
    -- Audit Fields
    createdBy NVARCHAR(100) NOT NULL DEFAULT 'System',
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(100) NOT NULL DEFAULT 'System',
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT CHK_AuthForms_CompletionPercentage CHECK (completionPercentage BETWEEN 0 AND 100),
    CONSTRAINT CHK_AuthForms_Status CHECK (status IN ('not_started', 'draft', 'in_progress', 'completed', 'submitted', 'approved', 'rejected')),
    CONSTRAINT CHK_AuthForms_Priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT CHK_AuthForms_FormType CHECK (formType IN (
        'patient_orientation', 'client_rights', 'consent_treatment', 'housing_prescreen',
        'privacy_practice', 'lahmis_consent', 'phi_release', 'residence_policy',
        'auth_disclosure', 'termination_policy', 'advance_directive', 'client_grievances',
        'health_disclosure', 'consent_photo', 'housing_agreement'
    )),
    
    -- Foreign Key (if you have a Clients table)
    -- CONSTRAINT FK_AuthForms_Clients FOREIGN KEY (clientID) REFERENCES dbo.Clients(clientID)
);

-- ========================================
-- CREATE TABLE: FormSubmissions
-- ========================================

CREATE TABLE dbo.FormSubmissions (
    -- Primary Key
    submissionID INT IDENTITY(1,1) PRIMARY KEY,
    clientID NVARCHAR(50) NOT NULL,
    
    -- Submission Information
    submissionType NVARCHAR(50) NOT NULL DEFAULT 'complete_authorization',
    submissionNotes NVARCHAR(MAX) NULL,
    
    -- Status Tracking
    status NVARCHAR(20) NOT NULL DEFAULT 'submitted',
    submittedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    submittedBy NVARCHAR(100) NOT NULL,
    
    -- Review Process
    reviewedAt DATETIME2 NULL,
    reviewedBy NVARCHAR(100) NULL,
    reviewNotes NVARCHAR(MAX) NULL,
    
    -- Approval Process
    approvalStatus NVARCHAR(20) NULL,
    approvedAt DATETIME2 NULL,
    approvedBy NVARCHAR(100) NULL,
    approvalNotes NVARCHAR(MAX) NULL,
    
    -- Metrics
    totalFormsSubmitted INT NOT NULL DEFAULT 0,
    completionScore DECIMAL(5,2) NULL,
    processingTimeHours DECIMAL(10,2) NULL,
    
    -- Audit Fields
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT CHK_FormSub_Status CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'returned')),
    CONSTRAINT CHK_FormSub_ApprovalStatus CHECK (approvalStatus IN ('pending', 'approved', 'rejected', 'conditional'))
);

-- ========================================
-- CREATE TABLE: FormAuditLog
-- ========================================

CREATE TABLE dbo.FormAuditLog (
    -- Primary Key
    auditID INT IDENTITY(1,1) PRIMARY KEY,
    
    -- Reference Information
    formID INT NOT NULL,
    clientID NVARCHAR(50) NOT NULL,
    formType NVARCHAR(50) NOT NULL,
    
    -- Action Information
    actionType NVARCHAR(50) NOT NULL,
    actionDescription NVARCHAR(500) NULL,
    fieldChanged NVARCHAR(100) NULL,
    oldValue NVARCHAR(MAX) NULL,
    newValue NVARCHAR(MAX) NULL,
    
    -- User and Session Info
    performedBy NVARCHAR(100) NOT NULL,
    userRole NVARCHAR(50) NULL,
    sessionID NVARCHAR(100) NULL,
    ipAddress NVARCHAR(45) NULL,
    userAgent NVARCHAR(500) NULL,
    
    -- Timestamp
    performedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT CHK_FormAudit_ActionType CHECK (actionType IN (
        'created', 'updated', 'completed', 'submitted', 'approved', 'rejected',
        'auto_saved', 'signature_added', 'witness_signed', 'version_created'
    )),
    
    -- Foreign Key
    CONSTRAINT FK_FormAudit_AuthForms FOREIGN KEY (formID) REFERENCES dbo.AuthorizationForms(formID) ON DELETE CASCADE
);

-- ========================================
-- CREATE INDEXES
-- ========================================

-- AuthorizationForms indexes
CREATE NONCLUSTERED INDEX IX_AuthorizationForms_ClientID 
ON dbo.AuthorizationForms (clientID);

CREATE NONCLUSTERED INDEX IX_AuthorizationForms_FormType 
ON dbo.AuthorizationForms (formType);

CREATE NONCLUSTERED INDEX IX_AuthorizationForms_Status 
ON dbo.AuthorizationForms (status);

CREATE NONCLUSTERED INDEX IX_AuthorizationForms_Priority 
ON dbo.AuthorizationForms (priority);

CREATE NONCLUSTERED INDEX IX_AuthorizationForms_CompletedAt 
ON dbo.AuthorizationForms (completedAt);

CREATE NONCLUSTERED INDEX IX_AuthorizationForms_CreatedAt 
ON dbo.AuthorizationForms (createdAt DESC);

CREATE NONCLUSTERED INDEX IX_AuthorizationForms_SubmissionID 
ON dbo.AuthorizationForms (submissionID);

-- FormSubmissions indexes
CREATE NONCLUSTERED INDEX IX_FormSubmissions_ClientID 
ON dbo.FormSubmissions (clientID);

CREATE NONCLUSTERED INDEX IX_FormSubmissions_Status 
ON dbo.FormSubmissions (status);

CREATE NONCLUSTERED INDEX IX_FormSubmissions_SubmittedAt 
ON dbo.FormSubmissions (submittedAt DESC);

CREATE NONCLUSTERED INDEX IX_FormSubmissions_ApprovalStatus 
ON dbo.FormSubmissions (approvalStatus);

-- FormAuditLog indexes
CREATE NONCLUSTERED INDEX IX_FormAuditLog_FormID 
ON dbo.FormAuditLog (formID);

CREATE NONCLUSTERED INDEX IX_FormAuditLog_ClientID 
ON dbo.FormAuditLog (clientID);

CREATE NONCLUSTERED INDEX IX_FormAuditLog_ActionType 
ON dbo.FormAuditLog (actionType);

CREATE NONCLUSTERED INDEX IX_FormAuditLog_PerformedAt 
ON dbo.FormAuditLog (performedAt DESC);

-- Composite indexes
CREATE NONCLUSTERED INDEX IX_AuthorizationForms_ClientID_Status 
ON dbo.AuthorizationForms (clientID, status);

CREATE NONCLUSTERED INDEX IX_AuthorizationForms_ClientID_FormType 
ON dbo.AuthorizationForms (clientID, formType);

-- ========================================
-- CREATE VIEWS
-- ========================================

-- Complete authorization dashboard view
CREATE VIEW vw_AuthorizationDashboard AS
SELECT 
    af.clientID,
    af.formID,
    af.formType,
    af.formTitle,
    af.status,
    af.priority,
    af.completionPercentage,
    af.signature,
    af.completedAt,
    af.completedBy,
    af.submissionID,
    af.submittedAt,
    af.createdAt,
    af.updatedAt,
    
    -- Calculated fields
    CASE 
        WHEN af.status = 'completed' THEN 1
        ELSE 0
    END AS isCompleted,
    
    CASE 
        WHEN af.completedAt IS NOT NULL AND af.startedAt IS NOT NULL
        THEN DATEDIFF(MINUTE, af.startedAt, af.completedAt)
        ELSE NULL
    END AS completionTimeMinutes,
    
    CASE 
        WHEN af.status IN ('not_started', 'draft') THEN 'Not Started'
        WHEN af.status = 'in_progress' THEN 'In Progress'
        WHEN af.status = 'completed' THEN 'Completed'
        WHEN af.status = 'submitted' THEN 'Submitted'
        WHEN af.status = 'approved' THEN 'Approved'
        WHEN af.status = 'rejected' THEN 'Rejected'
        ELSE 'Unknown'
    END AS statusDisplay,
    
    CASE 
        WHEN af.priority = 'urgent' THEN 1
        WHEN af.priority = 'high' THEN 2
        WHEN af.priority = 'medium' THEN 3
        WHEN af.priority = 'low' THEN 4
        ELSE 5
    END AS priorityOrder,
    
    -- Form category (for UI grouping)
    CASE 
        WHEN af.formType IN ('patient_orientation', 'client_rights') THEN 'Intake'
        WHEN af.formType IN ('consent_treatment', 'phi_release', 'health_disclosure', 'advance_directive') THEN 'Medical'
        WHEN af.formType IN ('housing_prescreen', 'residence_policy', 'housing_agreement') THEN 'Housing'
        WHEN af.formType IN ('privacy_practice', 'auth_disclosure', 'termination_policy', 'client_grievances') THEN 'Legal'
        WHEN af.formType IN ('lahmis_consent') THEN 'Data'
        WHEN af.formType IN ('consent_photo') THEN 'Media'
        ELSE 'Other'
    END AS formCategory
    
FROM dbo.AuthorizationForms af
WHERE af.isLatestVersion = 1;

-- Form completion status summary
CREATE VIEW vw_FormCompletionStatus AS
SELECT 
    af.clientID,
    COUNT(*) AS totalForms,
    SUM(CASE WHEN af.status = 'completed' THEN 1 ELSE 0 END) AS completedForms,
    SUM(CASE WHEN af.status = 'submitted' THEN 1 ELSE 0 END) AS submittedForms,
    SUM(CASE WHEN af.status = 'approved' THEN 1 ELSE 0 END) AS approvedForms,
    SUM(CASE WHEN af.status IN ('not_started', 'draft') THEN 1 ELSE 0 END) AS notStartedForms,
    SUM(CASE WHEN af.status = 'in_progress' THEN 1 ELSE 0 END) AS inProgressForms,
    SUM(CASE WHEN af.priority = 'high' OR af.priority = 'urgent' THEN 1 ELSE 0 END) AS highPriorityForms,
    
    -- Completion percentage
    CASE 
        WHEN COUNT(*) > 0 
        THEN CAST(SUM(CASE WHEN af.status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100
        ELSE 0
    END AS overallCompletionPercentage,
    
    -- Average completion percentage across all forms
    AVG(af.completionPercentage) AS averageFormCompletion,
    
    -- Time metrics
    AVG(CASE 
        WHEN af.completedAt IS NOT NULL AND af.startedAt IS NOT NULL
        THEN DATEDIFF(MINUTE, af.startedAt, af.completedAt)
        ELSE NULL
    END) AS averageCompletionTimeMinutes,
    
    MIN(af.createdAt) AS firstFormStarted,
    MAX(af.completedAt) AS lastFormCompleted,
    MAX(af.updatedAt) AS lastActivity

FROM dbo.AuthorizationForms af
WHERE af.isLatestVersion = 1
GROUP BY af.clientID;

-- Submission tracking view
CREATE VIEW vw_SubmissionTracking AS
SELECT 
    fs.*,
    COUNT(af.formID) AS formsInSubmission,
    SUM(CASE WHEN af.status = 'approved' THEN 1 ELSE 0 END) AS approvedFormsCount,
    
    -- Processing time calculation
    CASE 
        WHEN fs.approvedAt IS NOT NULL 
        THEN DATEDIFF(HOUR, fs.submittedAt, fs.approvedAt)
        WHEN fs.reviewedAt IS NOT NULL
        THEN DATEDIFF(HOUR, fs.submittedAt, fs.reviewedAt)
        ELSE DATEDIFF(HOUR, fs.submittedAt, GETDATE())
    END AS processingHours,
    
    -- Status indicators
    CASE 
        WHEN fs.approvalStatus = 'approved' THEN 'Approved'
        WHEN fs.approvalStatus = 'rejected' THEN 'Rejected'
        WHEN fs.approvalStatus = 'conditional' THEN 'Conditional Approval'
        WHEN fs.status = 'under_review' THEN 'Under Review'
        ELSE 'Pending Review'
    END AS currentStatusDisplay

FROM dbo.FormSubmissions fs
LEFT JOIN dbo.AuthorizationForms af ON fs.submissionID = af.submissionID
GROUP BY fs.submissionID, fs.clientID, fs.submissionType, fs.submissionNotes,
         fs.status, fs.submittedAt, fs.submittedBy, fs.reviewedAt, fs.reviewedBy,
         fs.reviewNotes, fs.approvalStatus, fs.approvedAt, fs.approvedBy,
         fs.approvalNotes, fs.totalFormsSubmitted, fs.completionScore,
         fs.processingTimeHours, fs.createdAt, fs.updatedAt;

-- ========================================
-- CREATE STORED PROCEDURES
-- ========================================

-- Get complete client authorization dashboard
CREATE PROCEDURE sp_GetClientAuthorizationDashboard
    @ClientID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Main dashboard data
    SELECT * FROM vw_AuthorizationDashboard
    WHERE clientID = @ClientID
    ORDER BY priorityOrder, formType;
    
    -- Completion summary
    SELECT * FROM vw_FormCompletionStatus
    WHERE clientID = @ClientID;
    
    -- Recent activity (audit log)
    SELECT TOP 10 
        actionType,
        actionDescription,
        performedBy,
        performedAt
    FROM dbo.FormAuditLog
    WHERE clientID = @ClientID
    ORDER BY performedAt DESC;
    
    -- Submission history
    SELECT * FROM vw_SubmissionTracking
    WHERE clientID = @ClientID
    ORDER BY submittedAt DESC;
END;

-- Update form status with audit logging
CREATE PROCEDURE sp_UpdateFormStatus
    @FormID INT,
    @NewStatus NVARCHAR(20),
    @UpdatedBy NVARCHAR(100),
    @Notes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    DECLARE @OldStatus NVARCHAR(20);
    DECLARE @ClientID NVARCHAR(50);
    DECLARE @FormType NVARCHAR(50);
    
    -- Get current status
    SELECT @OldStatus = status, @ClientID = clientID, @FormType = formType
    FROM dbo.AuthorizationForms
    WHERE formID = @FormID;
    
    IF @@ROWCOUNT = 0
    BEGIN
        ROLLBACK TRANSACTION;
        RAISERROR('Form not found with ID: %d', 16, 1, @FormID);
        RETURN;
    END
    
    -- Update form status
    UPDATE dbo.AuthorizationForms
    SET status = @NewStatus,
        updatedBy = @UpdatedBy,
        updatedAt = GETDATE(),
        completedAt = CASE WHEN @NewStatus = 'completed' THEN GETDATE() ELSE completedAt END,
        completedBy = CASE WHEN @NewStatus = 'completed' THEN @UpdatedBy ELSE completedBy END
    WHERE formID = @FormID;
    
    -- Log the change
    INSERT INTO dbo.FormAuditLog (
        formID, clientID, formType, actionType, actionDescription, 
        fieldChanged, oldValue, newValue, performedBy, performedAt
    )
    VALUES (
        @FormID, @ClientID, @FormType, 'status_change',
        CONCAT('Status changed from ', @OldStatus, ' to ', @NewStatus, 
               CASE WHEN @Notes IS NOT NULL THEN '. Notes: ' + @Notes ELSE '' END),
        'status', @OldStatus, @NewStatus, @UpdatedBy, GETDATE()
    );
    
    COMMIT TRANSACTION;
    
    SELECT @@ROWCOUNT AS RowsAffected;
END;

-- Calculate and update completion metrics
CREATE PROCEDURE sp_CalculateCompletionMetrics
    @ClientID NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- If no specific client, update all clients
    IF @ClientID IS NULL
    BEGIN
        -- Update completion percentages for all forms based on their data
        UPDATE af
        SET completionPercentage = CASE 
            WHEN af.signature IS NOT NULL AND af.signature != '' THEN 100
            WHEN af.checkboxData IS NOT NULL AND af.checkboxData != '{}' THEN 75
            WHEN af.formData IS NOT NULL AND af.formData != '{}' THEN 50
            WHEN af.status != 'not_started' THEN 25
            ELSE 0
        END,
        updatedAt = GETDATE()
        FROM dbo.AuthorizationForms af
        WHERE af.isLatestVersion = 1;
    END
    ELSE
    BEGIN
        -- Update specific client
        UPDATE af
        SET completionPercentage = CASE 
            WHEN af.signature IS NOT NULL AND af.signature != '' THEN 100
            WHEN af.checkboxData IS NOT NULL AND af.checkboxData != '{}' THEN 75
            WHEN af.formData IS NOT NULL AND af.formData != '{}' THEN 50
            WHEN af.status != 'not_started' THEN 25
            ELSE 0
        END,
        updatedAt = GETDATE()
        FROM dbo.AuthorizationForms af
        WHERE af.clientID = @ClientID AND af.isLatestVersion = 1;
    END
    
    SELECT @@ROWCOUNT AS FormsUpdated;
END;

-- ========================================
-- INSERT SAMPLE DATA (Optional)
-- ========================================

-- Uncomment to insert sample data for testing
/*
-- Sample authorization forms
INSERT INTO dbo.AuthorizationForms (
    clientID, formType, formTitle, status, priority, completionPercentage,
    signature, checkboxData, createdBy, updatedBy
) VALUES 
('CLIENT-SAMPLE-001', 'patient_orientation', 'Patient Orientation Information Sheet', 'completed', 'high', 100,
 'John Doe', '{"Client Rights and Responsibilities": true, "Privacy Practices Notice": true}', 'System', 'System'),

('CLIENT-SAMPLE-001', 'client_rights', 'Client Rights and Responsibilities', 'in_progress', 'high', 60,
 NULL, '{}', 'System', 'System'),

('CLIENT-SAMPLE-001', 'consent_treatment', 'Consent for Treatment and Services', 'not_started', 'high', 0,
 NULL, '{}', 'System', 'System');

-- Sample audit log entries
INSERT INTO dbo.FormAuditLog (
    formID, clientID, formType, actionType, actionDescription, performedBy
) VALUES 
(1, 'CLIENT-SAMPLE-001', 'patient_orientation', 'created', 'Form created for client', 'System'),
(1, 'CLIENT-SAMPLE-001', 'patient_orientation', 'completed', 'Form completed with signature', 'john.doe@hospital.com'),
(2, 'CLIENT-SAMPLE-001', 'client_rights', 'created', 'Form created for client', 'System');
*/

-- ========================================
-- GRANTS (Update based on your security model)
-- ========================================

-- Grant permissions to application roles
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.AuthorizationForms TO [YourApplicationRole];
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.FormSubmissions TO [YourApplicationRole];
-- GRANT SELECT, INSERT ON dbo.FormAuditLog TO [YourApplicationRole];
-- GRANT SELECT ON vw_AuthorizationDashboard TO [YourReportingRole];
-- GRANT SELECT ON vw_FormCompletionStatus TO [YourReportingRole];
-- GRANT SELECT ON vw_SubmissionTracking TO [YourManagerRole];

PRINT 'Authorization Forms database schema created successfully!';
PRINT 'Tables created: AuthorizationForms, FormSubmissions, FormAuditLog';
PRINT 'Views created: vw_AuthorizationDashboard, vw_FormCompletionStatus, vw_SubmissionTracking';
PRINT 'Stored procedures created: sp_GetClientAuthorizationDashboard, sp_UpdateFormStatus, sp_CalculateCompletionMetrics';
PRINT 'Indexes created for optimal performance';
PRINT 'Ready for Authorization Forms system integration!';