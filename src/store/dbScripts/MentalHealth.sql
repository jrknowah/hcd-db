-- =========================================
-- MENTAL HEALTH DATABASE SCHEMA
-- =========================================

-- Main mental health assessments table
CREATE TABLE mental_health_assessments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(50) NOT NULL,
    
    -- Basic Mental Health History
    mental_health_history VARCHAR(10), -- Yes/No
    mental_health_diagnosis JSON, -- Array of diagnoses
    mental_health_treatment VARCHAR(10), -- Yes/No
    mental_health_current_treatment VARCHAR(10), -- Yes/No
    
    -- Symptom Assessment
    mh_sad VARCHAR(50), -- How often feel sad
    mh_anxious VARCHAR(50), -- How often feel anxious
    mh_sleep_pattern VARCHAR(50), -- Sleep pattern
    mh_energy_level VARCHAR(50), -- Energy level
    mh_concentrate VARCHAR(10), -- Difficulty concentrating Yes/No
    mh_thoughts VARCHAR(10), -- Thoughts/voices Yes/No
    mh_mind_read VARCHAR(10), -- Mind reading thoughts Yes/No
    mh_voices VARCHAR(10), -- Hear voices Yes/No
    mh_voices_say TEXT, -- What voices say
    mh_following VARCHAR(10), -- Someone following Yes/No
    mh_someone TEXT, -- Who is following and why
    mh_fam_history VARCHAR(10), -- Family history Yes/No
    mh_summary TEXT, -- Mental health screening summary
    
    -- Risk Assessment
    mh_abuse JSON, -- History of abuse (multi-select)
    client_risk JSON, -- Danger to self/others (multi-select)
    mh_self_harm VARCHAR(10), -- Past thoughts of self harm Yes/No
    mh_self_harm_occurrence VARCHAR(255), -- When last occurred
    mh_suicide VARCHAR(10), -- Past suicide attempts Yes/No
    mh_suicide_last VARCHAR(255), -- When last occurred
    mh_risk_summary TEXT, -- Risk screening summary
    
    -- Substance Abuse
    mh_sub_abuse_help VARCHAR(10), -- Ever received help Yes/No
    mh_sub_ab_sum TEXT, -- Substance abuse summary
    
    -- Legal Issues
    client_legal_issues JSON, -- Current legal issues (multi-select)
    client_legal_probation TEXT, -- Probation details
    client_legal_parole TEXT, -- Parole details
    client_legal_arrests TEXT, -- Arrest details
    client_legal_other TEXT, -- Other legal issues
    
    -- Arrest Screening Questions
    arrest_meth VARCHAR(10), -- Arrested for meth production Yes/No
    arrest_drug_alcohol VARCHAR(10), -- Arrested for drug/alcohol Yes/No
    arrest_violent VARCHAR(10), -- Arrested for violent crime Yes/No
    arrest_arson VARCHAR(10), -- Arrested for arson Yes/No
    arrest_sex_crime VARCHAR(10), -- Arrested for sex crime Yes/No
    reg_sex_offender VARCHAR(10), -- Registered sex offender Yes/No
    arrest_crime VARCHAR(10), -- Ever arrested Yes/No
    mh_legal_sum TEXT, -- Legal summary notes
    
    -- Needs Assessment
    client_pat_fam_needs JSON, -- Patient/Family needs (multi-select)
    mh_needs_sum TEXT, -- Needs assessment summary
    
    -- Case Manager Observations
    cm_ob1 JSON, -- Grooming & Hygiene
    cm_ob2 JSON, -- Eye Contact
    cm_ob3 JSON, -- Motor Activity
    cm_ob4 JSON, -- Speech
    cm_ob5 JSON, -- Interaction Style
    cm_ob6 JSON, -- Mood
    cm_ob7 JSON, -- Affect
    cm_ob8 JSON, -- Associations
    cm_ob9 JSON, -- Concentration
    cm_ob10 JSON, -- Behavioral Disturbances
    cm_ob11 JSON, -- Passive
    cm_ob_none JSON, -- None Apparent
    cm_obv_sum TEXT, -- Observations summary
    
    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_client_id (client_id),
    INDEX idx_created_at (created_at)
);

