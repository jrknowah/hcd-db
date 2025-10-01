const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { connectToAzureSQL } = require("../store/azureSql");

router.get("/getClientDischarge/:clientID", async (req, res) => {
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.VarChar, req.params.clientID)  // Changed from sql.Int
      .query("SELECT * FROM ClientDischarge WHERE clientID = @clientID");
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("Error fetching discharge data:", err);
    res.status(500).send("Error fetching discharge data.");
  }
});

router.post("/saveClientDischarge", async (req, res) => {
  const {
    clientID,
    clientDischargeDate,
    clientDischargeDiag,
    clientDischargI,
    clientDischargII,
    clientDischargIII,
    clientDischargIV,
    clientDischargV,
    clientDischargVI,
    clientDischargVII,
  } = req.body;

  try {
    const pool = await connectToAzureSQL();

    await pool.request()
      .input("clientID", sql.VarChar, clientID)  // Changed from sql.Int
      .input("clientDischargeDate", sql.Date, clientDischargeDate)
      .input("clientDischargeDiag", sql.NVarChar, clientDischargeDiag)
      .input("clientDischargI", sql.NVarChar, clientDischargI)
      .input("clientDischargII", sql.NVarChar, clientDischargII)
      .input("clientDischargIII", sql.NVarChar, clientDischargIII)
      .input("clientDischargIV", sql.NVarChar, clientDischargIV)
      .input("clientDischargV", sql.NVarChar, clientDischargV)
      .input("clientDischargVI", sql.NVarChar, clientDischargVI)
      .input("clientDischargVII", sql.NVarChar, clientDischargVII)
      .query(`
        MERGE ClientDischarge AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN UPDATE SET
          clientDischargeDate = @clientDischargeDate,
          clientDischargeDiag = @clientDischargeDiag,
          clientDischargI = @clientDischargI,
          clientDischargII = @clientDischargII,
          clientDischargIII = @clientDischargIII,
          clientDischargIV = @clientDischargIV,
          clientDischargV = @clientDischargV,
          clientDischargVI = @clientDischargVI,
          clientDischargVII = @clientDischargVII
        WHEN NOT MATCHED THEN
          INSERT (clientID, clientDischargeDate, clientDischargeDiag, clientDischargI, clientDischargII, clientDischargIII, clientDischargIV, clientDischargV, clientDischargVI, clientDischargVII)
          VALUES (@clientID, @clientDischargeDate, @clientDischargeDiag, @clientDischargI, @clientDischargII, @clientDischargIII, @clientDischargIV, @clientDischargV, @clientDischargVI, @clientDischargVII);
      `);

    res.status(200).send("Client discharge saved.");
  } catch (err) {
    console.error("Error saving discharge data:", err);
    res.status(500).send("Error saving discharge data.");
  }
});

module.exports = router;