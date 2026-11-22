#!/usr/bin/env bash
# Sets up the `src-production` GitHub environment that
# .github/workflows/deploy-environments.yml deploys through:
#   - required reviewer (you) and deploys only from main or release/src
#   - secrets: the Static Web App deploy token and the backend publish profile,
#     read straight from Azure and handed to GitHub; never printed
#   - variables: ORG, backend name/URL, sign-in IDs, website address
# Safe to run more than once.
#
# Run in Azure Cloud Shell (Bash), signed in to SRC's directory. It signs you
# in to GitHub once (a code to enter at github.com/login/device).
set -euo pipefail

REPO="${REPO:-jrknowah/hcd-db}"
GH_ENV="${GH_ENV:-src-production}"
RG="${RG:-rg-src-care-prod}"
APP_NAME="SRC Care Database"
say() { echo "▶ $*" >&2; }

command -v gh >/dev/null || { echo "The GitHub CLI (gh) is not installed here. Tell Claude; the secrets can be added in the GitHub website instead." >&2; exit 1; }
if ! gh auth status -h github.com >/dev/null 2>&1; then
  say "Signing in to GitHub: copy the code shown, open https://github.com/login/device, paste it"
  gh auth login -h github.com -p https -w -s repo,workflow
fi
gh_user=$(gh api user --jq .login)
perm=$(gh api "repos/$REPO" --jq .permissions.admin)
[ "$perm" = "true" ] || { echo "GitHub user $gh_user is not an admin of $REPO, so it cannot create environments. Sign in as the repo owner: gh auth login" >&2; exit 1; }
say "GitHub: $gh_user, repo $REPO"

# ---------- Read Azure ----------
WEBAPP=$(az webapp list -g "$RG" --query "[?starts_with(name,'src-care-api-')].name | [0]" -o tsv)
SWA=$(az staticwebapp list -g "$RG" --query "[?starts_with(name,'src-care-web-')].name | [0]" -o tsv)
[ -n "$WEBAPP" ] && [ -n "$SWA" ] || { echo "Could not find the backend or website in $RG. Run create-src-resources.sh first." >&2; exit 1; }
backend_url="https://$(az webapp show -g "$RG" -n "$WEBAPP" --query defaultHostName -o tsv)"
site="https://$(az staticwebapp show -g "$RG" -n "$SWA" --query defaultHostname -o tsv)"
client_id=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
tenant_id=$(az account show --query tenantId -o tsv)
say "Backend $WEBAPP, website $SWA"

# The publish profile only works with basic publishing credentials on (new apps have them off)
say "Allowing publish-profile deploys on $WEBAPP"
for kind in scm ftp; do
  az resource update -g "$RG" --namespace Microsoft.Web --resource-type basicPublishingCredentialsPolicies \
    --parent "sites/$WEBAPP" -n "$kind" --set properties.allow=$([ "$kind" = scm ] && echo true || echo false) -o none
done

# ---------- GitHub environment ----------
uid=$(gh api user --jq .id)
say "Environment $GH_ENV: required reviewer $gh_user, branches main and release/src"
gh api -X PUT "repos/$REPO/environments/$GH_ENV" --input - >/dev/null <<JSON
{
  "reviewers": [ { "type": "User", "id": $uid } ],
  "prevent_self_review": false,
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
}
JSON
existing=$(gh api "repos/$REPO/environments/$GH_ENV/deployment-branch-policies" --jq '.branch_policies[].name' 2>/dev/null || true)
for b in main release/src; do
  echo "$existing" | grep -qx "$b" || gh api -X POST "repos/$REPO/environments/$GH_ENV/deployment-branch-policies" \
    -f name="$b" -f type=branch >/dev/null
done

say "Secrets (copied from Azure, not shown)"
az staticwebapp secrets list -g "$RG" -n "$SWA" --query properties.apiKey -o tsv \
  | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo "$REPO" --env "$GH_ENV"
az webapp deployment list-publishing-profiles -g "$RG" -n "$WEBAPP" --xml \
  | gh secret set AZURE_WEBAPP_PUBLISH_PROFILE --repo "$REPO" --env "$GH_ENV"

say "Variables"
setvar() { gh variable set "$1" --repo "$REPO" --env "$GH_ENV" --body "$2"; }
setvar ORG src
setvar BACKEND_APP_NAME "$WEBAPP"
setvar BACKEND_URL "$backend_url"
setvar VITE_AZURE_CLIENT_ID "$client_id"
setvar VITE_AZURE_TENANT_ID "$tenant_id"
setvar VITE_AZURE_REDIRECT_URI "$site"

echo >&2
echo "===== Send this back (no secrets in it) =====" >&2
echo "environment: $GH_ENV"
gh secret list --repo "$REPO" --env "$GH_ENV"
gh variable list --repo "$REPO" --env "$GH_ENV"
