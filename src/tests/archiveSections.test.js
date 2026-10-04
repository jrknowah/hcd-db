import { describe, it, expect } from 'vitest';
import {
  ARCHIVE_SECTIONS,
  sectionDocType,
  sanitizeSegment,
  filterSectionFiles
} from '../utils/archiveSections';

// Blob folders come back sanitized, the way /api/upload stores them
const folder = (docType) => ({ fileName: 'f.pdf', docType: sanitizeSegment(docType) });

describe('archiveSections', () => {
  it('keeps only files uploaded with this section prefix, relabelled to the category', () => {
    const files = [
      folder(sectionDocType(ARCHIVE_SECTIONS.MISC_DOCS, 'Medical Records')),
      folder(sectionDocType(ARCHIVE_SECTIONS.MENTAL_HEALTH, 'Medical Records')),
      folder(sectionDocType(ARCHIVE_SECTIONS.PERSONAL_INVENTORY, 'Other'))
    ];
    const misc = filterSectionFiles(files, ARCHIVE_SECTIONS.MISC_DOCS, ['Medical Records', 'Other']);
    expect(misc).toHaveLength(1);
    expect(misc[0].docType).toBe('Medical Records');
  });

  it('matches legacy unprefixed folders by category name', () => {
    const files = [folder('Identification Card'), folder('Nursing Notes'), folder('Other')];
    const s1 = filterSectionFiles(files, ARCHIVE_SECTIONS.IDENTIFICATION, ['Identification Card', 'Other']);
    expect(s1.map(f => f.docType)).toEqual(['Identification Card', 'Other']);
  });

  it('handles missing input', () => {
    expect(filterSectionFiles(null, ARCHIVE_SECTIONS.NURSING, ['Nursing Notes'])).toEqual([]);
    expect(filterSectionFiles([{ fileName: 'x' }], ARCHIVE_SECTIONS.NURSING, ['Nursing Notes'])).toEqual([]);
  });
});
