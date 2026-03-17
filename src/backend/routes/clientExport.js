/**
 * clientExport.js
 * Backend route: Full client record PDF export (all 6 sections)
 * Uses PDFKit for server-side PDF generation
 *
 * Route: GET /api/export/client/:clientID/pdf
 * Auth: Required (JWT middleware)
 * HIPAA: Audit log on every export
 */

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const sql = require('mssql');
const { getPool } = require('../store/azureSql');
const authenticateToken = require('../middleware/auth');

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeStr(val, fallback = 'N/A') {
  if (val === null || val === undefined || val === '') return fallback;
  return String(val);
}

function formatDate(val) {
  if (!val) return 'N/A';
  try { return new Date(val).toLocaleDateString('en-US'); } catch { return 'N/A'; }
}

function formatBool(val) {
  if (val === null || val === undefined) return 'N/A';
  return val ? 'Yes' : 'No';
}

// ─── PDF Drawing Helpers ────────────────────────────────────────────────────

function drawSectionHeader(doc, title, color = '#1565C0') {
  doc.addPage();
  doc
    .rect(0, 0, doc.page.width, 50)
    .fill(color);
  doc
    .fillColor('white')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(title, 40, 16, { width: doc.page.width - 80 });
  doc.fillColor('#000000').moveDown(2);
}

function drawSubHeader(doc, title) {
  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#1565C0')
    .text(title)
    .moveDown(0.3);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#1565C0')
    .lineWidth(0.5)
    .stroke()
    .moveDown(0.5);
  doc.fillColor('#000000').font('Helvetica').fontSize(9);
}

function drawField(doc, label, value, opts = {}) {
  const { inline = false } = opts;
  if (inline) {
    doc
      .font('Helvetica-Bold').fontSize(9).text(`${label}: `, { continued: true })
      .font('Helvetica').text(safeStr(value));
  } else {
    doc.font('Helvetica-Bold').fontSize(9).text(`${label}:`);
    doc.font('Helvetica').fontSize(9).text(safeStr(value), { indent: 10 }).moveDown(0.3);
  }
}

function drawTwoColumn(doc, pairs) {
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2;
  let i = 0;
  while (i < pairs.length) {
    const left = pairs[i];
    const right = pairs[i + 1];
    const yStart = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).text(`${left[0]}:`, doc.page.margins.left, yStart, { width: colWidth });
    doc.font('Helvetica').fontSize(9).text(safeStr(left[1]), doc.page.margins.left + 5, doc.y, { width: colWidth - 10 });
    if (right) {
      doc.font('Helvetica-Bold').fontSize(9).text(`${right[0]}:`, doc.page.margins.left + colWidth, yStart, { width: colWidth });
      doc.font('Helvetica').fontSize(9).text(safeStr(right[1]), doc.page.margins.left + colWidth + 5, doc.y, { width: colWidth - 10 });
    }
    doc.moveDown(0.6);
    i += 2;
  }
}

function noData(doc, msg = 'No records found.') {
  doc.font('Helvetica').fontSize(9).fillColor('#666666').text(msg).fillColor('#000000').moveDown(0.5);
}

// ─── Cover Page ─────────────────────────────────────────────────────────────

function drawCoverPage(doc, client, exportedBy) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Header bar
  doc.rect(0, 0, pageWidth, 120).fill('#1565C0');
  doc
    .fillColor('white')
    .fontSize(28)
    .font('Helvetica-Bold')
    .text('HOPE Client Database', 40, 30, { width: pageWidth - 80, align: 'center' });
  doc
    .fontSize(14)
    .font('Helvetica')
    .text('Complete Client Record', 40, 70, { width: pageWidth - 80, align: 'center' });

  // Client name
  doc.fillColor('#1565C0').fontSize(22).font('Helvetica-Bold')
    .text(`${safeStr(client.clientLastName)}, ${safeStr(client.clientFirstName)}`, 40, 160, { align: 'center', width: pageWidth - 80 });

  // Info box
  doc.rect(80, 210, pageWidth - 160, 160).fill('#F5F5F5').stroke('#CCCCCC');
  doc.fillColor('#000000').fontSize(10).font('Helvetica');

  const infoItems = [
    ['Client ID', safeStr(client.clientID)],
    ['Date of Birth', formatDate(client.dob)],
    ['Program', safeStr(client.program)],
    ['Site', safeStr(client.site || client.clientSite)],
    ['Primary Diagnosis', safeStr(client.primaryDiagnosis)],
    ['Status', safeStr(client.clientStatus)],
  ];

  let infoY = 225;
  infoItems.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(`${label}:`, 110, infoY, { width: 140 });
    doc.font('Helvetica').text(value, 260, infoY, { width: pageWidth - 360 });
    infoY += 20;
  });

  // HIPAA notice
  doc
    .rect(40, 400, pageWidth - 80, 60)
    .fill('#FFF3E0')
    .stroke('#FF9800');
  doc
    .fillColor('#E65100')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('⚠  CONFIDENTIAL – HIPAA PROTECTED HEALTH INFORMATION', 50, 412, { width: pageWidth - 100 });
  doc
    .font('Helvetica')
    .fillColor('#BF360C')
    .text(
      'This document contains protected health information. Unauthorized disclosure is prohibited by law. Handle per your organization\'s privacy policy.',
      50, 428, { width: pageWidth - 100 }
    );

  // Footer
  doc
    .fillColor('#555555')
    .fontSize(8)
    .font('Helvetica')
    .text(`Generated: ${new Date().toLocaleString('en-US')}   |   Exported by: ${safeStr(exportedBy)}`, 40, pageHeight - 60, {
      width: pageWidth - 80,
      align: 'center',
    });

  // TOC
  doc.addPage();
  doc.rect(0, 0, pageWidth, 50).fill('#1565C0');
  doc.fillColor('white').fontSize(16).font('Helvetica-Bold').text('Table of Contents', 40, 16);
  doc.fillColor('#000000').moveDown(2);

  const sections = [
    'Section 1 – Identification & Referrals',
    'Section 2 – Authorization & Signature Forms',
    'Section 3 – Assessment & Care Plans',
    'Section 4 – Client Progress',
    'Section 5 – Medical Information & Screenings',
    'Section 6 – Case Management',
  ];
  doc.fontSize(11).font('Helvetica');
  sections.forEach((s, i) => {
    doc.text(`${i + 1}.  ${s}`, { indent: 20 }).moveDown(0.4);
  });
}

// ─── Section Renderers ──────────────────────────────────────────────────────

async function renderSection1(doc, pool, clientID) {
  drawSectionHeader(doc, 'Section 1 – Identification & Referrals', '#1565C0');

  // Client face sheet
  try {
    const r1 = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT TOP 1 * FROM dbo.ClientFace WHERE clientID = @clientID');
    const cf = r1.recordset[0];
    if (cf) {
      drawSubHeader(doc, 'Client Face Sheet');
      drawTwoColumn(doc, [
        ['First Name', cf.clientFirstName],
        ['Last Name', cf.clientLastName],
        ['Date of Birth', formatDate(cf.dob || cf.clientDOB)],
        ['Gender', cf.gender || cf.clientGender],
        ['SSN (last 4)', cf.ssnLast4 ? `***-**-${cf.ssnLast4}` : 'N/A'],
        ['Phone', cf.phone || cf.clientPhone],
        ['Address', cf.address || cf.clientAddress],
        ['City/State/Zip', `${safeStr(cf.city)}, ${safeStr(cf.state)} ${safeStr(cf.zip)}`],
        ['Program', cf.program],
        ['Site', cf.site || cf.clientSite],
        ['Enrollment Date', formatDate(cf.enrollmentDate)],
        ['Insurance', cf.insurance || cf.primaryInsurance],
        ['Emergency Contact', cf.emergencyContact],
        ['Emergency Phone', cf.emergencyPhone],
        ['Primary Language', cf.primaryLanguage],
        ['Status', cf.clientStatus],
      ]);
    } else {
      noData(doc, 'No client face sheet record found.');
    }
  } catch (e) {
    noData(doc, `Unable to load client face sheet: ${e.message}`);
  }

  // Referrals
  try {
    const r2 = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT * FROM dbo.Referrals WHERE clientID = @clientID ORDER BY referralDate DESC');
    if (r2.recordset.length > 0) {
      drawSubHeader(doc, 'Referrals');
      r2.recordset.forEach((ref, i) => {
        doc.font('Helvetica-Bold').fontSize(9).text(`Referral #${i + 1}`);
        drawTwoColumn(doc, [
          ['Referral Date', formatDate(ref.referralDate)],
          ['Referred By', ref.referredBy],
          ['Referral Source', ref.referralSource],
          ['Reason', ref.referralReason],
          ['Status', ref.referralStatus],
          ['Follow-up Date', formatDate(ref.followUpDate)],
        ]);
      });
    } else {
      drawSubHeader(doc, 'Referrals');
      noData(doc);
    }
  } catch (e) {
    drawSubHeader(doc, 'Referrals');
    noData(doc, `Unable to load referrals: ${e.message}`);
  }

  // Discharge (if applicable)
  try {
    const r3 = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT TOP 1 * FROM dbo.Discharge WHERE clientID = @clientID ORDER BY dischargeDate DESC');
    const dis = r3.recordset[0];
    if (dis) {
      drawSubHeader(doc, 'Discharge Information');
      drawTwoColumn(doc, [
        ['Discharge Date', formatDate(dis.dischargeDate)],
        ['Discharge Type', dis.dischargeType],
        ['Discharge Reason', dis.dischargeReason],
        ['Discharge Disposition', dis.disposition],
        ['Discharged By', dis.dischargedBy],
        ['Notes', dis.dischargeNotes],
      ]);
    }
  } catch {}
}

// ─── Section 2 — Form configs (canonical order, matches authSig.js) ──────────

const S2_FORM_CONFIGS = [
  { typeID: 'orientation',      number:  1, label: 'Patient Orientation Information Sheet',                                       sigField: 'signature'         },
  { typeID: 'clientRights',     number:  2, label: 'Client Rights',                                                               sigField: 'signature'         },
  { typeID: 'consentTreatment', number:  3, label: 'Consent for Treatment and Services',                                          sigField: 'signature'         },
  { typeID: 'preScreen',        number:  4, label: 'Pre-Screen',                                                                  sigField: 'signature'         },
  { typeID: 'privacyPractice',  number:  5, label: 'LA County Notice of Privacy Practices',                                       sigField: 'signature'         },
  { typeID: 'lahmis',           number:  6, label: 'LA HMIS Consent',                                                             sigField: 'signature'         },
  { typeID: 'phiRelease',       number:  7, label: 'Client PHI Release',                                                          sigField: 'signature'         },
  { typeID: 'residencePolicy',  number:  8, label: 'Rules of Residence & Security Policy',                                        sigField: 'signature'         },
  { typeID: 'authDisclosure',   number:  9, label: 'Authorization To Share Information',                                          sigField: 'atrClientSign'     },
  { typeID: 'termination',      number: 10, label: 'Termination Policy & Procedure',                                              sigField: 'signature'         },
  { typeID: 'advDirective',     number: 11, label: 'Advance Healthcare Directive Form',                                           sigField: 'clientSignature'   },
  { typeID: 'grievances',       number: 12, label: 'Client Grievances',                                                           sigField: 'signature'         },
  { typeID: 'healthDisclosure', number: 13, label: 'Authorization For Use and/or Disclosure of Health/Mental Health Information', sigField: 'atrClientSign'     },
  { typeID: 'consentPhoto',     number: 14, label: 'Consent to Taking / Sharing Photograph',                                      sigField: 'consentPhotoSign1' },
  { typeID: 'housingAgreement', number: 15, label: 'Interim Housing (Shelter) Agreement',                                         sigField: 'housingAgreeeSign' },
];

