const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const sql = require("mssql");
const { poolPromise } = require("../db");

const upload = multer({ dest: "uploads/" });

// GET
router.get("/clientReferrals/:clientID", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("clientID", sql.Int, req.params.clientID)
      .query("SELECT lahsaReferral, odrReferral, dhsReferral FROM ClientReferrals WHERE clientID = @clientID");

    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("❌ Error fetching referrals:", err);
    res.status(500).send("Internal Server Error");
  }
});

// POST save referral notes
router.post("/saveClientReferrals", async (req, res) => {
  const { clientID, lahsaReferral, odrReferral, dhsReferral } = req.body;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input("clientID", sql.Int, clientID)
      .input("lahsaReferral", sql.VarChar, lahsaReferral)
      .input("odrReferral", sql.VarChar, odrReferral)
      .input("dhsReferral", sql.VarChar, dhsReferral)
      .query(`
        MERGE ClientReferrals AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN
          UPDATE SET lahsaReferral = @lahsaReferral, odrReferral = @odrReferral, dhsReferral = @dhsReferral
        WHEN NOT MATCHED THEN
          INSERT (clientID, lahsaReferral, odrReferral, dhsReferral)
          VALUES (@clientID, @lahsaReferral, @odrReferral, @dhsReferral);
      `);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error saving referral notes:", err);
    res.status(500).send("Internal Server Error");
  }
});

// POST file upload
router.post("/uploadReferral", upload.single("file"), async (req, res) => {
  const { clientID, type } = req.body;
  const filePath = `/uploads/${req.file.filename}`;
  const fileName = req.file.originalname;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input("clientID", sql.Int, clientID)
      .input("referralType", sql.VarChar, type)
      .input("fileName", sql.VarChar, fileName)
      .input("filePath", sql.VarChar, filePath)
      .query(`
        INSERT INTO ReferralFiles (clientID, referralType, fileName, filePath, uploadedBy)
        VALUES (@clientID, @referralType, @fileName, @filePath, 'System');
      `);

    res.status(200).json({ message: "File uploaded successfully", filePath });
  } catch (err) {
    console.error("❌ Error saving referral file:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
