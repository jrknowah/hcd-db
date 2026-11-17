# Per-organization settings

Each deployment serves one organization. The file it uses is picked by name:

- frontend: `VITE_ORG` at build time (default `hope`)
- backend: `ORG` app setting on the App Service (default `hope`)

Both must name the same file. Group and site values are Entra group Object IDs
(Entra > Groups > <group> > Object Id). An empty value matches nobody.

| Key | Meaning |
| --- | --- |
| `tenantId`, `clientId` | Entra tenant and app registration. `AUTH_TENANT_ID` / `AUTH_CLIENT_ID` app settings on the backend override them (use them when staging has its own app registration). |
| `groups.HOPE_it` | IT admins: full access and the admin console |
| `groups.HOPE_level1` | Level 1: all sections, unlock locked records, audit trail |
| `groups.HOPE_case` | Case managers; also the "behavioral" care team pick list |
| `groups.HOPE_nursing` | Nurses; also the "medical" care team pick list |
| `groups.HOPE_audit` | Auditors: read everything, every site |
| `groups.HOPE_readonly` | Read-only: Sections 1 and 2 |
| `groups.HOPE_nursing_admin`, `groups.HOPE_behavioral_admin` | Admin documentation reports |
| `sites[]` | The site list on New Client, and which group sees each site's clients |

The group keys keep their `HOPE_` names because the code refers to them by
those names; for another organization they simply hold that organization's
group IDs.
