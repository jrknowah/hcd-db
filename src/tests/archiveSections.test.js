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

  it('hides older files that belong to another section', () => {
    const files = [folder('Nursing Notes'), folder('Electronics')];
    expect(filterSectionFiles(files, ARCHIVE_SECTIONS.IDENTIFICATION)).toEqual([]);
  });

  it('shows older files that match no section in every archive instead of hiding them', () => {
    const files = [folder('Old Scan Folder'), { fileName: 'no-folder.pdf' }];
    for (const section of Object.values(ARCHIVE_SECTIONS)) {
      expect(filterSectionFiles(files, section).map(f => f.docType))
        .toEqual(['Old Scan Folder', 'Uncategorized']);
    }
  });

  it('reads the folder from blobName when docType is missing', () => {
    const files = [{ fileName: 'a.pdf', blobName: 'C1/S5__Nursing_Notes/a.pdf' }];
    expect(filterSectionFiles(files, ARCHIVE_SECTIONS.NURSING)[0].docType).toBe('Nursing Notes');
    expect(filterSectionFiles(files, ARCHIVE_SECTIONS.MISC_DOCS)).toEqual([]);
  });

  it('handles missing input', () => {
    expect(filterSectionFiles(null, ARCHIVE_SECTIONS.NURSING)).toEqual([]);
  });
});
