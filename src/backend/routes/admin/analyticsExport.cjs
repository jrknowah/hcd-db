// routes/admin/analyticsExport.cjs
// File builders for Admin > Reports & Analytics exports: CSV, Excel (.xlsx) and PDF.
//
// Every builder takes "report results" that have ALREADY been through small-cell
// suppression in analytics.cjs. Suppressed values arrive as null and are written
// as "<11" (or whatever minCellSize is) — never as the underlying number.
//
// The .xlsx writer is dependency-free: an xlsx file is a zip of a few XML parts,
// and Node's zlib handles the deflate. PDF uses pdfkit, already used by clientExport.js.

const zlib = require('zlib');
const PDFDocument = require('pdfkit');

// A result looks like:
// { key, label, category, description, range: { startDate, endDate },
//   columns: [...], rows: [...], suppressedCells, minCellSize, error? }

function displayValue(v, minCellSize) {
  if (v === null || v === undefined) return `<${minCellSize}`;
  return v;
}

function humanizeColumn(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function rangeText(r) {
  if (!r.range) return '';
  if (r.usesRange === false) return `As of ${r.range.endDate}`;
  return `${r.range.startDate} to ${r.range.endDate}`;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(result) {
  if (!result.columns.length) return '﻿';
  const lines = [
    result.columns.map(humanizeColumn).map(csvEscape).join(','),
    ...result.rows.map((r) =>
      result.columns.map((c) => csvEscape(displayValue(r[c], result.minCellSize))).join(',')
    ),
  ];
  return '﻿' + lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// Minimal zip writer (deflate) for the .xlsx container
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function zip(files) {
  const { time, date } = dosDateTime(new Date());
  const locals = [];
  const centrals = [];
  let offset = 0;

  files.forEach(({ name, data }) => {
    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const compressed = zlib.deflateRawSync(raw);
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0x0800, 6);       // flags: UTF-8 names
    local.writeUInt16LE(8, 8);            // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);         // version made by
    central.writeUInt16LE(20, 6);         // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  });

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuf, end]);
}

// ---------------------------------------------------------------------------
// Excel (.xlsx)
// ---------------------------------------------------------------------------

function xmlEscape(s) {
  return String(s)
    // Strip characters XML 1.0 can't carry at all.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colLetter(i) {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Style indexes into styles.xml cellXfs below.
const STYLE = { normal: 0, title: 1, header: 2, muted: 3, number: 4, decimal: 5 };

function cellXml(ref, value, style) {
  const s = style ? ` s="${style}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    const numStyle = style || (Number.isInteger(value) ? STYLE.number : STYLE.decimal);
    return `<c r="${ref}" s="${numStyle}"><v>${value}</v></c>`;
  }
  if (value === null || value === undefined || value === '') return '';
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function sheetXml(result) {
  const rows = [];
  let r = 1;
  const addRow = (cells, style) => {
    const xml = cells
      .map((v, i) => cellXml(`${colLetter(i)}${r}`, v, style))
      .join('');
    rows.push(`<row r="${r}">${xml}</row>`);
    r += 1;
  };

  addRow([result.label], STYLE.title);
  addRow([[result.category, rangeText(result)].filter(Boolean).join(' · ')], STYLE.muted);
  if (result.description) addRow([result.description], STYLE.muted);

  if (result.error) {
    r += 1;
    addRow([`This report could not be run: ${result.error}`]);
  } else {
    if (result.suppressedCells > 0) {
      addRow([
        `${result.suppressedCells} value(s) shown as <${result.minCellSize} are suppressed to prevent re-identification.`,
      ], STYLE.muted);
    }
    r += 1;
    addRow(result.columns.map(humanizeColumn), STYLE.header);
    if (!result.rows.length) {
      addRow(['No data for this range.'], STYLE.muted);
    }
    result.rows.forEach((row) => {
      addRow(result.columns.map((c) => displayValue(row[c], result.minCellSize)));
    });
  }

  const widths = result.columns.map((c) => {
    const longest = Math.max(
      humanizeColumn(c).length,
      ...result.rows.map((row) => String(displayValue(row[c], result.minCellSize)).length)
    );
    return Math.min(Math.max(longest + 2, 12), 60);
  });
  const cols = widths.length
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    cols +
    `<sheetData>${rows.join('')}</sheetData>` +
    '</worksheet>'
  );
}

function sheetName(label, used) {
  let base = String(label).replace(/[[\]:*?/\\]/g, ' ').trim() || 'Report';
  if (base.length > 31) {
    // Cut at a word boundary so tabs read "Admissions vs. Discharges…", not "…by Si".
    const cut = base.slice(0, 30);
    base = `${cut.slice(0, cut.lastIndexOf(' ') > 15 ? cut.lastIndexOf(' ') : 30).trim()}…`;
  }
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${n++})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.0"/></numFmts>' +
  '<fonts count="4">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="14"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
  '<font><i/><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1565C0"/><bgColor indexed="64"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="6">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/** One workbook, one sheet per report result. Returns a Buffer. */
function buildXlsx(results) {
  const used = new Set();
  const sheets = results.map((r, i) => ({
    id: i + 1,
    name: sheetName(r.label, used),
    xml: sheetXml(r),
  }));

  const files = [
    {
      name: '[Content_Types].xml',
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets
          .map(
            (s) =>
              `<Override PartName="/xl/worksheets/sheet${s.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
          )
          .join('') +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets>' +
        sheets.map((s) => `<sheet name="${xmlEscape(s.name)}" sheetId="${s.id}" r:id="rId${s.id}"/>`).join('') +
        '</sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets
          .map(
            (s) =>
              `<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`
          )
          .join('') +
        `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>',
    },
    { name: 'xl/styles.xml', data: STYLES_XML },
    ...sheets.map((s) => ({ name: `xl/worksheets/sheet${s.id}.xml`, data: s.xml })),
  ];

  return zip(files);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const BRAND = '#1565C0';

function formatCell(v, minCellSize) {
  const d = displayValue(v, minCellSize);
  if (typeof d === 'number') {
    return Number.isInteger(d) ? d.toLocaleString('en-US') : d.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }
  return String(d);
}

function drawTable(doc, result) {
  const ml = doc.page.margins.left;
  const width = doc.page.width - ml - doc.page.margins.right;
  const cols = result.columns;
  // First column (the label) gets more room; numbers share the rest.
  const firstW = cols.length > 1 ? Math.max(width * 0.4, width / cols.length) : width;
  const otherW = cols.length > 1 ? (width - firstW) / (cols.length - 1) : 0;
  const colW = cols.map((_, i) => (i === 0 ? firstW : otherW));
  const pad = 5;
  const bottom = () => doc.page.height - doc.page.margins.bottom;

  const rowHeight = (cells, font) => {
    doc.font(font).fontSize(8.5);
    return Math.max(
      ...cells.map((t, i) => doc.heightOfString(t, { width: colW[i] - pad * 2 }))
    ) + pad * 2;
  };

  const drawRow = (cells, { header = false, shade = false } = {}) => {
    const font = header ? 'Helvetica-Bold' : 'Helvetica';
    const h = rowHeight(cells, font);
    if (doc.y + h > bottom()) {
      doc.addPage();
      if (!header) drawRow(cols.map(humanizeColumn), { header: true });
    }
    const y = doc.y;
    if (header) doc.rect(ml, y, width, h).fill(BRAND);
    else if (shade) doc.rect(ml, y, width, h).fill('#F5F7FA');

    let x = ml;
    cells.forEach((t, i) => {
      const numeric = i > 0;
      doc
        .fillColor(header ? '#FFFFFF' : '#000000')
        .font(font)
        .fontSize(8.5)
        .text(t, x + pad, y + pad, { width: colW[i] - pad * 2, align: numeric ? 'right' : 'left' });
      x += colW[i];
    });
    doc.x = ml;
    doc.y = y + h;
  };

  drawRow(cols.map(humanizeColumn), { header: true });
  result.rows.forEach((row, i) => {
    drawRow(cols.map((c) => formatCell(row[c], result.minCellSize)), { shade: i % 2 === 1 });
  });
  doc.fillColor('#000000');
}

function drawReport(doc, result) {
  const ml = doc.page.margins.left;
  doc.x = ml;
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(14).text(result.label);
  doc
    .fillColor('#555555')
    .font('Helvetica')
    .fontSize(9)
    .text([result.category, rangeText(result)].filter(Boolean).join('  ·  '));
  if (result.description) doc.text(result.description);
  doc.moveDown(0.6);

  if (result.error) {
    doc.fillColor('#B00020').fontSize(9).text(`This report could not be run: ${result.error}`);
    doc.fillColor('#000000');
    return;
  }

  if (result.suppressedCells > 0) {
    doc
      .fillColor('#555555')
      .fontSize(8)
      .text(
        `${result.suppressedCells} value(s) shown as <${result.minCellSize} are suppressed to prevent re-identification.`
      )
      .moveDown(0.4);
  }

  if (!result.rows.length) {
    doc.fillColor('#555555').fontSize(9).text('No data for this range.');
    doc.fillColor('#000000');
    return;
  }

  drawTable(doc, result);
}

function drawContents(doc, results, title) {
  const ml = doc.page.margins.left;
  const w = doc.page.width - ml - doc.page.margins.right;
  const ranged = results.find((r) => r.usesRange !== false && r.range);

  doc.rect(0, 0, doc.page.width, 90).fill(BRAND);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(title, ml, 32, { width: w });
  doc.y = 115;
  doc.x = ml;
  doc.fillColor('#000000').font('Helvetica').fontSize(10);
  if (ranged) doc.text(`Reporting period: ${rangeText(ranged)}`);
  doc
    .fillColor('#555555')
    .fontSize(9)
    .text(
      `Aggregate figures only. Counts below ${results[0].minCellSize} are shown as "<${results[0].minCellSize}" ` +
        'to prevent re-identification. Reports marked "as of today" ignore the reporting period.'
    )
    .moveDown(1.2);

  const slots = [];
  let category = null;
  results.forEach((r) => {
    if (r.category !== category) {
      category = r.category;
      doc.moveDown(0.4).fillColor(BRAND).font('Helvetica-Bold').fontSize(11).text(category, ml).moveDown(0.2);
    }
    const note = r.error ? '  (could not be run)' : r.usesRange === false ? '  (as of today)' : '';
    const y = doc.y;
    doc
      .fillColor('#000000')
      .font('Helvetica')
      .fontSize(9.5)
      .text(`${r.label}${note}`, ml + 12, y, { width: w - 60 });
    // Page numbers aren't known until the reports are laid out; filled in later.
    slots.push({ page: doc.bufferedPageRange().count - 1, y });
  });
  return slots;
}

/**
 * PDF with one report per page (long reports flow onto further pages).
 * Resolves to a Buffer.
 */
function buildPdf(results, { title = 'Reports & Analytics', generatedBy } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 45, right: 45 },
      bufferPages: true,
      info: { Title: title },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const slots = results.length > 1 ? drawContents(doc, results, title) : null;
    const startPages = [];
    results.forEach((r, i) => {
      if (i > 0 || slots) doc.addPage();
      startPages.push(doc.bufferedPageRange().count);
      drawReport(doc, r);
    });

    if (slots) {
      slots.forEach((slot, i) => {
        doc.switchToPage(slot.page);
        doc
          .fillColor('#000000')
          .font('Helvetica')
          .fontSize(9.5)
          .text(`p. ${startPages[i]}`, doc.page.margins.left, slot.y, {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
            align: 'right',
            lineBreak: false,
          });
      });
    }

    // Footer on every page: confidentiality line + page numbers.
    const stamp = new Date().toISOString().slice(0, 10);
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const y = doc.page.height - 35;
      const ml = doc.page.margins.left;
      const w = doc.page.width - ml - doc.page.margins.right;
      // Writing inside the bottom margin; lift it so pdfkit doesn't add a page.
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .fillColor('#888888')
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          `Aggregate data only · Generated ${stamp}${generatedBy ? ` by ${generatedBy}` : ''}`,
          ml, y, { width: w, align: 'left', lineBreak: false }
        )
        .text(`Page ${i - range.start + 1} of ${range.count}`, ml, y, {
          width: w,
          align: 'right',
          lineBreak: false,
        });
      doc.page.margins.bottom = savedBottom;
    }

    doc.end();
  });
}

module.exports = { buildCsv, buildXlsx, buildPdf, humanizeColumn, crc32 };
