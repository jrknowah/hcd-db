import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { buildCsv, buildXlsx, buildPdf, crc32 } = require('../routes/admin/analyticsExport.cjs');

const result = {
  key: 'average_length_of_stay',
  label: 'Length of Stay by Site',
  category: 'Census & Flow',
  description: 'Average and median days enrolled.',
  range: { startDate: '2025-10-01', endDate: '2026-09-30' },
  columns: ['site', 'clientCount', 'avgDays'],
  rows: [
    { site: 'Arroyo, East', clientCount: 40, avgDays: 101.25 },
    { site: 'Percy', clientCount: null, avgDays: null, __suppressed: true },
  ],
  suppressedCells: 2,
  minCellSize: 11,
};

// Read every entry out of a zip buffer (the format buildXlsx writes).
function unzip(buf) {
  const files = {};
  let p = 0;
  while (buf.readUInt32LE(p) === 0x04034b50) {
    const size = buf.readUInt32LE(p + 18);
    const nameLen = buf.readUInt16LE(p + 26);
    const name = buf.slice(p + 30, p + 30 + nameLen).toString();
    const data = zlib.inflateRawSync(buf.slice(p + 30 + nameLen, p + 30 + nameLen + size));
    expect(crc32(data)).toBe(buf.readUInt32LE(p + 14));
    files[name] = data.toString();
    p += 30 + nameLen + size;
  }
  return files;
}

describe('analytics exports', () => {
  it('CSV uses readable headers and writes suppressed cells as <11', () => {
    const csv = buildCsv(result);
    expect(csv.split('\r\n')).toEqual([
      '﻿Site,Client Count,Avg Days',
      '"Arroyo, East",40,101.25',
      'Percy,<11,<11',
    ]);
  });

  it('crc32 matches the standard check value', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });

  it('xlsx is a valid zip with one sheet per report and no raw suppressed values', () => {
    const second = { ...result, label: 'Admissions vs. Discharges by Site [all]', error: 'Invalid object name' };
    const files = unzip(buildXlsx([result, second]));

    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml'])
    );
    // Sheet names: ≤31 chars, no forbidden characters.
    const names = [...files['xl/workbook.xml'].matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
    expect(names[0]).toBe('Length of Stay by Site');
    names.forEach((n) => {
      expect(n.length).toBeLessThanOrEqual(31);
      expect(n).not.toMatch(/[[\]:*?/\\]/);
    });

    const sheet1 = files['xl/worksheets/sheet1.xml'];
    expect(sheet1).toContain('<v>40</v>');
    expect(sheet1).toContain('&lt;11');
    expect(sheet1).toContain('Arroyo, East');
    expect(files['xl/worksheets/sheet2.xml']).toContain('could not be run: Invalid object name');
  });

  it('pdf renders a document', async () => {
    const pdf = await buildPdf([result, { ...result, rows: [] }], { generatedBy: 'admin@example.org' });
    expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
