# Deployment: staging and SRC production

The app is one codebase deployed once per environment. Each environment has its
own Azure resources, and an `ORG` setting picks which organization's groups and
sites it uses (`src/backend/config/orgs/<org>.json`, see the README there).

| Environment | GitHub environment | ORG | Deploys | Branch |
| --- | --- | --- | --- | --- |
| HOPE production (existing) | none (repo secrets) | `hope` (default) | automatically, frontend only | `main` |
| Staging | `staging` | `src` | automatically on push | `staging` |
| SRC production | `src-production` | `src` | manually, with approval | `main` |

The existing HOPE workflows are unchanged. Staging and SRC use
`.github/workflows/deploy-environments.yml`, which tests, deploys the backend,
builds and deploys the frontend, then checks `/api/health`.

## Release flow

1. Merge feature branches into `staging`. Each push deploys to staging.
2. Test on staging.
3. Merge `staging` into `main`.
   **Note:** a push to `main` also redeploys the HOPE production frontend
   (existing Static Web Apps workflow). The HOPE backend is not deployed by
   CI (`main.yml` points at files that are not at the repo root), so deploy it
   the way you do today, before the frontend goes out.
4. Actions > **Deploy environment** > Run workflow > branch `main`,
   environment `src-production`. A reviewer approves, then it deploys.

## One-time setup per environment (do this twice: staging, then SRC production)

### 1. Azure resources

Create in a resource group of their own (e.g. `rg-hcd-staging`, `rg-hcd-src-prod`):

- **Azure SQL Database**: separate server or at least a separate database.
- **Storage account** + blob container for client documents.
- **App Service** (Linux, Node 20) for the backend.
- **Static Web App** (Standard plan if you need custom domains/auth features).

Staging must never hold real client data. Use test clients only.

### 2. Database schema

The repo holds incremental scripts (`src/backend/store/dbScripts/`), not a
full schema. To create an empty database with the current schema:

1. On the HOPE production database, first run
   `src/backend/store/dbScripts/ClientCareTeam.sql` (needed by the client
   care-team assignment feature; safe to run more than once).
2. Extract schema only (no data) and publish it to the new database:

   ```sh
   SqlPackage /Action:Extract /SourceConnectionString:"<HOPE prod>" \
     /TargetFile:hcd-schema.dacpac /p:ExtractAllTableData=false
   SqlPackage /Action:Publish /SourceFile:hcd-schema.dacpac \
     /TargetConnectionString:"<new database>"
   ```

   Or, in SSMS: Tasks > Generate Scripts, "Types of data to script: Schema
   only", then run that script on the new database.
3. Seed any lookup/reference tables the app needs.

### 3. Entra ID (Azure AD)

In SRC's tenant:

- **App registration** (SPA). Redirect URIs: the staging and SRC production
  Static Web App URLs. Expose an API scope `access_as_user`. Add
  `groups` to the ID token (Token configuration > Add groups claim > Security
  groups). Grant Microsoft Graph `User.Read`, `GroupMember.Read.All` and `Directory.Read.All` (admin consent)
  (care-team pick lists).
  One registration can serve both staging and production; use `AUTH_CLIENT_ID`
  on the backend if staging gets its own.
- **Security groups** for each role (IT, Level 1, Case Manager, Nursing,
  Audit, Read-only, the two documentation-report admin groups) and one per
  site.
- Put the tenant ID, client ID and every group Object ID into
  `src/backend/config/orgs/src.json` and commit it. Empty IDs match nobody,
  so until they are filled in, SRC users get no roles.

### 4. Backend App Service settings

Configuration > Application settings:

| Setting | Value |
| --- | --- |
| `ORG` | `src` |
| `NODE_ENV` | `production` |
| `AZURE_SQL_SERVER`, `AZURE_SQL_DATABASE`, `AZURE_SQL_USER`, `AZURE_SQL_PASSWORD` | the environment's database |
| `AZURE_STORAGE_ACCOUNT` (managed identity) or `AZURE_STORAGE_CONNECTION_STRING` | the environment's storage |
| `AZURE_BLOB_CONTAINER` | container name |
| `SITE_ACCESS_STRICT` | `true` once every site group ID is filled in |
| `AUTH_TENANT_ID`, `AUTH_CLIENT_ID` | optional overrides of `src.json` |

Startup command: `npm start`. Allow the App Service's outbound IPs (or "Allow
Azure services") in the SQL server firewall. If you use managed identity for
storage, give the App Service's identity "Storage Blob Data Contributor".

### 5. GitHub environments

Settings > Environments > New environment: `staging` and `src-production`.
For `src-production`, add **Required reviewers** and limit deployment branches
to `main`.

Secrets in each:

| Secret | Where to get it |
| --- | --- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web App > Overview > Manage deployment token |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | App Service > Overview > Download publish profile (paste the file's contents) |

Variables in each:

| Variable | Example |
| --- | --- |
| `ORG` | `src` |
| `BACKEND_APP_NAME` | `hcd-src-backend-staging` |
| `BACKEND_URL` | `https://hcd-src-backend-staging.azurewebsites.net` (no trailing slash) |
| `VITE_AZURE_CLIENT_ID` | SRC app registration client ID |
| `VITE_AZURE_TENANT_ID` | SRC tenant ID |
| `VITE_AZURE_REDIRECT_URI` | the environment's Static Web App URL |

The workflow fails early, naming what is missing, if any of these is unset.

### 6. Create the `staging` branch

```sh
git checkout main && git pull
git checkout -b staging && git push -u origin staging
```

The first push deploys staging.
