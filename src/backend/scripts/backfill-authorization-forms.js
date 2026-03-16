/**
 * backfill-authorization-forms.js
 *
 * One-time migration: reads the formData JSON blob for every AuthorizationForms
 * row that is missing data in its dedicated columns, then writes the correct
 * values back to those columns.
 *
 * Safe to run multiple times — it only updates rows where a column is NULL
 * and the value can be recovered from the JSON blob.
 *
 * Usage:
 *   node backfill-authorization-forms.js            ← dry-run (prints what would change)
 *   node backfill-authorization-forms.js --apply    ← writes changes to the database
 *   node backfill-authorization-forms.js --report   ← summary report only, no changes
 */

'use strict';

require('dotenv').config({ path: '../../.env' });
const sql = require('mssql');

// ── Config ───────────────────────────────────────────────────────────────────

const DRY_RUN = !process.argv.includes('--apply');
const REPORT_ONLY = process.argv.includes('--report');

const DB_CONFIG = {
  user:     process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  server:   process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  options: {
    encrypt:                process.env.AZURE_SQL_ENCRYPT !== 'false',
    trustServerCertificate: false,
    enableArithAbort:       true,
  },
  pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
};

// ── Per-form signature field names (must match authSig.js) ───────────────────

const SIGNATURE_FIELDS = {
  orientation:      'signature',
  clientRights:     'signature',
  consentTreatment: 'signature',
  preScreen:        'signature',
  privacyPractice:  'signature',
  lahmis:           'signature',
  phiRelease:       'signature',
  residencePolicy:  'signature',
  authDisclosure:   'atrClientSign',
  termination:      'signature',
  advDirective:     'clientSignature',
  grievances:       'signature',
  healthDisclosure: 'atrClientSign',
  consentPhoto:     'consentPhotoSign1',
  housingAgreement: 'housingAgreeeSign',
};

// ── Priority defaults (must match FORM_METADATA in authSig.js) ───────────────

