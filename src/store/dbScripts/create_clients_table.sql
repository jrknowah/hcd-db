CREATE TABLE clientDemographics (
  id INT IDENTITY(1,1) PRIMARY KEY,
  clientID NVARCHAR(50) NOT NULL,
  clientContactNum NVARCHAR(50),
  clientContactAltNum NVARCHAR(50),
  clientEmail NVARCHAR(100),
  clientEmgContactName NVARCHAR(100),
  clientEmgContactNum NVARCHAR(50),
  clientEmgContactRel NVARCHAR(100),
  clientEmgContactAddress NVARCHAR(255),
  clientMedInsType NVARCHAR(100),
  clientMedCarrier NVARCHAR(100),
  clientMedInsNum NVARCHAR(100),
  clientMedPrimaryPhy NVARCHAR(100),
  clientMedPrimaryPhyFacility NVARCHAR(100),
  clientMedPrimaryPhyPhone NVARCHAR(50),
  clientAllergyComments NVARCHAR(MAX),
  CONSTRAINT FK_ClientFace_Client FOREIGN KEY (clientID)
    REFERENCES clientDemographics(clientID)
);
