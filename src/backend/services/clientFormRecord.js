// services/clientFormRecord.js
// Router for a form that keeps one record per client (Exit Form, Discharge Plan):
//   GET /:clientID  - the saved form, or { record: null } if none yet
//   PUT /:clientID  - create or update it; stamps who saved it and when
//
// Mount behind authMiddleware so createdBy/updatedBy come from the signed-in user.
const express = require('express');
const sql = require('mssql');
const { getPool } = require('../store/azureSql');
const { getCurrentUser, auditAction } = require('../utils/section4Lock');

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Field type -> SQL parameter type and how a request value is cleaned
const FIELD_TYPES = {
  date: {
    sqlType: sql.Date,
    clean: (v) => {
      if (v == null || v === '') return null;
      const ymd = String(v).slice(0, 10);
      if (!DATE_ONLY.test(ymd) || Number.isNaN(new Date(ymd).getTime())) throw new Error('must be a YYYY-MM-DD date');
      return ymd;
    },
  },
  int: {
    sqlType: sql.Int,
    clean: (v) => {
      if (v == null || v === '') return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) throw new Error('must be a whole number');
      return n;
    },
  },
  short: {
    sqlType: sql.NVarChar(255),
    clean: (v) => {
      const s = v == null ? '' : String(v).trim();
      if (s.length > 255) throw new Error('must be 255 characters or fewer');
      return s || null;
    },
  },
  text: {
    sqlType: sql.NVarChar(sql.MAX),
    clean: (v) => (v == null || String(v).trim() === '' ? null : String(v)),
  },
  // Lists (e.g. checked boxes) are stored as a JSON array
  list: {
    sqlType: sql.NVarChar(sql.MAX),
    clean: (v) => {
      if (v == null || v === '') return null;
      if (!Array.isArray(v) || v.some(x => typeof x !== 'string')) throw new Error('must be a list of strings');
      return v.length ? JSON.stringify(v) : null;
    },
    read: (v) => {
      if (!v) return [];
      try { return JSON.parse(v); } catch { return []; }
    },
  },
};

const validClientID = (clientID) => typeof clientID === 'string' && clientID.trim() !== '' && clientID.length <= 50;

function createClientFormRouter({ table, label, auditTable, fields }) {
  const router = express.Router();
  const names = Object.keys(fields);
  const columns = names.join(', ');

  const toRecord = (row) => {
    const record = {};
    for (const name of names) {
      const read = FIELD_TYPES[fields[name]].read;
      record[name] = read ? read(row[name]) : row[name];
    }
    return {
      ...record,
      id: row.id,
      clientID: row.clientID,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  };

  const selectRecord = (request) => request.query(`
    SELECT id, clientID, ${columns}, createdBy, createdAt, updatedBy, updatedAt
    FROM ${table} WHERE clientID = @clientID
  `);

  router.get('/:clientID', async (req, res) => {
    const { clientID } = req.params;
    if (!validClientID(clientID)) return res.status(400).json({ success: false, message: 'Invalid client ID' });

    try {
      const pool = await getPool();
      const result = await selectRecord(pool.request().input('clientID', sql.NVarChar(50), clientID));
      const row = result.recordset[0];
      res.json({ success: true, record: row ? toRecord(row) : null });
    } catch (err) {
      console.error(`❌ Error loading ${label}:`, err);
      res.status(500).json({ success: false, message: `Failed to load ${label}`, error: err.message });
    }
  });

  router.put('/:clientID', async (req, res) => {
    const { clientID } = req.params;
    if (!validClientID(clientID)) return res.status(400).json({ success: false, message: 'Invalid client ID' });

    const body = req.body || {};
    const values = {};
    const errors = {};
    for (const name of names) {
      try {
        values[name] = FIELD_TYPES[fields[name]].clean(body[name]);
      } catch (err) {
        errors[name] = err.message;
      }
    }
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: `Invalid ${label} data`, errors });
    }

    const user = getCurrentUser(req);
    const now = new Date();
    let transaction;
    try {
      const pool = await getPool();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      const request = transaction.request()
        .input('clientID', sql.NVarChar(50), clientID)
        .input('user', sql.NVarChar(255), user)
        .input('now', sql.DateTime2, now);
      for (const name of names) request.input(name, FIELD_TYPES[fields[name]].sqlType, values[name]);

      // UPDLOCK/HOLDLOCK: two first saves for the same client can't both insert
      const result = await request.query(`
        MERGE ${table} WITH (UPDLOCK, HOLDLOCK) AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN
          UPDATE SET ${names.map(n => `${n} = @${n}`).join(', ')}, updatedBy = @user, updatedAt = @now
        WHEN NOT MATCHED THEN
          INSERT (clientID, ${columns}, createdBy, createdAt)
          VALUES (@clientID, ${names.map(n => `@${n}`).join(', ')}, @user, @now)
        OUTPUT $action AS mergeAction, inserted.id AS id;
      `);
      const { mergeAction, id } = result.recordset[0];

      await auditAction(transaction, {
        action: mergeAction === 'INSERT' ? 'CREATE' : 'UPDATE',
        req,
        tableName: auditTable,
        recordID: id,
        clientID,
        timestamp: now,
      });

      const saved = await selectRecord(transaction.request().input('clientID', sql.NVarChar(50), clientID));
      await transaction.commit();

      res.json({ success: true, message: `${label} saved`, record: toRecord(saved.recordset[0]) });
    } catch (err) {
      if (transaction) await transaction.rollback().catch(() => {});
      console.error(`❌ Error saving ${label}:`, err);
      res.status(500).json({ success: false, message: `Failed to save ${label}`, error: err.message });
    }
  });

  return router;
}

module.exports = { createClientFormRouter };
