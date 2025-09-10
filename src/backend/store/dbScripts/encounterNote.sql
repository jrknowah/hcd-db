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
CREATE INDEX IX_EncounterNotes_ClientID ON dbo.EncounterNotes (clientID);
CREATE INDEX IX_EncounterNotes_CareNoteDate ON dbo.EncounterNotes (careNoteDate DESC);