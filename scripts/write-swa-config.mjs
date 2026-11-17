// Copies staticwebapp.config.json into dist/, pointing the /api rewrite and the
// Content-Security-Policy at BACKEND_URL when it is set (staging, SRC).
// Unset, the file is copied unchanged (current production backend).
import { readFileSync, writeFileSync } from 'node:fs';

const DEFAULT_BACKEND = 'https://hcd-db-backend-fdfmekfgehbhf0db.westus2-01.azurewebsites.net';
const backend = (process.env.BACKEND_URL || '').trim().replace(/\/+$/, '');

let text = readFileSync('staticwebapp.config.json', 'utf8');
if (backend) {
  if (!/^https:\/\/[^/\s]+$/.test(backend)) {
    throw new Error(`BACKEND_URL must be https://<host> with no path, got "${backend}"`);
  }
  text = text.split(DEFAULT_BACKEND).join(backend);
  console.log(`staticwebapp.config.json: backend -> ${backend}`);
}
writeFileSync('dist/staticwebapp.config.json', text);