-- Mental health providers table
CREATE TABLE mental_health_providers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(50) NOT NULL,
    agency VARCHAR(255),
    worker VARCHAR(255), -- Mental health worker name
    phone VARCHAR(50),
    last_appointment DATE,
    next_appointment DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_client_id (client_id),
    INDEX idx_active (active)
);

-- Mental health hospitalizations table
CREATE TABLE mental_health_hospitalizations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(50) NOT NULL,
    location VARCHAR(255), -- Hospital/facility name
    reasons TEXT, -- Reasons for hospitalization
    date DATE, -- Date of hospitalization
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client_id (client_id),
    INDEX idx_date (date)
);

-- Mental health medications table
CREATE TABLE mental_health_medications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(50) NOT NULL,
    name VARCHAR(255), -- Medication name
    dose VARCHAR(255), -- Dose and frequency
    side_effects TEXT, -- Effectiveness and side effects
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_client_id (client_id),
    INDEX idx_active (active)
);

-- Substance abuse data table
CREATE TABLE substance_abuse_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(50) NOT NULL,
    substance_name VARCHAR(100), -- Alcohol, Cocaine, etc.
    substance_use VARCHAR(50), -- yes/no/past
    frequency VARCHAR(50), -- How often
    method VARCHAR(255), -- Method/Amount per use
    year_started VARCHAR(10), -- Year started using
    year_quit VARCHAR(10), -- Year quit (if applicable)
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client_id (client_id),
    INDEX idx_substance (substance_name),
    UNIQUE KEY unique_client_substance (client_id, substance_name)
);

-- Arrest records table
CREATE TABLE arrest_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(50) NOT NULL,
    date DATE, -- Date of arrest
    charge TEXT, -- Charge description
    misdemeanor_or_felony CHAR(1), -- M or F
    location VARCHAR(255), -- Location of offense
    time_served VARCHAR(255), -- Time served
    result TEXT, -- Result/outcome
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client_id (client_id),
    INDEX idx_date (date)
);

-- Mental health incidents table (for abuse/trauma incidents)
CREATE TABLE mental_health_incidents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(50) NOT NULL,
    incident_type VARCHAR(255), -- Type of incident
    date_reported DATE,
    filed_by VARCHAR(255), -- Who filed the report
    status VARCHAR(100), -- Status of incident
    description TEXT, -- Additional details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client_id (client_id),
    INDEX idx_date_reported (date_reported)
);

-- Treatment programs table (for substance abuse treatment history)
CREATE TABLE treatment_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(50) NOT NULL,
    program_name VARCHAR(255),
    date_received DATE,
    treatment_type VARCHAR(255), -- Detox, Outpatient, Residential, etc.
    outcome VARCHAR(255), -- Completed, Ongoing, Discontinued, etc.
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_client_id (client_id),
    INDEX idx_date_received (date_received)
);

-- =========================================
-- SAMPLE DATA INSERTS
-- =========================================

-- Sample mental health assessment
INSERT INTO mental_health_assessments (
    client_id,
    mental_health_history,
    mental_health_diagnosis,
    mental_health_treatment,
    mental_health_current_treatment,
    mh_sad,
    mh_anxious,
    mh_sleep_pattern,
    mh_energy_level,
    mh_concentrate,
    mh_thoughts,
    mh_voices,
    mh_summary,
    mh_abuse,
    client_risk,
    mh_self_harm,
    mh_suicide,
    client_pat_fam_needs,
    mh_needs_sum,
    cm_ob1,
    cm_ob2,
    cm_ob3,
    cm_obv_sum,
    created_by
) VALUES (
    'SAMPLE001',
    'Yes',
    '["Depression", "Anxiety"]',
    'Yes',
    'Yes',
    'Several Days',
    'Over Half the Days',
    'Sleep too little',
    'Low',
    'Yes',
    'No',
    'No',
    'Client shows signs of depression and anxiety, currently managing with treatment.',
    '["History of physical/sexual/emotional abuse"]',
    '["Denies thoughts"]',
    'No',
    'No',
    '["Mental Health", "Housing", "Benefits (e.g. Medi-Cal, GR, SSI, etc.)"]',
    'Client requires ongoing mental health support, stable housing, and benefits assistance.',
    '["Well Groomed"]',
    '["Normal for culture"]',
    '["Calm"]',
    'Client appears well-groomed and cooperative. Shows appropriate emotional responses.',
    'system@example.com'
);

