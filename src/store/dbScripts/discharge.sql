CREATE TABLE ClientDischarge (
  clientID INT PRIMARY KEY,
  clientDischargeDate DATE,
  clientDischargeDiag NVARCHAR(255),
  clientDischargI NVARCHAR(MAX),
  clientDischargII NVARCHAR(MAX),
  clientDischargIII NVARCHAR(MAX),
  clientDischargIV NVARCHAR(MAX),
  clientDischargV NVARCHAR(MAX),
  clientDischargVI NVARCHAR(MAX),
  clientDischargVII NVARCHAR(MAX),
  FOREIGN KEY (clientID) REFERENCES clientDemographics(clientID)
);
