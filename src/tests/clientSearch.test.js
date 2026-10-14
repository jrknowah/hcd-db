// src/tests/clientSearch.test.js
import { describe, test, expect } from 'vitest';
import { matchesClientSearch } from '../utils/clientSearch';

const jane = { clientFirstName: 'Jane', clientLastName: 'Doe', clientID: 'C-1001', clientSite: 'Hope Gardens' };
const janeSmith = { clientFirstName: 'Jane', clientLastName: 'Smith', clientID: 'C-1002', clientSite: 'Hope Gardens' };

describe('matchesClientSearch', () => {
  test('matches a full name typed with a space', () => {
    expect(matchesClientSearch(jane, 'Jane Doe')).toBe(true);
    expect(matchesClientSearch(janeSmith, 'Jane Doe')).toBe(false);
  });

  test('matches last-name-first and comma forms, ignoring extra spaces', () => {
    expect(matchesClientSearch(jane, 'Doe Jane')).toBe(true);
    expect(matchesClientSearch(jane, 'Doe, Jane')).toBe(true);
    expect(matchesClientSearch(jane, '  jane   doe ')).toBe(true);
  });

  test('still matches single words against any field', () => {
    expect(matchesClientSearch(jane, 'jane')).toBe(true);
    expect(matchesClientSearch(jane, 'c-1001')).toBe(true);
    expect(matchesClientSearch(jane, 'gardens')).toBe(true);
    expect(matchesClientSearch(jane, 'zzz')).toBe(false);
  });

  test('empty query matches everything and missing fields do not throw', () => {
    expect(matchesClientSearch(jane, '')).toBe(true);
    expect(matchesClientSearch({ clientFirstName: 'Jane' }, 'jane doe')).toBe(false);
  });
});