-- Sample provider
INSERT INTO mental_health_providers (
    client_id,
    agency,
    worker,
    phone,
    last_appointment,
    next_appointment
) VALUES (
    'SAMPLE001',
    'Community Mental Health Center',
    'Dr. Sarah Johnson',
    '(555) 123-4567',
    '2024-03-10',
    '2024-03-17'
);

-- Sample hospitalization
INSERT INTO mental_health_hospitalizations (
    client_id,
    location,
    reasons,
    date
) VALUES (
    'SAMPLE001',
    'UCLA Medical Center',
    'Severe depression, suicidal ideation',
    '2020-06-15'
);

-- Sample medication
INSERT INTO mental_health_medications (
    client_id,
    name,
    dose,
    side_effects
) VALUES (
    'SAMPLE001',
    'Sertraline',
    '50mg daily',
    'Mild nausea, effective for depression'
);

-- Sample substance abuse data
INSERT INTO substance_abuse_data (
    client_id,
    substance_name,
    substance_use,
    frequency,
    method,
    year_started,
    year_quit,
    created_by
) VALUES 
(
    'SAMPLE001',
    'Alcohol',
    'past',
    '',
    'Drinking',
    '2015',
    '2020',
    'system@example.com'
),
(
    'SAMPLE001',
    'Tobacco',
    'no',
    '',
    '',
    '',
    '',
    'system@example.com'
);

-- Sample arrest record
INSERT INTO arrest_records (
    client_id,
    date,
    charge,
    misdemeanor_or_felony,
    location,
    time_served,
    result,
    created_by
) VALUES (
    'SAMPLE001',
    '2019-05-20',
    'Public intoxication',
    'M',
    'Los Angeles, CA',
    '1 day',
    'Fine paid',
    'system@example.com'
);

-- =========================================
-- USEFUL QUERIES
-- =========================================

-- Get complete mental health assessment for a client
SELECT 
    mha.*,
    GROUP_CONCAT(DISTINCT CONCAT(mhp.agency, ' - ', mhp.worker) SEPARATOR '; ') as current_providers,
    COUNT(DISTINCT mhh.id) as hospitalization_count,
    COUNT(DISTINCT mhm.id) as medication_count,
    COUNT(DISTINCT ar.id) as arrest_count
FROM mental_health_assessments mha
LEFT JOIN mental_health_providers mhp ON mha.client_id = mhp.client_id AND mhp.active = 1
LEFT JOIN mental_health_hospitalizations mhh ON mha.client_id = mhh.client_id
LEFT JOIN mental_health_medications mhm ON mha.client_id = mhm.client_id AND mhm.active = 1
LEFT JOIN arrest_records ar ON mha.client_id = ar.client_id
WHERE mha.client_id = 'SAMPLE001'
GROUP BY mha.id
ORDER BY mha.created_at DESC;

-- Get clients with high risk indicators
SELECT 
    client_id,
    JSON_EXTRACT(client_risk, '$') as risk_factors,
    mh_self_harm,
    mh_suicide,
    created_at
FROM mental_health_assessments 
WHERE 
    JSON_LENGTH(client_risk) > 0 
    OR mh_self_harm = 'Yes' 
    OR mh_suicide = 'Yes'
ORDER BY created_at DESC;

-- Get substance abuse summary by client
SELECT 
    client_id,
    substance_name,
    substance_use,
    frequency,
    year_started,
    year_quit
FROM substance_abuse_data 
WHERE client_id = 'SAMPLE001'
ORDER BY substance_name;

-- Get clients needing specific services
SELECT 
    client_id,
    JSON_EXTRACT(client_pat_fam_needs, '$') as needs,
    mh_needs_sum,
    created_at
