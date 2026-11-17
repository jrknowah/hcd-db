// Frontend: the organization this build serves. '@org-config' is an alias for
// config/orgs/<VITE_ORG>.json set in vite.config.js (default 'hope'), so only
// that organization's file is bundled. The backend reads the same files through
// orgConfig.cjs. See orgs/README.md.
import org from '@org-config';

export const ORG = org;