// ─── Section 2 — Form-specific field renderers ───────────────────────────────
// Each receives (doc, formData) and renders the form-specific fields parsed
// from the formData JSON blob.  Generic metadata is rendered by renderS2FormBlock.

function s2_renderOrientation(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Orientation Details');
  drawTwoColumn(doc, [
    ['Orientation Date',  formatDate(fd.orientationDate)],
    ['Completed By',      fd.completedBy || fd.staffName],
    ['Client Understood', formatBool(fd.clientUnderstood)],
    ['Language Used',     fd.languageUsed],
    ['Interpreter Used',  formatBool(fd.interpreterUsed)],
    ['Interpreter Name',  fd.interpreterName],
  ]);
  if (fd.notes) drawField(doc, 'Notes', fd.notes);
}

function s2_renderClientRights(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Client Rights Acknowledgment');
  drawTwoColumn(doc, [
    ['Rights Explained By', fd.staffName || fd.completedBy],
    ['Date Explained',      formatDate(fd.dateExplained || fd.completedAt)],
    ['Acknowledged',        formatBool(fd.acknowledged)],
    ['Language',            fd.language],
  ]);
}

function s2_renderConsentTreatment(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Consent for Treatment Details');
  drawTwoColumn(doc, [
    ['Consent Date',      formatDate(fd.consentDate)],
    ['Services Consented', fd.servicesConsented],
    ['Provider',          fd.providerName || fd.provider],
    ['Witness',           fd.witnessName  || fd.witness],
    ['Effective Date',    formatDate(fd.effectiveDate)],
    ['Expiration Date',   formatDate(fd.expirationDate)],
  ]);
  if (fd.additionalNotes || fd.notes) drawField(doc, 'Notes', fd.additionalNotes || fd.notes);
}

function s2_renderPreScreen(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Pre-Screen Information');
  drawTwoColumn(doc, [
    ['Screen Date',            formatDate(fd.screenDate || fd.completedAt)],
    ['Screened By',            fd.screenedBy || fd.staffName],
    ['Homeless Duration',      fd.homelessDuration],
    ['Last Permanent Address', fd.lastPermanentAddress],
    ['Income Source',          fd.incomeSource],
    ['Monthly Income',         fd.monthlyIncome],
    ['Insurance Type',         fd.insuranceType],
    ['Veteran Status',         formatBool(fd.veteranStatus)],
    ['Chronic Homeless',       formatBool(fd.chronicHomeless)],
    ['Disability',             formatBool(fd.hasDisability)],
  ]);
}

function s2_renderPrivacyPractice(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Privacy Practices Acknowledgment');
  drawTwoColumn(doc, [
    ['Notice Provided Date', formatDate(fd.noticeDateProvided || fd.completedAt)],
    ['Provided By',          fd.providedBy || fd.staffName],
    ['Client Acknowledged',  formatBool(fd.acknowledged || fd.clientAcknowledged)],
  ]);
}

function s2_renderLahmis(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'LA HMIS Consent Details');
  drawTwoColumn(doc, [
    ['Consent Date',         formatDate(fd.consentDate || fd.completedAt)],
    ['HMIS Participant ID',  fd.hmisParticipantID || fd.participantID],
    ['Data Sharing Agreed',  formatBool(fd.dataSharingAgreed)],
    ['Consent Period Start', formatDate(fd.consentStartDate)],
    ['Consent Period End',   formatDate(fd.consentEndDate)],
    ['Organization',         fd.organizationName || fd.organization],
  ]);
}

function s2_renderPhiRelease(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'PHI Release Details');
  drawTwoColumn(doc, [
    ['Release Date',     formatDate(fd.releaseDate || fd.completedAt)],
    ['Release To',       fd.releaseTo],
    ['Purpose',          fd.purpose || fd.releasePurpose],
    ['Information Type', fd.informationType],
    ['Effective Date',   formatDate(fd.effectiveDate)],
    ['Expiration Date',  formatDate(fd.expirationDate)],
    ['Revocable',        formatBool(fd.revocable)],
    ['Witness',          fd.witnessName || fd.witness],
  ]);
}

function s2_renderResidencePolicy(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Rules of Residence Acknowledgment');
  drawTwoColumn(doc, [
    ['Policy Date',        formatDate(fd.policyDate || fd.completedAt)],
    ['Rules Explained By', fd.staffName || fd.completedBy],
    ['Client Agreed',      formatBool(fd.clientAgreed || fd.acknowledged)],
    ['Room Assignment',    fd.roomAssignment || fd.unitNumber],
  ]);
  if (fd.notes) drawField(doc, 'Notes', fd.notes);
}

function s2_renderAuthDisclosure(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Authorization to Share Information');
  drawTwoColumn(doc, [
    ['Authorized To',      fd.authorizedTo    || fd.disclosureTo],
    ['Purpose',            fd.purpose         || fd.disclosurePurpose],
    ['Information Shared', fd.informationShared],
    ['Effective Date',     formatDate(fd.effectiveDate)],
    ['Expiration Date',    formatDate(fd.expirationDate)],
    ['Witness',            fd.witnessName     || fd.witness],
    ['Staff Signature',    fd.atrStaffSign    || fd.staffSignature],
  ]);
  if (fd.conditions || fd.limitations) drawField(doc, 'Conditions / Limitations', fd.conditions || fd.limitations);
}

function s2_renderTermination(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Termination Policy Acknowledgment');
  drawTwoColumn(doc, [
    ['Policy Date',         formatDate(fd.policyDate || fd.completedAt)],
    ['Explained By',        fd.staffName || fd.completedBy],
    ['Client Acknowledged', formatBool(fd.acknowledged || fd.clientAcknowledged)],
  ]);
}

function s2_renderAdvDirective(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Advance Healthcare Directive');
  drawTwoColumn(doc, [
    ['Directive Date',          formatDate(fd.directiveDate || fd.completedAt)],
    ['Healthcare Agent',        fd.healthcareAgent || fd.agentName],
    ['Agent Phone',             fd.agentPhone],
    ['DNR Status',              formatBool(fd.dnrStatus || fd.doNotResuscitate)],
    ['Life Support Preference', fd.lifeSupportPreference],
    ['Organ Donation',          formatBool(fd.organDonation)],
    ['Witness 1',               fd.witness1Name || fd.witness1],
    ['Witness 2',               fd.witness2Name || fd.witness2],
  ]);
  if (fd.additionalInstructions || fd.notes) drawField(doc, 'Additional Instructions', fd.additionalInstructions || fd.notes);
}

function s2_renderGrievances(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Grievance Procedure Acknowledgment');
  drawTwoColumn(doc, [
    ['Acknowledgment Date', formatDate(fd.acknowledgmentDate || fd.completedAt)],
    ['Explained By',        fd.staffName || fd.completedBy],
    ['Client Acknowledged', formatBool(fd.acknowledged)],
    ['Contact Person',      fd.grievanceContact || fd.contactName],
    ['Contact Phone',       fd.grievancePhone   || fd.contactPhone],
  ]);
}

function s2_renderHealthDisclosure(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Health/Mental Health Disclosure Authorization');
  drawTwoColumn(doc, [
    ['Authorized To',    fd.authorizedTo    || fd.disclosureTo],
    ['Purpose',          fd.purpose         || fd.disclosurePurpose],
    ['Information Type', fd.informationType || fd.healthInfoType],
    ['Effective Date',   formatDate(fd.effectiveDate)],
    ['Expiration Date',  formatDate(fd.expirationDate)],
    ['Treating Provider',fd.treatingProvider],
    ['Facility',         fd.facilityName    || fd.facility],
    ['Staff Signature',  fd.atrStaffSign    || fd.staffSignature],
  ]);
}

function s2_renderConsentPhoto(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Photo Consent Details');
  drawTwoColumn(doc, [
    ['Effective Date',  formatDate(fd.consentPhotoEffectiveDate)],
    ['Expiration Date', formatDate(fd.consentPhotoExpirationDate || fd.consentPhotoExpireDate)],
    ['Purpose',         fd.photoConsentPurpose || fd.purpose],
  ]);
  if (Array.isArray(fd.clientReleaseItems) && fd.clientReleaseItems.length) {
    drawSubHeader(doc, 'Approved Release Items');
    fd.clientReleaseItems.forEach(item => {
      doc.font('Helvetica').fontSize(9).text(`  • ${item}`);
    });
    doc.moveDown(0.3);
  }
  if (Array.isArray(fd.clientReleasePurposes) && fd.clientReleasePurposes.length) {
    drawSubHeader(doc, 'Approved Release Purposes');
    fd.clientReleasePurposes.forEach(p => {
      doc.font('Helvetica').fontSize(9).text(`  • ${p}`);
    });
    doc.moveDown(0.3);
  }
}

function s2_renderHousingAgreement(doc, fd) {
  if (!fd || !Object.keys(fd).length) return;
  drawSubHeader(doc, 'Housing Agreement Details');
  drawTwoColumn(doc, [
    ['Agreement Date', formatDate(fd.agreementDate || fd.completedAt)],
    ['Move-In Date',   formatDate(fd.moveInDate)],
    ['Unit / Room',    fd.unitNumber    || fd.roomNumber],
    ['Monthly Rent',   fd.monthlyRent],
    ['Deposit Paid',   formatBool(fd.depositPaid)],
    ['Deposit Amount', fd.depositAmount],
    ['Case Manager',   fd.caseManagerName || fd.caseManager],
    ['Landlord / Site',fd.landlordName    || fd.site],
  ]);
  if (fd.specialConditions || fd.notes) drawField(doc, 'Special Conditions', fd.specialConditions || fd.notes);
}

const S2_FORM_RENDERERS = {
  orientation:      s2_renderOrientation,
  clientRights:     s2_renderClientRights,
  consentTreatment: s2_renderConsentTreatment,
  preScreen:        s2_renderPreScreen,
  privacyPractice:  s2_renderPrivacyPractice,
  lahmis:           s2_renderLahmis,
  phiRelease:       s2_renderPhiRelease,
  residencePolicy:  s2_renderResidencePolicy,
  authDisclosure:   s2_renderAuthDisclosure,
  termination:      s2_renderTermination,
  advDirective:     s2_renderAdvDirective,
  grievances:       s2_renderGrievances,
  healthDisclosure: s2_renderHealthDisclosure,
  consentPhoto:     s2_renderConsentPhoto,
  housingAgreement: s2_renderHousingAgreement,
};

// ─── Section 2 — per-form block renderer ─────────────────────────────────────