FROM mental_health_assessments
WHERE JSON_CONTAINS(client_pat_fam_needs, '"Mental Health"')
   OR JSON_CONTAINS(client_pat_fam_needs, '"Housing"')
ORDER BY created_at DESC;

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

-- Additional indexes for better query performance
CREATE INDEX idx_mha_risk_assessment ON mental_health_assessments(mh_self_harm, mh_suicide);
CREATE INDEX idx_mha_legal_issues ON mental_health_assessments(arrest_crime, arrest_violent, reg_sex_offender);
CREATE INDEX idx_providers_next_appt ON mental_health_providers(next_appointment) WHERE active = 1;
CREATE INDEX idx_medications_name ON mental_health_medications(name) WHERE active = 1;

-- =========================================
-- STORED PROCEDURES (Optional)
-- =========================================

DELIMITER //

-- Procedure to get complete mental health profile
CREATE PROCEDURE GetMentalHealthProfile(IN p_client_id VARCHAR(50))
BEGIN
    -- Main assessment
    SELECT * FROM mental_health_assessments 
    WHERE client_id = p_client_id 
    ORDER BY created_at DESC LIMIT 1;
    
    -- Current providers
    SELECT * FROM mental_health_providers 
    WHERE client_id = p_client_id AND active = 1;
    
    -- Hospitalizations
    SELECT * FROM mental_health_hospitalizations 
    WHERE client_id = p_client_id ORDER BY date DESC;
    
    -- Current medications
    SELECT * FROM mental_health_medications 
    WHERE client_id = p_client_id AND active = 1;
    
    -- Substance abuse data
    SELECT * FROM substance_abuse_data 
    WHERE client_id = p_client_id;
    
    -- Arrest records
    SELECT * FROM arrest_records 
    WHERE client_id = p_client_id ORDER BY date DESC;
END //

-- Procedure to archive old assessments
CREATE PROCEDURE ArchiveOldAssessments(IN days_old INT)
BEGIN
    UPDATE mental_health_assessments 
    SET archived = 1 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_old DAY)
    AND archived IS NULL;
END //

DELIMITER ;

-- =========================================
-- VIEWS FOR COMMON QUERIES
-- =========================================

-- View for active mental health clients
CREATE VIEW active_mental_health_clients AS
SELECT 
    mha.client_id,
    mha.mental_health_history,
    mha.mental_health_current_treatment,
    COUNT(DISTINCT mhp.id) as provider_count,
    COUNT(DISTINCT mhm.id) as medication_count,
    mha.updated_at as last_assessment_date
FROM mental_health_assessments mha
LEFT JOIN mental_health_providers mhp ON mha.client_id = mhp.client_id AND mhp.active = 1
LEFT JOIN mental_health_medications mhm ON mha.client_id = mhm.client_id AND mhm.active = 1
WHERE mha.mental_health_current_treatment = 'Yes'
GROUP BY mha.client_id, mha.id;

-- View for high-risk clients
CREATE VIEW high_risk_mental_health_clients AS
SELECT 
    client_id,
    mh_self_harm,
    mh_suicide,
    client_risk,
    mh_risk_summary,
    created_at
FROM mental_health_assessments
WHERE 
    mh_self_harm = 'Yes' 
    OR mh_suicide = 'Yes' 
    OR JSON_LENGTH(client_risk) > 0;

-- =========================================
-- BACKUP AND MAINTENANCE
-- =========================================

-- Regular backup command (run from command line)
-- mysqldump -u username -p database_name mental_health_assessments mental_health_providers mental_health_hospitalizations mental_health_medications substance_abuse_data arrest_records > mental_health_backup.sql

-- Cleanup old temporary data (if needed)
-- DELETE FROM substance_abuse_data WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR) AND substance_use = '';

-- Monitor table sizes
-- SELECT 
--     table_name AS 'Table',
--     ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
-- FROM information_schema.tables 
-- WHERE table_schema = 'your_database_name'
-- AND table_name LIKE 'mental_health%' OR table_name IN ('arrest_records', 'substance_abuse_data')
-- ORDER BY (data_length + index_length) DESC;