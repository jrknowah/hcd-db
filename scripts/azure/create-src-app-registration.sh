#!/usr/bin/env bash
# Creates (or updates) the SRC app registration that staff sign in through,
# set up the way the app expects (src/backend/config/authConfig.js):
#   - single-page app sign-in, this directory only
#   - security groups in the ID token (roles and site access come from them)
#   - Microsoft Graph: User.Read, GroupMember.Read.All, Directory.Read.All,
#     with admin consent (care-team pick lists read group members)
#   - an API scope api://<client id>/access_as_user
# Prints the client ID. Safe to run more than once.
#
# Run in Azure Cloud Shell (Bash), signed in to SRC's directory as an admin.
# Add more sign-in addresses later with REDIRECT_URIS, e.g.
#   REDIRECT_URIS="https://<site>.azurestaticapps.net http://localhost:5173" bash create-src-app-registration.sh
set -euo pipefail

APP_NAME="SRC Care Database"
REDIRECT_URIS="${REDIRECT_URIS:-http://localhost:5173}"
GRAPH=00000003-0000-0000-c000-000000000000

appId=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
if [ -z "$appId" ]; then
  appId=$(az ad app create --display-name "$APP_NAME" --sign-in-audience AzureADMyOrg --query appId -o tsv)
  echo "created app registration: $APP_NAME" >&2
else
  echo "app registration exists: $APP_NAME" >&2
fi
objId=$(az ad app show --id "$appId" --query id -o tsv)

scopeId=$(az ad app show --id "$appId" --query "api.oauth2PermissionScopes[?value=='access_as_user'].id | [0]" -o tsv)
[ -n "$scopeId" ] || scopeId=$(cat /proc/sys/kernel/random/uuid)

uris=$(printf '"%s",' $REDIRECT_URIS); uris="[${uris%,}]"

cat > app-body.json <<JSON
{
  "identifierUris": ["api://$appId"],
  "spa": { "redirectUris": $uris },
  "groupMembershipClaims": "SecurityGroup",
  "optionalClaims": {
    "idToken": [ { "name": "groups", "essential": false, "additionalProperties": [] } ],
    "accessToken": [ { "name": "groups", "essential": false, "additionalProperties": [] } ]
  },
  "api": {
    "requestedAccessTokenVersion": 2,
    "oauth2PermissionScopes": [ {
      "id": "$scopeId",
      "value": "access_as_user",
      "type": "User",
      "isEnabled": true,
      "adminConsentDisplayName": "Use the SRC Care Database as the signed-in user",
      "adminConsentDescription": "Lets the SRC Care Database web app call its API as the signed-in user.",
      "userConsentDisplayName": "Use the SRC Care Database as you",
      "userConsentDescription": "Lets the SRC Care Database web app call its API as you."
    } ]
  },
  "requiredResourceAccess": [ {
    "resourceAppId": "$GRAPH",
    "resourceAccess": [
      { "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d", "type": "Scope" },
      { "id": "37f7f235-527c-4136-accd-4a02d197296e", "type": "Scope" },
      { "id": "14dad69e-099b-42c9-810b-d002981feec1", "type": "Scope" },
      { "id": "bc024368-1153-4739-b217-4326f2e966d0", "type": "Scope" },
      { "id": "06da0dbc-49e2-44d2-8312-53f166ab848a", "type": "Scope" }
    ]
  } ]
}
JSON
az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$objId" \
  --headers "Content-Type=application/json" --body @app-body.json >/dev/null
rm -f app-body.json
echo "configured sign-in, groups claim, API scope and Graph permissions" >&2

az ad sp show --id "$appId" >/dev/null 2>&1 || { az ad sp create --id "$appId" >/dev/null; echo "created service principal" >&2; }

# Admin consent can fail for a few seconds right after creation; retry.
for i in 1 2 3 4 5 6; do
  if az ad app permission admin-consent --id "$appId" >/dev/null 2>&1; then
    echo "admin consent granted" >&2; break
  fi
  [ "$i" = 6 ] && { echo "Admin consent did not go through. Grant it in the portal: App registrations > $APP_NAME > API permissions > Grant admin consent." >&2; break; }
  sleep 10
done

echo >&2
echo "===== Send this back =====" >&2
echo "clientId: $appId"
echo "redirect URIs: $REDIRECT_URIS"