const PRIORITY_DEFAULTS = {
  orientation:      'high',
  clientRights:     'high',
  consentTreatment: 'high',
  preScreen:        'medium',
  privacyPractice:  'medium',
  lahmis:           'medium',
  phiRelease:       'medium',
  residencePolicy:  'medium',
  authDisclosure:   'medium',
  termination:      'low',
  advDirective:     'medium',
  grievances:       'medium',
  healthDisclosure: 'medium',
  consentPhoto:     'medium',
  housingAgreement: 'low',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJson(str) {
  if (!str) return {};
  try { return JSON.parse(str); } catch (_) { return {}; }
}

function getSignatureFromBlob(formType, blob) {
  const sigField = SIGNATURE_FIELDS[formType] || 'signature';
  const val = blob[sigField];
  if (val && typeof val === 'string' && val.trim().length >= 2) return val.trim();
  return null;
}

function inferCompletion(blob, formType) {
  // Trust an explicit completionPercentage stored in the blob
  const blobPct = Number(blob.completionPercentage);
  if (!isNaN(blobPct) && blobPct >= 0 && blobPct <= 100) return blobPct;
  // Fall back: if a signature exists, assume 100%
  if (getSignatureFromBlob(formType, blob)) return 100;
  return 0;
}

function inferStatus(blob, formType, currentStatus) {
  // If already set to a terminal/meaningful status, keep it
  const KEEP = ['submitted', 'approved', 'rejected'];
  if (KEEP.includes(currentStatus)) return currentStatus;

  const pct = inferCompletion(blob, formType);
  const sig = getSignatureFromBlob(formType, blob);

  if (pct === 100 || sig) return 'completed';

  // Check blob status field
  const blobStatus = blob.status || blob.saveType;
  if (blobStatus === 'completed' || blobStatus === 'final_submission') return 'completed';
  if (blobStatus === 'in_progress') return 'in_progress';

  if (pct > 0) return 'in_progress';
  return currentStatus || 'draft';
}

function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         AuthorizationForms Backfill Migration                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Mode: ${REPORT_ONLY ? '📊 REPORT ONLY' : DRY_RUN ? '🔍 DRY RUN (pass --apply to write)' : '✏️  APPLYING CHANGES'}`);
  console.log('');

  let pool;
  try {
    pool = await sql.connect(DB_CONFIG);
    console.log('✅ Connected to Azure SQL Database');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Check your .env file for AZURE_SQL_USER, AZURE_SQL_PASSWORD, AZURE_SQL_SERVER, AZURE_SQL_DATABASE');
    process.exit(1);
  }

  // ── Step 0: Confirm which database/schema we're in ───────────────────────

  console.log('\n── Step 0: Verifying database context...');
  const dbCheck = await pool.request().query(`
    SELECT DB_NAME() AS currentDatabase, SCHEMA_NAME() AS currentSchema, SYSTEM_USER AS connectedUser
  `);
  const ctx = dbCheck.recordset[0];
  console.log(`   Database : ${ctx.currentDatabase}`);
  console.log(`   Schema   : ${ctx.currentSchema}`);
  console.log(`   User     : ${ctx.connectedUser}`);

  // Find the AuthorizationForms table — it may live in a non-default schema
  const tableSearch = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME = 'AuthorizationForms'
  `);

  if (tableSearch.recordset.length === 0) {
    console.log('\n   ⚠️  AuthorizationForms not found. Listing all visible tables:\n');
    const allTables = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);
    allTables.recordset.forEach(t => console.log(`     [${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`));
    console.log('\n   ❌ Cannot proceed. Verify DB_NAME in your .env points to the HOPE database.');
    await pool.close();
    process.exit(1);
  }

  const tableSchema = tableSearch.recordset[0].TABLE_SCHEMA;
  const qualifiedTable = `[${tableSchema}].[AuthorizationForms]`;
  console.log(`   ✅ Found table: ${qualifiedTable}`);

  // ── Step 1: Load all rows ─────────────────────────────────────────────────

  console.log('\n── Step 1: Loading all AuthorizationForms rows...');
  const allRows = await pool.request().query(`
    SELECT
      formID, clientID, formType, status, priority,
      completionPercentage, completedBy, completedAt,
      createdBy, updatedBy, signature, checkboxData,
      formData, updatedAt, createdAt
    FROM ${qualifiedTable}
    ORDER BY clientID, formType
  `);

  const rows = allRows.recordset;
  console.log(`   Found ${rows.length} total rows`);

  // ── Step 2: Analyse each row ──────────────────────────────────────────────

  console.log('\n── Step 2: Analysing rows for missing column data...');

  const updates   = [];  // rows that need changes
  const skipped   = [];  // rows that are already complete
  const problems  = [];  // rows with unrecoverable data

  // Counters for what we're fixing
  const fixCounts = {
    completionPercentage: 0,
    status:               0,
    priority:             0,
    completedBy:          0,
    completedAt:          0,
    createdBy:            0,
    updatedBy:            0,
    signature:            0,
    checkboxData:         0,
  };

  for (const row of rows) {
    const blob = safeParseJson(row.formData);

    if (!row.formData) {
      problems.push({ formID: row.formID, clientID: row.clientID, formType: row.formType, reason: 'formData is NULL — no data to recover' });
      continue;
    }

    const patch = {};

    // completionPercentage
    if (row.completionPercentage === null || row.completionPercentage === undefined) {
      const recovered = inferCompletion(blob, row.formType);
      patch.completionPercentage = recovered;
      fixCounts.completionPercentage++;
    }

    // status
    const correctStatus = inferStatus(blob, row.formType, row.status);
    if (correctStatus !== row.status) {
      patch.status = correctStatus;
      fixCounts.status++;
    }

    // priority
    if (!row.priority) {
      patch.priority = blob.priority || PRIORITY_DEFAULTS[row.formType] || 'medium';
      fixCounts.priority++;
    }

    // signature (dedicated column, not just in blob)
    if (!row.signature) {
      const recovered = getSignatureFromBlob(row.formType, blob);
      if (recovered) {
        patch.signature = recovered;
        fixCounts.signature++;
      }
    }

    // checkboxData (dedicated column)
    if (!row.checkboxData && blob.checkboxes) {
      patch.checkboxData = JSON.stringify(blob.checkboxes);
      fixCounts.checkboxData++;
    }

    // completedBy / completedAt — recover if form is or should be completed
    const finalStatus = patch.status || row.status;
    const finalPct    = patch.completionPercentage ?? Number(row.completionPercentage ?? 0);

    if (finalStatus === 'completed' || finalPct === 100) {
      if (!row.completedBy) {
        const recovered = blob.completedBy || blob.updatedBy || blob.createdBy || null;
        if (recovered) {
          patch.completedBy = recovered;
          fixCounts.completedBy++;
        }
      }
      if (!row.completedAt) {
        const recovered = parseDate(blob.completedAt) || parseDate(blob.updatedAt) || parseDate(row.updatedAt);
        if (recovered) {
          patch.completedAt = recovered;
          fixCounts.completedAt++;
        }
      }
    }

    // createdBy
    if (!row.createdBy) {
      const recovered = blob.createdBy || blob.updatedBy || null;
      if (recovered) {
        patch.createdBy = recovered;
        fixCounts.createdBy++;
      }
    }

    // updatedBy
    if (!row.updatedBy) {
      const recovered = blob.updatedBy || blob.createdBy || null;
      if (recovered) {
        patch.updatedBy = recovered;
        fixCounts.updatedBy++;
      }
    }

    if (Object.keys(patch).length > 0) {
      updates.push({ row, patch });
    } else {
      skipped.push(row.formID);
    }
  }

  // ── Step 3: Print report ──────────────────────────────────────────────────

  console.log('\n── Step 3: Report');
  console.log(`   Total rows:            ${rows.length}`);
  console.log(`   Rows needing updates:  ${updates.length}`);
  console.log(`   Rows already complete: ${skipped.length}`);
  console.log(`   Unrecoverable rows:    ${problems.length}`);
  console.log('');
  console.log('   Column fix breakdown:');
  Object.entries(fixCounts).forEach(([col, count]) => {
    if (count > 0) console.log(`     ${col.padEnd(22)} ${count} rows`);
  });

  if (problems.length > 0) {
    console.log('\n   ⚠️  Unrecoverable rows (no formData JSON):');
    problems.forEach(p => {
      console.log(`     formID=${p.formID}  clientID=${p.clientID}  formType=${p.formType}`);
      console.log(`       Reason: ${p.reason}`);
    });
  }

  if (REPORT_ONLY || updates.length === 0) {
    if (updates.length === 0) console.log('\n✅ Nothing to update — all rows already have complete column data.');
    await pool.close();
    return;
  }

  // ── Step 4: Preview first 10 changes ─────────────────────────────────────

  console.log('\n── Step 4: Sample of planned changes (first 10):');
  updates.slice(0, 10).forEach(({ row, patch }) => {
    console.log(`\n   formID=${row.formID}  clientID=${row.clientID}  formType=${row.formType}`);
    Object.entries(patch).forEach(([col, val]) => {
      const display = val instanceof Date ? val.toISOString() : String(val);
      const oldVal  = row[col] !== null && row[col] !== undefined ? String(row[col]) : 'NULL';
      console.log(`     ${col.padEnd(22)} ${oldVal.padEnd(20)} → ${display}`);
    });
  });
  if (updates.length > 10) {
    console.log(`\n   ... and ${updates.length - 10} more rows`);
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — no changes written. Run with --apply to execute.');
    await pool.close();
    return;
  }

  // ── Step 5: Apply updates ─────────────────────────────────────────────────

  console.log('\n── Step 5: Applying updates...');

  let successCount = 0;
  let errorCount   = 0;
  const errors     = [];

  for (const { row, patch } of updates) {
    try {
      // Build SET clause dynamically from only the fields we're patching
      const setClauses = [];
      const request    = pool.request()
        .input('formID', sql.Int, row.formID);

      if (patch.completionPercentage !== undefined) {
        setClauses.push('completionPercentage = @completionPercentage');
        request.input('completionPercentage', sql.Decimal(5, 2), patch.completionPercentage);
      }
      if (patch.status !== undefined) {
        setClauses.push('status = @status');
        request.input('status', sql.NVarChar(20), patch.status);
      }
      if (patch.priority !== undefined) {
        setClauses.push('priority = @priority');
        request.input('priority', sql.NVarChar(10), patch.priority);
      }
      if (patch.signature !== undefined) {
        setClauses.push('signature = @signature');
        request.input('signature', sql.NVarChar(200), patch.signature);
      }
      if (patch.checkboxData !== undefined) {
        setClauses.push('checkboxData = @checkboxData');
        request.input('checkboxData', sql.NVarChar(sql.MAX), patch.checkboxData);
      }
      if (patch.completedBy !== undefined) {
        setClauses.push('completedBy = @completedBy');
        request.input('completedBy', sql.NVarChar(100), patch.completedBy);
      }
      if (patch.completedAt !== undefined) {
        setClauses.push('completedAt = @completedAt');
        request.input('completedAt', sql.DateTime2, patch.completedAt);
      }
      if (patch.createdBy !== undefined) {
        setClauses.push('createdBy = @createdBy');
        request.input('createdBy', sql.NVarChar(100), patch.createdBy);
      }
      if (patch.updatedBy !== undefined) {
        setClauses.push('updatedBy = @updatedBy');
        request.input('updatedBy', sql.NVarChar(100), patch.updatedBy);
      }

      if (setClauses.length === 0) continue;

      await request.query(`
        UPDATE ${qualifiedTable}
        SET ${setClauses.join(',\n            ')}
        WHERE formID = @formID
      `);

      successCount++;

      // Progress indicator every 25 rows
      if (successCount % 25 === 0) {
        process.stdout.write(`\r   Updated ${successCount} / ${updates.length} rows...`);
      }
    } catch (err) {
      errorCount++;
      errors.push({ formID: row.formID, clientID: row.clientID, formType: row.formType, error: err.message });
    }
  }

  console.log(`\r   Updated ${successCount} / ${updates.length} rows     `);

  // ── Step 6: Verification query ────────────────────────────────────────────

  console.log('\n── Step 6: Post-migration verification...');
  const verify = await pool.request().query(`
    SELECT
      COUNT(*)                                              AS totalRows,
      SUM(CASE WHEN completionPercentage IS NULL  THEN 1 ELSE 0 END) AS nullPct,
      SUM(CASE WHEN priority             IS NULL  THEN 1 ELSE 0 END) AS nullPriority,
      SUM(CASE WHEN createdBy            IS NULL  THEN 1 ELSE 0 END) AS nullCreatedBy,
      SUM(CASE WHEN updatedBy            IS NULL  THEN 1 ELSE 0 END) AS nullUpdatedBy,
      SUM(CASE WHEN status = 'completed'
           AND completedBy IS NULL                         THEN 1 ELSE 0 END) AS completedWithoutUser,
      SUM(CASE WHEN status = 'completed'
           AND completedAt IS NULL                         THEN 1 ELSE 0 END) AS completedWithoutDate
    FROM ${qualifiedTable}
  `);

  const v = verify.recordset[0];
  console.log('');
  console.log('   Remaining NULLs after migration:');
  console.log(`     completionPercentage NULL:  ${v.nullPct}`);
  console.log(`     priority NULL:              ${v.nullPriority}`);
  console.log(`     createdBy NULL:             ${v.nullCreatedBy}  ${v.nullCreatedBy > 0 ? '(expected — no user in blob)' : ''}`);
  console.log(`     updatedBy NULL:             ${v.nullUpdatedBy}  ${v.nullUpdatedBy > 0 ? '(expected — no user in blob)' : ''}`);
  console.log(`     completed without user:     ${v.completedWithoutUser}  ${v.completedWithoutUser > 0 ? '(user not recoverable from blob)' : ''}`);
  console.log(`     completed without date:     ${v.completedWithoutDate}`);

  // ── Step 7: Status distribution after fix ────────────────────────────────

  const statusDist = await pool.request().query(`
    SELECT status, COUNT(*) AS cnt
    FROM ${qualifiedTable}
    GROUP BY status
    ORDER BY cnt DESC
  `);

  console.log('\n   Status distribution after migration:');
  statusDist.recordset.forEach(r => {
    console.log(`     ${(r.status || 'NULL').padEnd(15)} ${r.cnt} rows`);
  });

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  if (errorCount > 0) {
    console.log(`║  ⚠️  Completed with errors: ${successCount} updated, ${errorCount} failed         `);
  } else {
    console.log(`║  ✅  Migration complete: ${successCount} rows updated successfully         `);
  }
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log('\n   Failed rows:');
    errors.forEach(e => {
      console.log(`     formID=${e.formID}  ${e.formType}  Error: ${e.error}`);
    });
  }

  await pool.close();
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});