function renderS2FormBlock(doc, cfg, rec) {
  // Numbered header banner
  doc.addPage();
  const pw = doc.page.width;
  const ml = doc.page.margins.left;
  const mr = doc.page.margins.right;
  const w  = pw - ml - mr;

  doc.rect(ml, doc.y, w, 20).fill('#E3F2FD');
  const bannerY = doc.y - 20;

  // Number badge
  doc.rect(ml, bannerY, 22, 20).fill('#1976D2');
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
     .text(String(cfg.number), ml + 1, bannerY + 6, { width: 22, align: 'center' });

  // Label
  doc.fillColor('#1976D2').fontSize(10).font('Helvetica-Bold')
     .text(cfg.label, ml + 26, bannerY + 5, { width: w - 115 });

  // Status badge
  const statusColors = {
    completed:   '#2E7D32',
    submitted:   '#1565C0',
    in_progress: '#E65100',
    draft:       '#5D4037',
    not_started: '#757575',
  };
  const sc      = statusColors[(rec?.status || 'not_started')] || '#424242';
  const badgeW  = 90;
  doc.rect(ml + w - badgeW, bannerY + 4, badgeW, 13).fill(sc);
  doc.fillColor('white').fontSize(7.5).font('Helvetica-Bold')
     .text(
       (rec?.status || 'NOT STARTED').toUpperCase().replace('_', ' '),
       ml + w - badgeW, bannerY + 7,
       { width: badgeW, align: 'center' }
     );

  doc.fillColor('#000000').moveDown(0.4);

  if (!rec) {
    noData(doc, 'This form has not been started for this client.');
    doc.moveDown(0.5);
    return;
  }

  // ── Core metadata ──
  drawSubHeader(doc, 'Form Metadata');
  drawTwoColumn(doc, [
    ['Status',          rec.status],
    ['Completion %',    rec.completionPercentage != null ? `${Number(rec.completionPercentage).toFixed(0)}%` : 'N/A'],
    ['Completed By',    rec.completedBy],
    ['Completed At',    formatDate(rec.completedAt)],
    ['Created By',      rec.createdBy],
    ['Created At',      formatDate(rec.createdAt)],
    ['Last Updated By', rec.updatedBy],
    ['Last Updated',    formatDate(rec.updatedAt)],
    ['Submission ID',   rec.submissionID],
    ['Priority',        rec.priority],
  ]);

  // ── Electronic signature ──
  const fd = (() => {
    try { return typeof rec.formData === 'string' ? JSON.parse(rec.formData) : (rec.formData || {}); }
    catch { return {}; }
  })();

  const sigVal = rec.signature           // dedicated column first
    || fd[cfg.sigField]                  // then formData blob with per-form field name
    || fd['signature'];                  // generic fallback

  drawSubHeader(doc, 'Electronic Signature');
  if (sigVal && String(sigVal).trim().length >= 2) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#2E7D32')
       .text(`✓  ${String(sigVal).trim()}`)
       .fillColor('#000000');
  } else {
    doc.font('Helvetica').fontSize(9).fillColor('#C62828')
       .text('✗  Not yet signed')
       .fillColor('#000000');
  }
  doc.moveDown(0.4);

  // ── Checkboxes ──
  const checkboxData = (() => {
    try {
      const raw = rec.checkboxData;
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch { return null; }
  })();

  if (checkboxData && typeof checkboxData === 'object') {
    const entries = Object.entries(checkboxData);
    if (entries.length) {
      drawSubHeader(doc, 'Checkboxes');
      entries.forEach(([key, val]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        doc.font('Helvetica').fontSize(9).text(`${val ? '☑' : '☐'}  ${label}`);
      });
      doc.moveDown(0.3);
    }
  }

  // ── Form-specific fields ──
  const renderer = S2_FORM_RENDERERS[cfg.typeID];
  if (renderer) renderer(doc, fd);

  doc.moveDown(0.5);
}

// ─── Section 2 — summary table ───────────────────────────────────────────────

function renderS2SummaryTable(doc, byType) {
  const pw   = doc.page.width;
  const ml   = doc.page.margins.left;
  const mr   = doc.page.margins.right;
  const w    = pw - ml - mr;
  const rowH = 18;

  drawSubHeader(doc, 'Authorization Forms — Completion Summary');

  // Header row
  const cols    = ['#', 'Form Name', 'Status', 'Completion %', 'Completed At'];
  const colWs   = [22, w * 0.46, w * 0.17, w * 0.14, w * 0.18];
  let xOff      = ml;

  doc.rect(ml, doc.y, w, rowH).fill('#1976D2');
  cols.forEach((h, i) => {
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8)
       .text(h, xOff + 3, doc.y - rowH + 5, { width: colWs[i] - 3 });
    xOff += colWs[i];
  });
  doc.moveDown(0.05);

  S2_FORM_CONFIGS.forEach((cfg, idx) => {
    const rec      = byType[cfg.typeID];
    const rowColor = idx % 2 === 0 ? '#FFFFFF' : '#E3F2FD';
    doc.rect(ml, doc.y, w, rowH).fill(rowColor);

    const statusColors = {
      completed:   '#2E7D32',
      submitted:   '#1565C0',
      in_progress: '#E65100',
      draft:       '#5D4037',
      not_started: '#757575',
    };

    xOff = ml;
    const cells = [
      { text: String(cfg.number),                                                             color: '#000000',                              bold: false },
      { text: cfg.label,                                                                       color: '#000000',                              bold: false },
      { text: rec ? (rec.status || 'N/A') : 'not_started',                                   color: statusColors[rec?.status || 'not_started'] || '#424242', bold: true  },
      { text: rec ? `${Number(rec.completionPercentage || 0).toFixed(0)}%` : '0%',           color: '#000000',                              bold: false },
      { text: rec ? formatDate(rec.completedAt) : 'N/A',                                     color: '#000000',                              bold: false },
    ];

    cells.forEach((cell, i) => {
      doc.fillColor(cell.color)
         .font(cell.bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(7.5)
         .text(cell.text, xOff + 3, doc.y - rowH + 5, { width: colWs[i] - 4 });
      xOff += colWs[i];
    });
    doc.moveDown(0.05);
  });

  doc.moveDown(0.8);
}

// ─── Section 2 — main renderer ───────────────────────────────────────────────

async function renderSection2(doc, pool, clientID) {
  drawSectionHeader(doc, 'Section 2 – Authorization & Signature Forms', '#1976D2');

  // ── 1. Single query — all AuthorizationForms rows for this client ──────────
  let allForms = [];
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`
        SELECT formID, formType, status, priority,
               formData, checkboxData, signature,
               completionPercentage,
               completedBy, completedAt,
               createdBy,   createdAt,
               updatedBy,   updatedAt,
               submissionID
        FROM   dbo.AuthorizationForms
        WHERE  clientID = @clientID
        ORDER  BY formType, updatedAt DESC
      `);
    allForms = r.recordset;
  } catch (e) {
    noData(doc, `Authorization forms not available: ${e.message}`);
    return;
  }

  // Keep most-recent record per formType
  const byType = {};
  allForms.forEach(row => {
    if (!byType[row.formType]) byType[row.formType] = row;
  });

  // ── 2. Overall stats ──────────────────────────────────────────────────────
  const total      = S2_FORM_CONFIGS.length;
  let   completed  = 0;
  let   inProgress = 0;
  let   totalPct   = 0;

  S2_FORM_CONFIGS.forEach(cfg => {
    const rec = byType[cfg.typeID];
    if (!rec) return;
    if (rec.status === 'completed' || rec.status === 'submitted') completed++;
    else if (rec.status === 'in_progress' || rec.status === 'draft') inProgress++;
    totalPct += Number(rec.completionPercentage || 0);
  });

  // Try the summary view as well (non-fatal if absent)
  try {
    const sv = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`SELECT TOP 1 * FROM dbo.vw_ClientAuthorizationSummary WHERE clientID = @clientID`);
    if (sv.recordset[0]) {
      const s = sv.recordset[0];
      drawSubHeader(doc, 'Authorization Summary (from summary view)');
      drawTwoColumn(doc, [
        ['Authorization Status', s.authorizationStatus],
        ['Last Form Activity',   formatDate(s.lastFormActivity)],
      ]);
    }
  } catch {}

  drawSubHeader(doc, 'Authorization Summary');
  drawTwoColumn(doc, [
    ['Total Forms',      total],
    ['Completed',        completed],
    ['In Progress',      inProgress],
    ['Not Started',      total - completed - inProgress],
    ['Overall Completion', `${Math.round(totalPct / total)}%`],
  ]);

  // ── 3. Summary table ──────────────────────────────────────────────────────
  renderS2SummaryTable(doc, byType);

  // ── 4. Full detail block per form (one page each) ─────────────────────────
  S2_FORM_CONFIGS.forEach(cfg => {
    renderS2FormBlock(doc, cfg, byType[cfg.typeID] || null);
  });

  // ── 5. Any unrecognised formType rows (future-proofing) ───────────────────
  const extras = allForms.filter(r => !S2_FORM_CONFIGS.find(c => c.typeID === r.formType));
  if (extras.length > 0) {
    doc.addPage();
    drawSubHeader(doc, 'Additional / Unrecognised Forms');
    extras.forEach(rec => {
      doc.font('Helvetica-Bold').fontSize(9).text(`Form – ${safeStr(rec.formType)}`);
      drawTwoColumn(doc, [
        ['Status',       rec.status],
        ['Completion %', rec.completionPercentage != null ? `${rec.completionPercentage}%` : 'N/A'],
        ['Completed By', rec.completedBy],
        ['Created At',   formatDate(rec.createdAt)],
      ]);
    });
  }

  // ── 6. Form Submissions log ───────────────────────────────────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`SELECT TOP 10 * FROM dbo.FormSubmissions WHERE clientID = @clientID ORDER BY submittedAt DESC`);
    if (r.recordset.length > 0) {
      doc.addPage();
      drawSubHeader(doc, 'Form Submissions Log');
      r.recordset.forEach((sub, i) => {
        doc.font('Helvetica-Bold').fontSize(9).text(`Submission #${i + 1} – ${formatDate(sub.submittedAt)}`);
        drawTwoColumn(doc, [
          ['Submitted By',     sub.submittedBy],
          ['Status',           sub.status],
          ['Reviewed By',      sub.reviewedBy],
          ['Reviewed At',      formatDate(sub.reviewedAt)],
          ['Review Notes',     sub.reviewNotes],
          ['Submission Notes', sub.submissionNotes],
        ]);
      });
    }
  } catch {}
}

// ─── Section 3 — module-scope constants ─────────────────────────────────────

const CM_OB_LABELS = {
  cmOb1:    'Appeared cooperative',
  cmOb2:    'Appeared distressed / agitated',
  cmOb3:    'Appeared dishevelled / poor hygiene',
  cmOb4:    'Appeared intoxicated / under influence',
  cmOb5:    'Appeared disoriented',
  cmOb6:    'Reported suicidal ideation',
  cmOb7:    'Reported self-harm urges',
  cmOb8:    'Reported auditory / visual hallucinations',
  cmOb9:    'Reported recent trauma or crisis',
  cmOb10:   'Reported medication non-compliance',
  cmOb11:   'Reported housing instability',
  cmObNone: 'No significant observations',
};

const BSA_INCOME_COLS = [
  ['clientCalWorks',  'CalWorks'],
  ['clientSSI',       'SSI'],
  ['clientSSDI',      'SSDI'],
  ['clientTANF',      'TANF'],
  ['clientGenRelief', 'General Relief'],
  ['clientEmployment','Employment'],
  ['clientUnEmp',     'Unemployment'],
  ['clientVetBen',    'Veterans Benefits'],
  ['clientWorkComp',  'Workers Compensation'],
  ['clientStDis',     'State Disability'],
  ['clientCS',        'Child Support'],
  ['clientWidowBen',  'Widow Benefits'],
  ['clientFoodStamps','Food Stamps / CalFresh'],
  ['clientInherit',   'Inheritance'],
  ['clientOtherInc',  'Other Income'],
];

// ─── Section 3 — subsection page header banner ───────────────────────────────

function drawS3SubsectionBanner(doc, number, title) {
  doc.addPage();
  const pw = doc.page.width;
  const ml = doc.page.margins.left;
  const mr = doc.page.margins.right;
  const w  = pw - ml - mr;

  doc.rect(ml, doc.y, w, 22).fill('#C8E6C9');
  const bannerY = doc.y - 22;

  // Number badge
  doc.rect(ml, bannerY, 26, 22).fill('#388E3C');
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
     .text(String(number), ml + 1, bannerY + 6, { width: 26, align: 'center' });

  // Title
  doc.fillColor('#1B5E20').fontSize(11).font('Helvetica-Bold')
     .text(title, ml + 30, bannerY + 6, { width: w - 30 });

  doc.fillColor('#000000').moveDown(0.5);
}

// ─── Section 3 — CM observation checklist renderer ───────────────────────────

