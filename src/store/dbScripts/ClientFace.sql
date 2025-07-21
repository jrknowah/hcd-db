CREATE TABLE ClientFace (
  clientID VARCHAR(50) PRIMARY KEY,  -- FK to ClientDemographics
  clientContactNum VARCHAR(20),
  clientContactAltNum VARCHAR(20),
  clientEmail VARCHAR(100),
  clientEmgContactName VARCHAR(100),
  clientEmgContactNum VARCHAR(20),
  clientEmgContactRel VARCHAR(50),
  clientEmgContactAddress VARCHAR(255),
  clientMedInsType VARCHAR(100),
  clientMedCarrier VARCHAR(100),
  clientMedInsNum VARCHAR(100),
  clientMedPrimaryPhy VARCHAR(100),
  clientMedPrimaryPhyFacility VARCHAR(100),
  clientMedPrimaryPhyPhone VARCHAR(20),
  clientAllergyComments VARCHAR(MAX)
);
FOREIGN KEY (clientID) REFERENCES ClientDemographics(clientID)
