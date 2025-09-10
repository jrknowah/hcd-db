-- EncounterNotes Table Creation Script
-- This table stores encounter notes for clients

-- Drop table if it exists (for development/testing)
-- IF OBJECT_ID('dbo.EncounterNotes', 'U') IS NOT NULL
-- DROP TABLE dbo.EncounterNotes;

CREATE TABLE dbo.EncounterNotes (
    encounterNoteID INT IDENTITY(1,1) PRIMARY KEY,
    clientID NVARCHAR(50) NOT NULL,
    careNoteDate DATE NOT NULL,
    careNoteType NVARCHAR(50) NOT NULL,
    careNoteSite NVARCHAR(100) NULL,
    careNote NVARCHAR(MAX) NOT NULL,
    createdBy NVARCHAR(255) NOT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedBy NVARCHAR(255) NULL,
    updatedAt DATETIME2 NULL
);

-- Create indexes for better performance
CREATE INDEX IX_EncounterNotes_ClientID 
ON dbo.EncounterNotes (clientID);

CREATE INDEX IX_EncounterNotes_CareNoteDate 
ON dbo.EncounterNotes (careNoteDate DESC);

CREATE INDEX IX_EncounterNotes_ClientID_Date 
ON dbo.EncounterNotes (clientID, careNoteDate DESC);

CREATE INDEX IX_EncounterNotes_CreatedAt 
ON dbo.EncounterNotes (createdAt DESC);

-- Add constraints
ALTER TABLE dbo.EncounterNotes
ADD CONSTRAINT CK_EncounterNotes_CareNoteType 
CHECK (careNoteType IN ('Individual', 'Group', 'Crisis', 'Intake', 'Summary', 'Phone', 'Email', 'Other'));

-- Foreign key constraint (uncomment if you have a Clients table)
-- ALTER TABLE dbo.EncounterNotes
-- ADD CONSTRAINT FK_EncounterNotes_ClientID 
-- FOREIGN KEY (clientID) REFERENCES dbo.Clients(clientID);

-- Sample data for testing (optional)
/*
INSERT INTO dbo.EncounterNotes (
    clientID, 
    careNoteDate, 
    careNoteType, 
    careNoteSite, 
    careNote, 
    createdBy, 
    createdAt
) VALUES 
('DEMO-001', '2024-03-10', 'Individual', '41st', 'Client attended weekly session. Reports improved mood and medication compliance. Discussed coping strategies for stress management.', 'demo@example.com', GETDATE()),
('DEMO-001', '2024-03-08', 'Crisis', '97th', 'Emergency intervention required. Client experiencing anxiety episode. Provided immediate support and safety planning.', 'demo@example.com', GETDATE()),
('DEMO-001', '2024-03-05', 'Group', 'Pacific', 'Participated in group therapy session. Good engagement with peers. Shared experiences about housing challenges.', 'demo@example.com', GETDATE());
*/

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.EncounterNotes TO [YourAppRole];

-- View to get encounter note statistics (optional)
CREATE VIEW dbo.vw_EncounterNoteStats AS
SELECT 
    clientID,
    COUNT(*) as TotalNotes,
    COUNT(CASE WHEN careNoteType = 'Individual' THEN 1 END) as IndividualNotes,
    COUNT(CASE WHEN careNoteType = 'Group' THEN 1 END) as GroupNotes,
    COUNT(CASE WHEN careNoteType = 'Crisis' THEN 1 END) as CrisisNotes,
    COUNT(CASE WHEN careNoteDate >= DATEADD(DAY, -30, GETDATE()) THEN 1 END) as NotesLast30Days,
    MAX(careNoteDate) as LastNoteDate,
    MIN(careNoteDate) as FirstNoteDate
FROM dbo.EncounterNotes
GROUP BY clientID;