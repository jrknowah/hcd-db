// Picks the organization file the frontend is built with (VITE_ORG, default
// 'hope'). Only that one file is bundled, so one org's tenant and group IDs
// never ship to another org. Used by vite.config.js and the vitest configs.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ORGS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/backend/config/orgs');

export function orgConfigAlias(org = process.env.VITE_ORG) {
  const key = (org || 'hope').trim().toLowerCase();
  const file = path.join(ORGS_DIR, `${key}.json`);
  if (!/^[a-z0-9-]+$/.test(key) || !existsSync(file)) {
    throw new Error(`Unknown VITE_ORG "${key}": no src/backend/config/orgs/${key}.json`);
  }
  return { '@org-config': file };
}