function renderCmObChecklist(doc, row) {
  const checks = Object.entries(CM_OB_LABELS)
    .map(([col, label]) => ({ label, checked: !!row[col] }));
  const anyChecked = checks.some(c => c.checked);

  drawSubHeader(doc, 'Case Manager Observations');
  if (!anyChecked) {
    noData(doc, 'No CM observations recorded.');
    return;
  }
  checks.forEach(({ label, checked }) => {
    doc.font('Helvetica').fontSize(9)
       .text(`${checked ? '☑' : '☐'}  ${label}`);
  });
  doc.moveDown(0.4);
}

// ─── Section 3 — main renderer ───────────────────────────────────────────────

async function renderSection3(doc, pool, clientID) {
  drawSectionHeader(doc, 'Section 3 – Assessment & Care Plans', '#388E3C');

  // ── Pre-fetch all Section 3 tables (all direct clientID FK) ─────────────
  const fetched = {};

  // Helper: query one table, store results, return recordset (never throws)
  const fetchDirect = async (key, table, orderBy = 'createdAt DESC') => {
    try {
      const r = await pool.request()
        .input('clientID', sql.NVarChar, clientID)
        .query(`SELECT * FROM dbo.${table} WHERE clientID = @clientID ORDER BY ${orderBy}`);
      fetched[key] = r.recordset;
    } catch (e) {
      fetched[key] = null;
      fetched[key + '_error'] = e.message;
    }
  };

  await fetchDirect('bioSocial',           'BioSocialAssessment',          'createdAt DESC');
  await fetchDirect('mentalHealth',        'MentalHealthAssessments',       'createdAt DESC');
  await fetchDirect('reassessment',        'ReassessmentData',              'createdAt DESC');
  await fetchDirect('carePlans',           'CarePlans',                     'createdAt DESC');
  await fetchDirect('substanceAbuse',      'SubstanceAbuseData',            'createdAt DESC');
  await fetchDirect('arrests',             'ArrestRecords',                 'createdAt DESC');
  await fetchDirect('hospitalizations',    'MentalHealthHospitalizations',  'createdAt DESC');
  await fetchDirect('medications',         'MentalHealthMedications',       'createdAt DESC');
  await fetchDirect('mhProviders',         'MentalHealthProviders',         'createdAt DESC');
  await fetchDirect('progressNotes',       'progress_notes',                'nurseNoteDate DESC');


  // AssessmentMilestones, AssessmentRiskFactors, AssessmentStrengths only have assessmentID FK
  fetched.milestones  = [];
  fetched.riskFactors = [];
  fetched.strengths   = [];
  try {
    const acpR = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`SELECT TOP 1 assessmentID FROM dbo.AssessmentCarePlans WHERE clientID = @clientID`);
    const assessmentID = acpR.recordset[0] ? acpR.recordset[0].assessmentID : null;
    if (assessmentID) {
      const fetchByAssessment = async (key, table, orderBy) => {
        try {
          const r = await pool.request()
            .input('assessmentID', sql.NVarChar, assessmentID)
            .query(`SELECT * FROM dbo.${table} WHERE assessmentID = @assessmentID ORDER BY ${orderBy}`);
          fetched[key] = r.recordset;
        } catch (e) {
          fetched[key + '_error'] = e.message;
        }
      };
      await fetchByAssessment('milestones',  'AssessmentMilestones',  'dueDate DESC');
      await fetchByAssessment('riskFactors', 'AssessmentRiskFactors', 'createdAt DESC');
      await fetchByAssessment('strengths',   'AssessmentStrengths',   'createdAt DESC');
    }
  } catch (e) {
    fetched.milestones_error  = e.message;
    fetched.riskFactors_error = e.message;
    fetched.strengths_error   = e.message;
  }

  // CarePlan child tables (carePlanID FK)
  fetched.carePlanActivities    = [];
  fetched.carePlanProgressNotes = [];
  if (fetched.carePlans && fetched.carePlans.length) {
    const ids = fetched.carePlans
      .map(cp => `'${String(cp.carePlanID).replace(/'/g, "''")}'`).join(',');
    try {
      const ra = await pool.request()
        .query(`SELECT * FROM dbo.CarePlanActivities WHERE carePlanID IN (${ids}) ORDER BY createdAt DESC`);
      fetched.carePlanActivities = ra.recordset;
    } catch {}
    try {
      const rp = await pool.request()
        .query(`SELECT * FROM dbo.CarePlanProgressNotes WHERE carePlanID IN (${ids}) ORDER BY noteDate DESC`);
      fetched.carePlanProgressNotes = rp.recordset;
    } catch {}
  }

  // ── Summary table ─────────────────────────────────────────────────────────
  const S3_SUMMARY = [
    { key: 'bioSocial',           label: 'Bio-Social Assessment'          },
    { key: 'mentalHealth',        label: 'Mental Health Assessment'        },
    { key: 'reassessment',        label: 'Reassessment / Follow-Up'        },
    { key: 'carePlans',           label: 'Care Plans'                      },
    { key: 'carePlanActivities',  label: 'Care Plan Activities'            },
    { key: 'carePlanProgressNotes',label:'Care Plan Progress Notes'        },
    { key: 'substanceAbuse',      label: 'Substance Use History'           },
    { key: 'arrests',             label: 'Arrest History'                  },
    { key: 'hospitalizations',    label: 'MH Hospitalizations'             },
    { key: 'medications',         label: 'Psych Medications'               },
    { key: 'mhProviders',         label: 'Mental Health Providers'         },
    { key: 'progressNotes',       label: 'Progress / Nurse Notes'          },
  ];

  const pw   = doc.page.width;
  const ml   = doc.page.margins.left;
  const mr   = doc.page.margins.right;
  const w    = pw - ml - mr;
  const rowH = 18;

  drawSubHeader(doc, 'Assessment & Care Plans — Section Summary');
  const cols  = ['Subsection', 'Records', 'Status'];
  const colWs = [w * 0.60, w * 0.15, w * 0.25];
  let xOff    = ml;
  doc.rect(ml, doc.y, w, rowH).fill('#388E3C');
  cols.forEach((h, i) => {
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8)
       .text(h, xOff + 3, doc.y - rowH + 5, { width: colWs[i] - 3 });
    xOff += colWs[i];
  });
  doc.moveDown(0.05);

  S3_SUMMARY.forEach(({ key, label }, idx) => {
    const rows    = fetched[key];
    const count   = Array.isArray(rows) ? rows.length : 0;
    const hasData = count > 0;
    const errMsg  = fetched[key + '_error'];
    doc.rect(ml, doc.y, w, rowH).fill(idx % 2 === 0 ? '#FFFFFF' : '#E8F5E9');
    xOff = ml;
    const cells = [
      { text: label,                                              bold: false, color: '#000000'  },
      { text: String(count),                                      bold: true,  color: hasData ? '#1B5E20' : '#757575' },
      { text: errMsg ? `Error: ${errMsg}` : hasData ? 'Found' : 'No records',
        bold: true, color: errMsg ? '#C62828' : hasData ? '#2E7D32' : '#757575' },
    ];
    cells.forEach((cell, i) => {
      doc.fillColor(cell.color).font(cell.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5)
         .text(cell.text, xOff + 3, doc.y - rowH + 5, { width: colWs[i] - 4 });
      xOff += colWs[i];
    });
    doc.moveDown(0.05);
  });
  doc.moveDown(0.8);

  // ══════════════════════════════════════════════════════════════════════════
  // 1 — Bio-Social Assessment
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 1, 'Bio-Social Assessment');
  drawSubHeader(doc, 'BioSocialAssessment');
  const bsRows = fetched.bioSocial;
  if (!bsRows) {
    noData(doc, `Query failed: ${fetched.bioSocial_error}`);
  } else if (!bsRows.length) {
    noData(doc);
  } else {
    const bs = bsRows[0];
    // TEMP DEBUG — remove after confirming field names
    console.log('[Section3 BioSocial raw]', JSON.stringify(bs, null, 2));

    // ── Header metadata ──
    drawSubHeader(doc, 'Record Info');
    drawTwoColumn(doc, [
      ['Completed By',       bs.completedBy],
      ['Completed At',       formatDate(bs.completedAt)],
      ['Completion Status',  bs.completionStatus],
      ['Completion %',       bs.completionPercentage != null ? `${Number(bs.completionPercentage).toFixed(0)}%` : 'N/A'],
      ['Time Spent (hrs)',   bs.timeSpent != null ? String(bs.timeSpent) : 'N/A'],
      ['Created By',         bs.createdBy],
      ['Created At',         formatDate(bs.createdAt)],
      ['Updated By',         bs.updatedBy],
      ['Updated At',         formatDate(bs.updatedAt)],
    ]);

    // ── Financial / Income ──
    drawSubHeader(doc, 'Financial & Income');
    drawTwoColumn(doc, [
      ['Total Monthly Income', bs.totalMonthlyIncome != null ? `$${Number(bs.totalMonthlyIncome).toFixed(2)}` : 'N/A'],
      ['Payee Choice',         bs.payeeChoice],
      ['Payee Name',           bs.payeeName],
      ['Payee Phone',          bs.payeePhone],
      ['Payee Relationship',   bs.payeeRelationship],
    ]);
    doc.font('Helvetica-Bold').fontSize(9).text('Income Sources:').moveDown(0.2);
    const anyIncome = BSA_INCOME_COLS.some(([col]) => bs[col] && bs[col] !== '0' && bs[col] !== 'No' && bs[col] !== 'false');
    if (!anyIncome) {
      noData(doc, 'No income sources checked.');
    } else {
      BSA_INCOME_COLS.forEach(([col, label]) => {
        const val = bs[col];
        const checked = val && val !== '0' && val !== 'No' && val !== 'false';
        doc.font('Helvetica').fontSize(9).text(`${checked ? '☑' : '☐'}  ${label}`);
      });
      doc.moveDown(0.4);
    }

    // ── Employment ──
    drawSubHeader(doc, 'Employment');
    drawTwoColumn(doc, [
      ['Currently Employed',   bs.clientEmployed],
      ['Employer',             bs.clientEmployer],
      ['Been Employed Before', bs.clientBeenEmployed],
      ['Interested in Work',   bs.clientEmpIntr],
      ['Last Employment Date', formatDate(bs.lastEmploymentDate)],
      ['Employment Barriers',  bs.employmentBarriers],
    ]);

    // ── Debt & Financial History ──
    drawSubHeader(doc, 'Debt & Financial History');
    drawTwoColumn(doc, [
      ['Has Debt',          bs.clientDebt],
      ['Debt Amount',       bs.clientDebtAmount],
      ['Filed Bankruptcy',  bs.clientBankrupt],
      ['Bankruptcy Date',   formatDate(bs.bankruptcyDate)],
      ['Credit Rating',     bs.clientCreditRating],
    ]);

    // ── Housing History ──
    drawSubHeader(doc, 'Housing History');
    drawTwoColumn(doc, [
      ['Gov Housing Application', bs.clientGovHousingApp],
      ['Lived in Gov Housing',    bs.clientGovHousingLive],
      ['Past Renter',             bs.clientPastRenter],
      ['Late Rent History',       bs.clientPastRenterLate],
      ['Evicted',                 bs.clientEvicted],
      ['Landlord Problems',       bs.clientLandlordProb],
      ['Utility Bill Issues',     bs.clientUtilityBill],
      ['Housing Stability',       bs.housingStability],
    ]);
    if (bs.clientHousingSummary) drawField(doc, 'Housing Summary', bs.clientHousingSummary);

    // ── Activities of Daily Living (ADL) ──
    drawSubHeader(doc, 'Activities of Daily Living (ADL)');
    drawTwoColumn(doc, [
      ['ADL Score',       bs.adlScore != null ? String(bs.adlScore) : 'N/A'],
      ['ADL Percentage',  bs.adlPercentage != null ? `${Number(bs.adlPercentage).toFixed(1)}%` : 'N/A'],
      ['Ambulatory',      bs.clientAmbulatory],
      ['Eating',          bs.clientEating],
      ['Bathing',         bs.clientBathing],
      ['Brushing/Grooming', bs.clientBrushing],
      ['Toileting',       bs.clientToileting],
      ['Cooking',         bs.clientCooking],
      ['Cleaning',        bs.clientCleaning],
      ['Laundry',         bs.clientLaundry],
      ['Taking Medications', bs.clientTakingMeds],
      ['Functional Assist Needed', bs.clientFunctionalAssist],
    ]);
    if (bs.clientAmbulatorySummary) drawField(doc, 'Ambulatory Summary', bs.clientAmbulatorySummary);

    // ── Communication ──
    drawSubHeader(doc, 'Communication');
    drawTwoColumn(doc, [
      ['Primary Language',        bs.primaryLanguage],
      ['Interpreter Needed',      formatBool(bs.interpreterNeeded)],
      ['Communication Method',    bs.clientCommunication],
      ['Communication Barriers',  bs.communicationBarriers],
    ]);

    // ── Summary / Notes ──
    drawSubHeader(doc, 'Summary & Notes');
    if (bs.riskFactors)         drawField(doc, 'Risk Factors',          bs.riskFactors);
    if (bs.strengths)           drawField(doc, 'Strengths',             bs.strengths);
    if (bs.recommendedServices) drawField(doc, 'Recommended Services',  bs.recommendedServices);
    if (bs.clientBioSocialNotes)drawField(doc, 'Bio-Social Notes',      bs.clientBioSocialNotes);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 2 — Mental Health Assessment
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 2, 'Mental Health Assessment');
  drawSubHeader(doc, 'MentalHealthAssessments');
  const mhRows = fetched.mentalHealth;
  if (!mhRows) {
    noData(doc, `Query failed: ${fetched.mentalHealth_error}`);
  } else if (!mhRows.length) {
    noData(doc);
  } else {
    const mh = mhRows[0];

    drawSubHeader(doc, 'Record Info');
    drawTwoColumn(doc, [
      ['Created By',          mh.createdBy],
      ['Created At',          formatDate(mh.createdAt)],
      ['Updated By',          mh.updatedBy],
      ['Updated At',          formatDate(mh.updatedAt)],
      ['Completion Status',   mh.completionStatus],
      ['Completion %',        mh.completionPercentage != null ? `${Number(mh.completionPercentage).toFixed(0)}%` : 'N/A'],
      ['Time Spent (hrs)',    mh.timeSpent != null ? String(mh.timeSpent) : 'N/A'],
      ['Risk Level',          mh.riskLevel],
      ['Columbia SR Comp',    mh.columbiaSRComp],
    ]);

    drawSubHeader(doc, 'MH History & Diagnosis');
    if (mh.mentalHealthHistory)          drawField(doc, 'MH History',              mh.mentalHealthHistory);
    if (mh.mentalHealthDiagnosis)        drawField(doc, 'Diagnosis',               mh.mentalHealthDiagnosis);
    if (mh.mentalHealthTreatment)        drawField(doc, 'Past Treatment',          mh.mentalHealthTreatment);
    if (mh.mentalHealthCurrentTreatment) drawField(doc, 'Current Treatment',       mh.mentalHealthCurrentTreatment);
    if (mh.mhFamHistory)                 drawField(doc, 'Family MH History',       mh.mhFamHistory);

    drawSubHeader(doc, 'Current Symptoms');
    drawTwoColumn(doc, [
      ['Feeling Sad/Depressed',  mh.mhSad],
      ['Feeling Anxious',        mh.mhAnxious],
      ['Sleep Pattern',          mh.mhSleepPattern],
      ['Energy Level',           mh.mhEnergyLevel],
      ['Concentration',          mh.mhConcentrate],
      ['Intrusive Thoughts',     mh.mhThoughts],
      ['Hearing Voices',         mh.mhVoices],
      ['What Voices Say',        mh.mhVoicesSay],
      ['Following (paranoia)',   mh.mhFollowing],
      ['Someone After Them',     mh.mhSomeone],
    ]);
    if (mh.mhSummary) drawField(doc, 'MH Summary', mh.mhSummary);

    drawSubHeader(doc, '⚠  Suicide, Self-Harm & Risk');
    drawTwoColumn(doc, [
      ['Self-Harm',              mh.mhSelfHarm],
      ['Self-Harm Occurrence',   mh.mhSelfHarmOccurrence],
      ['Suicidal Ideation',      mh.mhSuicide],
      ['Last Suicidal Ideation', mh.mhSuicideLast],
      ['Client Risk',            mh.clientRisk],
      ['Abuse History',          mh.mhAbuse],
    ]);
    if (mh.mhRiskSummary) drawField(doc, 'Risk Summary', mh.mhRiskSummary);

    drawSubHeader(doc, 'Substance Abuse');
    drawTwoColumn(doc, [
      ['Sought Help for Substance Abuse', mh.mhSubAbuseHelp],
    ]);
    if (mh.mhSubAbSum) drawField(doc, 'Substance Abuse Summary', mh.mhSubAbSum);

    drawSubHeader(doc, 'Legal Issues');
    drawTwoColumn(doc, [
      ['Legal Issues',       mh.clientLegalIssues],
      ['Probation',          mh.clientLegalProbation],
      ['Parole',             mh.clientLegalParole],
      ['Meth Arrest',        mh.arrestMeth],
      ['Drug/Alcohol Arrest',mh.arrestDrugAlcohol],
      ['Violent Arrest',     mh.arrestViolent],
      ['Arson Arrest',       mh.arrestArson],
      ['Sex Crime Arrest',   mh.arrestSexCrime],
      ['Registered Sex Offender', mh.regSexOffender],
      ['Other Arrest/Crime', mh.arrestCrime],
    ]);
    if (mh.mhLegalSum) drawField(doc, 'Legal Summary', mh.mhLegalSum);

    drawSubHeader(doc, 'Patient & Family Needs');
    if (mh.clientPatFamNeeds) drawField(doc, 'Patient/Family Needs', mh.clientPatFamNeeds);
    if (mh.mhNeedsSum)        drawField(doc, 'Needs Summary',        mh.mhNeedsSum);

    renderCmObChecklist(doc, mh);
    if (mh.cmObvSum) drawField(doc, 'CM Observations Summary', mh.cmObvSum);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3 — Reassessment / Follow-Up
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 3, 'Reassessment / Follow-Up');
  drawSubHeader(doc, 'ReassessmentData');
  const reRows = fetched.reassessment;
  if (!reRows) {
    noData(doc, `Query failed: ${fetched.reassessment_error}`);
  } else if (!reRows.length) {
    noData(doc);
  } else {
    const active = reRows.filter(r => !r.isDeleted);
    if (!active.length) {
      noData(doc, 'All reassessment records are marked as deleted.');
    } else {
      active.forEach((re, i) => {
        doc.font('Helvetica-Bold').fontSize(9)
           .text(`Reassessment #${i + 1} — ${formatDate(re.dateLastReAssess || re.createdAt)}`);
        drawTwoColumn(doc, [
          ['Full Assessment Date',   formatDate(re.dateFullAssess)],
          ['Last Reassessment Date', formatDate(re.dateLastReAssess)],
          ['Completed By',           re.completedBy],
          ['Completed At',           formatDate(re.completedAt)],
          ['Created By',             re.createdBy],
          ['Created At',             formatDate(re.createdAt)],
          ['Updated By',             re.updatedBy],
          ['Updated At',             formatDate(re.updatedAt)],
          ['Completion Status',      re.completionStatus],
          ['Completion %',           re.completionPercentage != null ? `${Number(re.completionPercentage).toFixed(0)}%` : 'N/A'],
          ['Risk Level',             re.riskLevel],
          ['Follow-Up Required',     formatBool(re.followUpRequired)],
          ['Next Review Date',       formatDate(re.nextReviewDate)],
          ['Columbia SR Completed',  re.columbiaSRComp],
          ['Columbia SR',            re.columbiaSR],
        ]);
        drawTwoColumn(doc, [
          ['Reassessment Sources',   re.reassessmentSources],
          ['Cultural Considerations',re.culturalCons],
          ['Physical Challenges',    re.physicalChall],
          ['Access Issues',          re.accessIssues],
          ['Current Symptoms',       re.currentSymp],
          ['Reason for Referral',    re.reasonForRef],
          ['Suicidal/Homicidal Thoughts', re.suicHomiThou],
        ]);
        if (re.diagDescript)                     drawField(doc, 'Diagnosis Description',         re.diagDescript);
        if (re.diagDescriptCodeChoice)            drawField(doc, 'Diagnosis Code Choice',         re.diagDescriptCodeChoice);
        if (re.diagDescriptCode)                  drawField(doc, 'Diagnosis Code',                re.diagDescriptCode);
        if (re.recommendedActions)               drawField(doc, 'Recommended Actions',           re.recommendedActions);
        if (re.clientStrengthReAssessSummary)    drawField(doc, 'Strengths Summary',             re.clientStrengthReAssessSummary);
        if (re.clientFormReAssessSummary)        drawField(doc, 'Form Reassessment Summary',     re.clientFormReAssessSummary);
        renderCmObChecklist(doc, re);
        if (re.cmObvSum) drawField(doc, 'CM Observations Summary', re.cmObvSum);
        doc.moveDown(0.4);
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 4 — Care Plans
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 4, 'Care Plans');
  drawSubHeader(doc, 'CarePlans');
  const cpRows = fetched.carePlans;
  if (!cpRows) {
    noData(doc, `Query failed: ${fetched.carePlans_error}`);
  } else if (!cpRows.length) {
    noData(doc);
  } else {
    cpRows.forEach((cp, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Care Plan #${i + 1} — ${formatDate(cp.createdAt)}`);
      drawTwoColumn(doc, [
        ['Care Plan ID',  cp.carePlanID],
        ['Status',        cp.status],
        ['Priority',      cp.priority],
        ['Target Date',   formatDate(cp.targetDate)],
        ['Created By',    cp.createdBy],
        ['Created At',    formatDate(cp.createdAt)],
        ['Updated By',    cp.updatedBy],
        ['Updated At',    formatDate(cp.updatedAt)],
      ]);
      if (cp.careGoal)      drawField(doc, 'Goal',          cp.careGoal);
      if (cp.careSteps)     drawField(doc, 'Steps',         cp.careSteps);
      if (cp.careClientAct) drawField(doc, 'Client Action', cp.careClientAct);
      if (cp.careCmAct)     drawField(doc, 'CM Action',     cp.careCmAct);
      if (cp.careOutcome)   drawField(doc, 'Outcome',       cp.careOutcome);
      doc.moveDown(0.5);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 5 — Care Plan Activities
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 5, 'Care Plan Activities');
  drawSubHeader(doc, 'CarePlanActivities');
  const caRows = fetched.carePlanActivities;
  if (!caRows || !caRows.length) {
    noData(doc);
  } else {
    caRows.forEach((ca, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Activity #${i + 1} — ${safeStr(ca.activityTitle)}`);
      drawTwoColumn(doc, [
        ['Care Plan ID',    ca.carePlanID],
        ['Assigned To',     ca.assignedTo],
        ['Due Date',        formatDate(ca.dueDate)],
        ['Completed',       formatBool(ca.completed)],
        ['Completed Date',  formatDate(ca.completedDate)],
        ['Completed By',    ca.completedBy],
        ['Sort Order',      ca.sortOrder != null ? String(ca.sortOrder) : 'N/A'],
        ['Created By',      ca.createdBy],
        ['Created At',      formatDate(ca.createdAt)],
        ['Updated By',      ca.updatedBy],
        ['Updated At',      formatDate(ca.updatedAt)],
      ]);
      if (ca.activityDescription) drawField(doc, 'Description', ca.activityDescription);
      if (ca.notes)               drawField(doc, 'Notes',       ca.notes);
      doc.moveDown(0.3);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 6 — Care Plan Progress Notes
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 6, 'Care Plan Progress Notes');
  drawSubHeader(doc, 'CarePlanProgressNotes');
  const cpnRows = fetched.carePlanProgressNotes;
  if (!cpnRows || !cpnRows.length) {
    noData(doc);
  } else {
    cpnRows.forEach((pn, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Progress Note #${i + 1} — ${formatDate(pn.noteDate || pn.createdAt)}`);
      drawTwoColumn(doc, [
        ['Care Plan ID',    pn.carePlanID],
        ['Note Date',       formatDate(pn.noteDate)],
        ['Progress Status', pn.progressStatus],
        ['Created By',      pn.createdBy],
        ['Created At',      formatDate(pn.createdAt)],
      ]);
      if (pn.progressDescription) drawField(doc, 'Progress Description', pn.progressDescription);
      if (pn.barriers)            drawField(doc, 'Barriers',             pn.barriers);
      if (pn.nextSteps)           drawField(doc, 'Next Steps',           pn.nextSteps);
      doc.moveDown(0.3);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 7 — Substance Use History
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 7, 'Substance Use History');
  drawSubHeader(doc, 'SubstanceAbuseData');
  const saRows = fetched.substanceAbuse;
  if (!saRows) {
    noData(doc, `Query failed: ${fetched.substanceAbuse_error}`);
  } else if (!saRows.length) {
    noData(doc);
  } else {
    saRows.forEach((sa, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Record #${i + 1} — ${safeStr(sa.substanceName)}`);
      drawTwoColumn(doc, [
        ['Substance',      sa.substanceName],
        ['Use Pattern',    sa.substanceUse],
        ['Frequency',      sa.frequency],
        ['Method',         sa.method],
        ['Year Started',   sa.yearStarted],
        ['Year Quit',      sa.yearQuit],
        ['Created By',     sa.createdBy],
        ['Created At',     formatDate(sa.createdAt)],
      ]);
      doc.moveDown(0.3);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 8 — Arrest History
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 8, 'Arrest History');
  drawSubHeader(doc, 'ArrestRecords');
  const arRows = fetched.arrests;
  if (!arRows) {
    noData(doc, `Query failed: ${fetched.arrests_error}`);
  } else if (!arRows.length) {
    noData(doc);
  } else {
    arRows.forEach((ar, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Arrest #${i + 1} — ${formatDate(ar.arrestDate)}`);
      drawTwoColumn(doc, [
        ['Arrest Date',          formatDate(ar.arrestDate)],
        ['Charge',               ar.charge],
        ['Misdemeanor / Felony', ar.misdemeanorOrFelony],
        ['Location',             ar.location],
        ['Time Served',          ar.timeServed],
        ['Result',               ar.result],
        ['Created By',           ar.createdBy],
        ['Created At',           formatDate(ar.createdAt)],
      ]);
      doc.moveDown(0.3);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 9 — MH Hospitalizations
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 9, 'Mental Health Hospitalizations');
  drawSubHeader(doc, 'MentalHealthHospitalizations');
  const mhhRows = fetched.hospitalizations;
  if (!mhhRows) {
    noData(doc, `Query failed: ${fetched.hospitalizations_error}`);
  } else if (!mhhRows.length) {
    noData(doc);
  } else {
    mhhRows.forEach((mhh, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Hospitalization #${i + 1} — ${formatDate(mhh.hospitalizationDate)}`);
      drawTwoColumn(doc, [
        ['Hospitalization Date', formatDate(mhh.hospitalizationDate)],
        ['Location',             mhh.location],
        ['Reasons',              mhh.reasons],
        ['Created By',           mhh.createdBy],
        ['Created At',           formatDate(mhh.createdAt)],
      ]);
      doc.moveDown(0.3);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 10 — Psych Medications
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 10, 'Psych Medications');
  drawSubHeader(doc, 'MentalHealthMedications');
  const mhmRows = fetched.medications;
  if (!mhmRows) {
    noData(doc, `Query failed: ${fetched.medications_error}`);
  } else if (!mhmRows.length) {
    noData(doc);
  } else {
    mhmRows.forEach((med, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Medication #${i + 1} — ${safeStr(med.name)}`);
      drawTwoColumn(doc, [
        ['Medication Name', med.name],
        ['Dose',            med.dose],
        ['Active',          formatBool(med.active)],
        ['Created By',      med.createdBy],
        ['Created At',      formatDate(med.createdAt)],
      ]);
      if (med.sideEffects) drawField(doc, 'Side Effects', med.sideEffects);
      doc.moveDown(0.3);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 11 — Mental Health Providers
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 11, 'Mental Health Providers');
  drawSubHeader(doc, 'MentalHealthProviders');
  const mhpRows = fetched.mhProviders;
  if (!mhpRows) {
    noData(doc, `Query failed: ${fetched.mhProviders_error}`);
  } else if (!mhpRows.length) {
    noData(doc);
  } else {
    mhpRows.forEach((pr, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Provider #${i + 1} — ${safeStr(pr.agency)}`);
      drawTwoColumn(doc, [
        ['Agency',           pr.agency],
        ['Worker',           pr.worker],
        ['Phone',            pr.phone],
        ['Last Appointment', formatDate(pr.lastAppointment)],
        ['Next Appointment', formatDate(pr.nextAppointment)],
        ['Active',           formatBool(pr.active)],
        ['Created By',       pr.createdBy],
        ['Created At',       formatDate(pr.createdAt)],
      ]);
      doc.moveDown(0.3);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 12 — Assessment Milestones
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 12, 'Assessment Milestones');
  drawSubHeader(doc, 'AssessmentMilestones');
  const milRows = fetched.milestones;
  if (!milRows) {
    noData(doc, `Query failed: ${fetched.milestones_error}`);
  } else if (!milRows.length) {
    noData(doc);
  } else {
    milRows.forEach((m, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Milestone #${i + 1} — ${safeStr(m.title)}`);
      drawTwoColumn(doc, [
        ['Title',          m.title],
        ['Due Date',       formatDate(m.dueDate)],
        ['Completed',      formatBool(m.completed)],
        ['Completed Date', formatDate(m.completedDate)],
        ['Completed By',   m.completedBy],
        ['Required',       formatBool(m.required)],
        ['Est. Hours',     m.estimatedHours != null ? String(m.estimatedHours) : 'N/A'],
        ['Actual Hours',   m.actualHours    != null ? String(m.actualHours)    : 'N/A'],
        ['Created By',     m.createdBy],
        ['Created At',     formatDate(m.createdAt)],
        ['Updated By',     m.updatedBy],
        ['Updated At',     formatDate(m.updatedAt)],
      ]);
      if (m.description) drawField(doc, 'Description', m.description);
      if (m.notes)       drawField(doc, 'Notes',       m.notes);
      doc.moveDown(0.3);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 13 — Assessment Risk Factors
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 13, 'Assessment Risk Factors');
  drawSubHeader(doc, 'AssessmentRiskFactors');
  const rfRows = fetched.riskFactors;
  if (!rfRows) {
    noData(doc, `Query failed: ${fetched.riskFactors_error}`);
  } else if (!rfRows.length) {
    noData(doc);
  } else {
    rfRows.forEach((rf, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Risk Factor #${i + 1} — ${safeStr(rf.riskCategory)}`);
      drawTwoColumn(doc, [
        ['Risk Category',  rf.riskCategory],
        ['Risk Level',     rf.riskLevel],
        ['Identified',     formatBool(rf.identified)],
        ['Identified By',  rf.identifiedBy],
        ['Created By',     rf.createdBy],
        ['Created At',     formatDate(rf.createdAt)],
        ['Updated By',     rf.updatedBy],
        ['Updated At',     formatDate(rf.updatedAt)],
      ]);
      if (rf.riskDescription) drawField(doc, 'Risk Description', rf.riskDescription);
      if (rf.mitigation)      drawField(doc, 'Mitigation Plan',  rf.mitigation);
      if (rf.notes)           drawField(doc, 'Notes',            rf.notes);
      doc.moveDown(0.3);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 14 — Assessment Strengths
  // ══════════════════════════════════════════════════════════════════════════
  drawS3SubsectionBanner(doc, 14, 'Assessment Strengths');
  drawSubHeader(doc, 'AssessmentStrengths');
  const stRows = fetched.strengths;
  if (!stRows) {
    noData(doc, `Query failed: ${fetched.strengths_error}`);
  } else if (!stRows.length) {
    noData(doc);
  } else {
    stRows.forEach((s, i) => {
      doc.font('Helvetica-Bold').fontSize(9)
         .text(`Strength #${i + 1} — ${safeStr(s.strengthCategory)}`);
      drawTwoColumn(doc, [
        ['Strength Category', s.strengthCategory],
        ['Identified By',     s.identifiedBy],
        ['Created By',        s.createdBy],
        ['Created At',        formatDate(s.createdAt)],
        ['Updated By',        s.updatedBy],
        ['Updated At',        formatDate(s.updatedAt)],
      ]);
      if (s.strengthDescription) drawField(doc, 'Description',  s.strengthDescription);
      if (s.leveragePlan)        drawField(doc, 'Leverage Plan', s.leveragePlan);
      if (s.notes)               drawField(doc, 'Notes',         s.notes);
      doc.moveDown(0.3);
    });
  }
}

// ─── Section 4 layout helpers ────────────────────────────────────────────────
// All helpers capture doc.y at entry, do all drawing with explicit coords,
// then forcibly set doc.y to exactly where the next element should start.
// No moveDown() calls anywhere — PDFKit cursor drift is eliminated entirely.

function drawS4SubsectionBanner(doc, number, title) {
  const ml = doc.page.margins.left;
  const w  = doc.page.width - ml - doc.page.margins.right;
  const h  = 22;
  const y  = doc.y;                          // snapshot cursor before any drawing

  // Background + badge
  doc.rect(ml, y, w, h).fill('#FFE0B2');
  doc.rect(ml, y, 26, h).fill('#F57C00');

  // Badge number — explicit coords, lineBreak:false, then immediately snap cursor
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
     .text(String(number), ml + 1, y + 5, { width: 26, align: 'center', lineBreak: false });
  doc.y = y + h;                             // snap back — .text() drifted it

  // Title text
  doc.fillColor('#BF360C').fontSize(11).font('Helvetica-Bold')
     .text(title, ml + 32, y + 5, { width: w - 32, lineBreak: false });
  doc.y = y + h;                             // snap back again

  doc.fillColor('#000000');
  doc.y = y + h + 8;                         // final position: just below banner
}

function drawS4EntryHeader(doc, index, dateStr, typeStr) {
  const ml = doc.page.margins.left;
  const w  = doc.page.width - ml - doc.page.margins.right;
  const h  = 16;
  const y  = doc.y;

  doc.rect(ml, y, w, h).fill('#F5F5F5').stroke('#E0E0E0');
  doc.circle(ml + 10, y + 8, 7).fill('#F57C00');

  doc.fillColor('white').fontSize(7).font('Helvetica-Bold')
     .text(String(index), ml + 3, y + 4, { width: 16, align: 'center', lineBreak: false });
  doc.y = y + h;

  doc.fillColor('#37474F').fontSize(8.5).font('Helvetica-Bold')
     .text(dateStr, ml + 24, y + 4, { width: 150, lineBreak: false });
  doc.y = y + h;

  if (typeStr && typeStr !== 'N/A') {
    doc.fillColor('#5D4037').fontSize(7.5).font('Helvetica')
       .text(typeStr, ml + 180, y + 5, { width: w - 200, align: 'right', lineBreak: false });
    doc.y = y + h;
  }

  doc.fillColor('#000000');
  doc.y = y + h + 4;                         // final: 4px below bar
}

function drawS4MetaGrid(doc, pairs) {
  const ml   = doc.page.margins.left;
  const colW = (doc.page.width - ml - doc.page.margins.right) / 2;
  const rowH = 13;
  const pad  = 4;
  const lblW = 80;

  for (let i = 0; i < pairs.length; i += 2) {
    const left  = pairs[i];
    const right = pairs[i + 1];
    const y     = doc.y;
    const shade = (i / 2) % 2 === 0 ? '#FFFFFF' : '#F9F9F9';

    doc.rect(ml, y, colW * 2, rowH).fill(shade);

    // Left label
    doc.fillColor('#666666').font('Helvetica-Bold').fontSize(7)
       .text(`${left[0]}:`, ml + pad, y + 3, { width: lblW, lineBreak: false });
    doc.y = y + rowH;
    // Left value
    doc.fillColor('#000000').font('Helvetica').fontSize(7.5)
       .text(safeStr(left[1]), ml + pad + lblW + 2, y + 3, { width: colW - pad - lblW - 6, lineBreak: false });
    doc.y = y + rowH;

    if (right) {
      // Right label
      doc.fillColor('#666666').font('Helvetica-Bold').fontSize(7)
         .text(`${right[0]}:`, ml + colW + pad, y + 3, { width: lblW, lineBreak: false });
      doc.y = y + rowH;
      // Right value
      doc.fillColor('#000000').font('Helvetica').fontSize(7.5)
         .text(safeStr(right[1]), ml + colW + pad + lblW + 2, y + 3, { width: colW - pad - lblW - 6, lineBreak: false });
      doc.y = y + rowH;
    }

    doc.y = y + rowH;                        // advance exactly one row
  }
  doc.y = doc.y + 4;                         // single gap after grid
}

function drawS4Narrative(doc, label, text) {
  if (!text || safeStr(text) === 'N/A') return;
  const ml    = doc.page.margins.left;
  const w     = doc.page.width - ml - doc.page.margins.right;
  const inset = 14;
  const textX = ml + inset + 6;
  const textW = w - inset - 8;

  // Label
  const labelY = doc.y;
  doc.fillColor('#E65100').font('Helvetica-Bold').fontSize(7.5)
     .text(label, textX, labelY, { width: textW, lineBreak: false });
  doc.y = labelY + 11;                       // fixed label height

  // Body text — this is the only call allowed to auto-advance doc.y (it wraps)
  const bodyY = doc.y;
  doc.fillColor('#222222').font('Helvetica').fontSize(8.5)
     .text(safeStr(text), textX, bodyY, { width: textW });
  // doc.y is now legitimately below the last line of wrapped text

  // Left accent rule spanning label+body
  doc.moveTo(ml + inset, labelY)
     .lineTo(ml + inset, doc.y + 1)
     .strokeColor('#F57C00').lineWidth(2).stroke()
     .lineWidth(0.5).strokeColor('#000000');

  doc.y = doc.y + 5;
}

// ─── Section 4 — main renderer ───────────────────────────────────────────────

async function renderSection4(doc, pool, clientID) {
  // drawSectionHeader calls addPage() + moveDown(2).
  // Immediately override doc.y to sit just below the 50px header bar.
  drawSectionHeader(doc, 'Section 4 – Client Progress', '#F57C00');
  doc.y = 60;

  // ── 1. Encounter Notes ──────────────────────────────────────────────────────
  drawS4SubsectionBanner(doc, 1, 'Encounter Notes (Most Recent 20)');
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`
        SELECT TOP 20
          Id, ClientID, CareNoteDate, CareNoteType, CareNoteSite, CareNote,
          CreatedBy, CreatedAt, UpdatedBy, UpdatedAt
        FROM dbo.EncounterNotes
        WHERE ClientID = @clientID
        ORDER BY CareNoteDate DESC, CreatedAt DESC
      `);
    if (r.recordset.length > 0) {
      r.recordset.forEach((note, i) => {
        drawS4EntryHeader(doc, i + 1, formatDate(note.CareNoteDate), safeStr(note.CareNoteType));
        drawS4MetaGrid(doc, [
          ['Note Type',  note.CareNoteType], ['Site',       note.CareNoteSite],
          ['Created By', note.CreatedBy],    ['Created At', formatDate(note.CreatedAt)],
          ['Updated By', note.UpdatedBy],    ['Updated At', formatDate(note.UpdatedAt)],
        ]);
        drawS4Narrative(doc, 'Note', note.CareNote);
        doc.y = doc.y + 8;                  // inter-entry separator
      });
    } else {
      noData(doc);
    }
  } catch (e) {
    noData(doc, `Encounter notes not available: ${e.message}`);
  }

  // ── 2. Care Plan Progress Notes ────────────────────────────────────────────
  doc.addPage();
  doc.y = 40;
  drawS4SubsectionBanner(doc, 2, 'Care Plan Progress Notes (Most Recent 20)');
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`
        SELECT TOP 20 pn.*
        FROM dbo.CarePlanProgressNotes pn
        INNER JOIN dbo.CarePlans cp ON pn.carePlanID = cp.carePlanID
        WHERE cp.clientID = @clientID
        ORDER BY pn.noteDate DESC
      `);
    if (r.recordset.length > 0) {
      r.recordset.forEach((pn, i) => {
        drawS4EntryHeader(doc, i + 1, formatDate(pn.noteDate || pn.createdAt), safeStr(pn.progressStatus));
        drawS4MetaGrid(doc, [
          ['Care Plan ID',    pn.carePlanID],  ['Progress Status', pn.progressStatus],
          ['Created By',      pn.createdBy],   ['Created At',      formatDate(pn.createdAt)],
        ]);
        if (pn.progressDescription) drawS4Narrative(doc, 'Progress Description', pn.progressDescription);
        if (pn.barriers)            drawS4Narrative(doc, 'Barriers',             pn.barriers);
        if (pn.nextSteps)           drawS4Narrative(doc, 'Next Steps',           pn.nextSteps);
        doc.y = doc.y + 8;
      });
    } else {
      noData(doc);
    }
  } catch (e) {
    noData(doc, `Care plan progress notes not available: ${e.message}`);
  }
}

async function renderSection5(doc, pool, clientID) {
  drawSectionHeader(doc, 'Section 5 – Medical Information & Screenings', '#7B1FA2');

  // ─── Helper: format time(0) columns as HH:MM ───────────────────────────────
  function formatTime(val) {
    if (!val) return 'N/A';
    // mssql returns time as a string like "08:30:00.0000000" or a Date
    const s = String(val);
    const match = s.match(/^(\d{2}:\d{2})/);
    return match ? match[1] : s;
  }

  // ─── 1. Medical Face Sheet (primary table) ─────────────────────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT TOP 1 * FROM dbo.medical_face_sheet WHERE clientID = @clientID');
    drawSubHeader(doc, 'Medical Face Sheet');
    const mfs = r.recordset[0];
    if (mfs) {
      drawTwoColumn(doc, [
        ['Client ID', mfs.clientID],
        ['Date Updated', formatDate(mfs.updatedAt || mfs.createdAt)],
      ]);
      drawField(doc, 'Medical Conditions', mfs.clientMedConditions);
      drawField(doc, 'Additional Medical History', mfs.clientAddMedHistory);
      drawField(doc, 'Pertinent Medical Information', mfs.clientMedPertinent);
      drawField(doc, 'Previous Lab Results', mfs.clientPreviousLab);
      drawField(doc, 'Allergies (Face Sheet)', mfs.clientAllergies);
    } else {
      noData(doc);
    }
  } catch (e) {
    noData(doc, `Medical face sheet unavailable: ${e.message}`);
  }

  // ─── 2. MedicalInfo (legacy duplicate — render if present) ────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT TOP 1 * FROM dbo.MedicalInfo WHERE clientID = @clientID');
    const mi = r.recordset[0];
    if (mi) {
      drawSubHeader(doc, 'Medical Info (Legacy)');
      drawTwoColumn(doc, [
        ['Client ID', mi.clientID],
        ['Date Updated', formatDate(mi.updatedAt || mi.createdAt)],
      ]);
      drawField(doc, 'Medical Conditions', mi.clientMedConditions);
      drawField(doc, 'Additional Medical History', mi.clientAddMedHistory);
      drawField(doc, 'Pertinent Medical Information', mi.clientMedPertinent);
      drawField(doc, 'Previous Lab Results', mi.clientPreviousLab);
      drawField(doc, 'Allergies (Legacy)', mi.clientAllergies);
    }
    // If no legacy record, silently skip — not an error
  } catch {
    // Table may not exist in all environments — silently skip
  }

  // ─── 3. Client Allergies (dedicated table) ─────────────────────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT allergyName FROM dbo.ClientAllergies WHERE clientID = @clientID');
    drawSubHeader(doc, 'Allergy List');
    if (r.recordset.length > 0) {
      r.recordset.forEach(row => {
        doc.font('Helvetica').fontSize(9).text(`• ${safeStr(row.allergyName)}`, { indent: 10 });
      });
      doc.moveDown(0.5);
    } else {
      noData(doc, 'No allergies on record.');
    }
  } catch (e) {
    noData(doc, `Allergy list unavailable: ${e.message}`);
  }

  // ─── 4. Medical Screening ──────────────────────────────────────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT TOP 1 * FROM dbo.medical_screening WHERE clientID = @clientID');
    drawSubHeader(doc, 'Medical Screening');
    const sc = r.recordset[0];
    if (sc) {
      // TB Symptom Checklist
      doc.font('Helvetica-Bold').fontSize(9).text('TB Symptom Checklist:').moveDown(0.2);
      const tbSymptoms = [
        ['Persistent Cough',        sc.tbCough],
        ['Coughing Blood',          sc.tbCoughBlood],
        ['Night Sweats',            sc.medSweat],
        ['Fever',                   sc.clientFever],
        ['Unexplained Weight Loss', sc.clientWeightLoss],
      ];
      tbSymptoms.forEach(([label, val]) => {
        const answer = String(val || '').toLowerCase() === 'yes' ? '✓ Yes' : '✗ No';
        doc.font('Helvetica').fontSize(9).text(`  ${answer}  ${label}`, { indent: 10 });
      });
      doc.moveDown(0.5);

      // General medical history fields
      drawField(doc, 'Hepatitis A/B Status', sc.clientHepAB);
      drawField(doc, 'Risk Factors', sc.clientRiskFactors);
      drawField(doc, 'Current Medications', sc.clientMedications);
      drawField(doc, 'Surgical History', sc.clientSurgeries);

      // Birth control sub-group
      if (sc.clientBC) {
        doc.font('Helvetica-Bold').fontSize(9).text('Birth Control:').moveDown(0.2);
        drawTwoColumn(doc, [
          ['Method', sc.clientBCName],
          ['Start Date', formatDate(sc.clientBCDate)],
          ['Location/Provider', sc.clientBCLoc],
        ]);
      }

      // Sexual health — clearly labelled PHI sub-section
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#7B1FA2').text('Sexual Health (PHI)').moveDown(0.2);
      doc.fillColor('#000000');
      drawTwoColumn(doc, [
        ['Partners – Last Year',  sc.clientSexLastYear],
        ['Partners – Last Month', sc.clientSexLastMonth],
        ['Last Sexual Activity',  formatDate(sc.clientLastSexDate)],
        ['Relationship Type',     sc.clientSexRelations],
        ['STD Status',            sc.clientSTDStatus],
      ]);
    } else {
      noData(doc);
    }
  } catch (e) {
    noData(doc, `Medical screening unavailable: ${e.message}`);
  }

  // ─── 5. Nursing Admission Assessment ──────────────────────────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT TOP 1 * FROM dbo.nursing_admission WHERE clientID = @clientID ORDER BY createdAt DESC');
    const na = r.recordset[0];
    drawSubHeader(doc, 'Nursing Admission Assessment');
    if (na) {
      // Admission vitals at time of admission
      drawTwoColumn(doc, [
        ['Admission Date',   formatDate(na.admissionDate || na.createdAt)],
        ['Nurse / Staff',    na.nurseName || na.staffName],
        ['Temp (°F)',        na.cpT],
        ['Pulse (bpm)',      na.cpP],
        ['Resp (br/min)',    na.cpR],
        ['Blood Pressure',  na.cpBP],
      ]);

      // Functional / assessment fields — render label+value; don't parse list content
      const assessmentFields = [
        ['Level of Consciousness',   na.loc],
        ['Oriented To',              na.orientedToList],
        ['Oriented To Room',         na.orientedToRoomList],
        ['Temp (List)',              na.tList],
        ['Pulse (List)',             na.pList],
        ['Resp (List)',              na.rList],
        ['History Of',               na.historyOf],
        ['Edema',                    na.edema],
        ['Lung Sounds',              na.lungSounds],
        ['Bowel / Bladder',          na.bowelBladder],
        ['Elimination Methods Used', na.elimMethUsed],
        ['Physical Function Status', na.physicalFuncStat],
        ['Weight Bearing',           na.weightBearing],
        ['Transfers',                na.transfers],
        ['Ambulation',               na.ambulation],
        ['Mobility Devices',         na.mobDevices],
        ['Nutrition / Hydration',    na.nutrHyd],
        ['Hearing',                  na.hearing],
        ['Vision',                   na.vision],
        ['Communication',            na.communication],
        ['Bathing',                  na.bathing],
        ['Eating',                   na.eating],
        ['Toileting',                na.toileting],
        ['Bed Mobility',             na.bedMobility],
        ['Front Body Inspection',    na.frontBodyInspection],
        ['Rear Body Inspection',     na.rearBodyInspection],
      ];
      assessmentFields.forEach(([label, val]) => {
        if (val !== null && val !== undefined && val !== '') {
          drawField(doc, label, val);
        }
      });
    } else {
      noData(doc);
    }
  } catch (e) {
    noData(doc, `Nursing admission unavailable: ${e.message}`);
  }

  // ─── 6. Vital Signs Log (most recent 20) ──────────────────────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`SELECT TOP 20 * FROM dbo.vital_signs WHERE clientID = @clientID ORDER BY recordDate DESC`);
    drawSubHeader(doc, 'Vital Signs Log (Most Recent 20)');
    if (r.recordset.length > 0) {
      r.recordset.forEach((vs, i) => {
        const bp = (vs.bloodPressureSystolic && vs.bloodPressureDiastolic)
          ? `${vs.bloodPressureSystolic} / ${vs.bloodPressureDiastolic}`
          : 'N/A';
        doc.font('Helvetica-Bold').fontSize(9)
          .text(`Record ${i + 1} — ${formatDate(vs.recordDate)}  ${formatTime(vs.recordTime)}`);
        drawTwoColumn(doc, [
          ['Blood Pressure',     bp],
          ['Pulse (bpm)',        vs.pulse],
          ['Temp (°F)',          vs.temperature],
          ['Resp (br/min)',      vs.respiratoryRate],
          ['O2 Saturation (%)', vs.oxygenSaturation],
          ['Weight (lbs)',       vs.weight],
          ['Blood Glucose',      vs.bloodGlucose],
          ['Pain Level',         vs.painLevel],
          ['Recorded By',        vs.recordedBy],
          ['Notes',              vs.notes],
        ]);
      });
    } else {
      noData(doc);
    }
  } catch (e) {
    noData(doc, `Vital signs log unavailable: ${e.message}`);
  }

  // ─── 7. Medication Administration Record (most recent 30) ─────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`SELECT TOP 30 * FROM dbo.medication_administration_record
              WHERE clientID = @clientID ORDER BY administeredDate DESC`);
    drawSubHeader(doc, 'Medication Administration Record (Most Recent 30)');
    if (r.recordset.length > 0) {
      r.recordset.forEach((mar, i) => {
        doc.font('Helvetica-Bold').fontSize(9)
          .text(`MAR #${i + 1} — ${formatDate(mar.administeredDate)}  (Scheduled: ${formatTime(mar.scheduledTime)})`);
        drawTwoColumn(doc, [
          ['Medication',    mar.medicationName],
          ['Dosage',        mar.dosage],
          ['Route',         mar.route],
          ['Frequency',     mar.frequency],
          ['Status',        mar.status],
          ['Hold Reason',   mar.holdReason],
          ['Administered By', mar.administeredBy],
          ['Notes',         mar.notes],
        ]);
      });
    } else {
      noData(doc);
    }
  } catch (e) {
    noData(doc, `Medication administration record unavailable: ${e.message}`);
  }

  // ─── 8. Medical Appointments ──────────────────────────────────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`SELECT * FROM dbo.medical_appointments
              WHERE clientID = @clientID ORDER BY medApptDate DESC`);
    drawSubHeader(doc, 'Medical Appointments');
    if (r.recordset.length > 0) {
      r.recordset.forEach((appt, i) => {
        doc.font('Helvetica-Bold').fontSize(9)
          .text(`Appointment ${i + 1} — ${formatDate(appt.medApptDate)}`);
        drawTwoColumn(doc, [
          ['Provider / Clinic', appt.medApptProvider || appt.provider],
          ['Type',              appt.medApptType || appt.appointmentType],
          ['Time',              appt.medApptTime || formatTime(appt.apptTime)],
          ['Transport Arranged', String(appt.medApptTranport || '').toLowerCase() === 'yes' ? 'Yes' : 'No'],
          ['Status',            appt.status],
          ['Outcome / Notes',   appt.medApptNotes || appt.notes],
        ]);
      });
    } else {
      noData(doc);
    }
  } catch (e) {
    noData(doc, `Medical appointments unavailable: ${e.message}`);
  }

  // ─── 9. Nursing Archive Index (no file content) ────────────────────────────
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`SELECT documentName, categoryName, documentDate, confidentialityLevel,
                     uploadedBy, uploadedAt
              FROM dbo.nursing_archive
              WHERE clientID = @clientID AND (isDeleted IS NULL OR isDeleted = 0)
              ORDER BY uploadedAt DESC`);
    drawSubHeader(doc, 'Nursing Archive Index');
    if (r.recordset.length > 0) {
      r.recordset.forEach((doc2, i) => {
        drawTwoColumn(doc, [
          ['Document Name',        doc2.documentName],
          ['Category',             doc2.categoryName],
          ['Document Date',        formatDate(doc2.documentDate)],
          ['Confidentiality',      doc2.confidentialityLevel],
          ['Uploaded By',          doc2.uploadedBy],
          ['Uploaded At',          formatDate(doc2.uploadedAt)],
        ]);
      });
    } else {
      noData(doc, 'No archived nursing documents found.');
    }
  } catch (e) {
    noData(doc, `Nursing archive unavailable: ${e.message}`);
  }
}

async function renderSection6(doc, pool, clientID) {
  drawSectionHeader(doc, 'Section 6 – Case Management', '#C62828');

  // IDT Case Manager
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT TOP 1 * FROM dbo.IDTCaseManager WHERE clientID = @clientID ORDER BY createdAt DESC');
    const cm = r.recordset[0];
    drawSubHeader(doc, 'IDT Case Manager Assessment');
    if (cm) {
      drawTwoColumn(doc, [
        ['Case Manager', cm.idtHfhCM],
        ['Assessment Date', formatDate(cm.lastAssessmentDate)],
        ['Risk Level', cm.riskLevel],
        ['Readiness Level', cm.readinessLevel],
        ['Support Strength', cm.supportStrength],
        ['Assessment Score', cm.assessmentScore],
        ['Goals Completed', cm.goalsCompleted],
        ['Goals In Progress', cm.goalsInProgress],
        ['Goals Pending', cm.goalsPending],
        ['Next Follow-Up', formatDate(cm.nextFollowUpDate)],
        ['Documentation Complete', formatBool(cm.documentationComplete)],
        ['Member Situation', cm.idtMemberSituation],
        ['Support System', cm.idtMemberSupport],
        ['Income Source', cm.idtIncomeSource],
        ['Resources', cm.idtResources],
        ['Recommendations', cm.idtRecommend],
      ]);
      if (cm.idtGoals) {
        drawField(doc, 'Goals', cm.idtGoals);
      }
    } else {
      noData(doc);
    }
  } catch (e) {
    noData(doc, `Case management data not available: ${e.message}`);
  }

  // IDT Notes
  try {
    const r = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT TOP 10 * FROM dbo.IDTNotes WHERE clientID = @clientID ORDER BY noteDate DESC');
    if (r.recordset.length > 0) {
      drawSubHeader(doc, 'IDT Notes (Most Recent 10)');
      r.recordset.forEach((note, i) => {
        doc.font('Helvetica-Bold').fontSize(9).text(`IDT Note #${i + 1} – ${formatDate(note.noteDate)}`);
        drawTwoColumn(doc, [
          ['Staff', note.staffName || note.caseManager],
          ['Type', note.noteType],
          ['Status', note.status],
        ]);
        if (note.noteText || note.notes) {
          doc.font('Helvetica').fontSize(8).text(safeStr(note.noteText || note.notes), { indent: 10 }).moveDown(0.5);
        }
      });
    }
  } catch {}
}

// ─── Main Export Route ──────────────────────────────────────────────────────

router.get('/client/:clientID/pdf', authenticateToken, async (req, res) => {
  const { clientID } = req.params;
  const exportedBy = req.user?.username || req.user?.email || 'Unknown';

  if (!clientID) {
    return res.status(400).json({ error: 'clientID is required' });
  }

  let pool;
  try {
    pool = await getPool();
  } catch (err) {
    console.error('DB connection failed:', err);
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    // Fetch base client info
    const clientResult = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT TOP 1 * FROM dbo.Clients WHERE clientID = @clientID');

    if (!clientResult.recordset.length) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = clientResult.recordset[0];

    // Audit log
    try {
      await pool.request()
        .input('userID',     sql.NVarChar,  exportedBy)
        .input('action',     sql.NVarChar,  'EXPORT_FULL_PDF')
        .input('tableName',  sql.NVarChar,  'Clients')
        .input('recordID',   sql.NVarChar,  clientID)
        .input('newValues',  sql.NVarChar,  JSON.stringify({ sections: 'all', exportType: 'PDF' }))
        .input('timestamp',  sql.DateTime2, new Date())
        .query(`INSERT INTO dbo.AuditLog (userID, action, tableName, recordID, newValues, timestamp)
                VALUES (@userID, @action, @tableName, @recordID, @newValues, @timestamp)`);
    } catch (auditErr) {
      console.warn('Audit log failed (non-fatal):', auditErr.message);
    }

    // Build PDF
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      info: {
        Title: `${client.clientLastName}, ${client.clientFirstName} – Complete Client Record`,
        Author: exportedBy,
        Subject: 'HOPE Client Database Export',
        Keywords: 'HIPAA, PHI, Client Record',
        CreationDate: new Date(),
      },
    });

    const filename = `${safeStr(client.clientLastName)}_${safeStr(client.clientFirstName)}_Complete_Record_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Cover + TOC
    drawCoverPage(doc, client, exportedBy);

    // All 6 sections
    await renderSection1(doc, pool, clientID);
    await renderSection2(doc, pool, clientID);
    await renderSection3(doc, pool, clientID);
    await renderSection4(doc, pool, clientID);
    await renderSection5(doc, pool, clientID);
    await renderSection6(doc, pool, clientID);

    // Final footer on last page
    doc
      .fillColor('#888888')
      .fontSize(7)
      .text(
        `End of record for ${client.clientLastName}, ${client.clientFirstName} (ID: ${clientID}) — Generated ${new Date().toLocaleString()} by ${exportedBy}`,
        { align: 'center' }
      );

    doc.end();

  } catch (err) {
    console.error('PDF export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: `Export failed: ${err.message}` });
    }
  }
});

module.exports = router; 