#!/usr/bin/env bash
# Creates the Azure resources for SRC production and wires them together:
#   resource group, SQL server + database, storage account + client-docs
#   container, App Service plan + backend web app, Static Web App (website).
# The backend gets a managed identity with access to the storage account, and
# its app settings (ORG=src, database, storage, website address) are filled in.
# The SQL password is generated here and stored only in the backend's settings.
# Finally the website address is added to the SRC app registration's sign-in
# addresses. Safe to run more than once: existing resources are reused.
#
# Run in Azure Cloud Shell (Bash), signed in to SRC's directory.
set -euo pipefail

ENV_NAME="${ENV_NAME:-prod}"                 # prod | staging
# Regions to try, in order, for the database, storage and backend. New
# subscriptions are sometimes refused in busy regions (RegionDoesNotAllowProvisioning).
REGIONS="${REGIONS:-westus3 westus centralus southcentralus eastus2}"
SWA_REGIONS="${SWA_REGIONS:-westus2 centralus eastus2}"   # Static Web Apps run in only a few regions
APP_NAME="SRC Care Database"                 # app registration (create-src-app-registration.sh)
RG="rg-src-care-$ENV_NAME"
SQL_SKU="${SQL_SKU:-S0}"                     # S0 ~ $15/month; scale up any time
PLAN_SKU="${PLAN_SKU:-B1}"                   # B1 ~ $13/month
SWA_SKU="${SWA_SKU:-Standard}"               # Standard ~ $9/month
SQL_ADMIN="srcadmin"
DB_NAME="src-care"
CONTAINER="client-docs"

say() { echo "▶ $*" >&2; }

sub=$(az account show --query id -o tsv)
sfx=$(echo -n "$sub-$ENV_NAME" | md5sum | cut -c1-6)   # same every run, unique per subscription
SQL_PREFIX="src-care-sql-$ENV_NAME-$sfx"     # + region, e.g. ...-westus3
STORAGE="srccare${ENV_NAME:0:4}$sfx"
PLAN="src-care-plan-$ENV_NAME"
WEBAPP="src-care-api-$ENV_NAME-$sfx"
SWA="src-care-web-$ENV_NAME"

say "Registering resource providers (first time only, can take a few minutes)"
for p in Microsoft.Sql Microsoft.Storage Microsoft.Web; do
  az provider register --namespace "$p" --wait >/dev/null
done

say "Resource group $RG"
az group show -n "$RG" -o none 2>/dev/null || az group create -n "$RG" -l "${REGIONS%% *}" -o none

# ---------- SQL ----------
new_password=""
SQL_SERVER=$(az sql server list -g "$RG" --query "[?starts_with(name, '$SQL_PREFIX')].name | [0]" -o tsv 2>/dev/null || true)
if [ -z "$SQL_SERVER" ]; then
  new_password="$(openssl rand -base64 24 | tr -d '/+=')Aa1!"
  LOCATION=""
  for r in $REGIONS; do
    SQL_SERVER="$SQL_PREFIX-$r"
    say "SQL server $SQL_SERVER: trying $r"
    if out=$(az sql server create -g "$RG" -n "$SQL_SERVER" -l "$r" \
          --admin-user "$SQL_ADMIN" --admin-password "$new_password" --minimal-tls-version 1.2 -o none 2>&1); then
      LOCATION="$r"; break
    fi
    if echo "$out" | grep -qiE "RegionDoesNotAllowProvisioning|not accepting|ProvisioningDisabled|quota|already exists in location"; then
      say "  $r is not taking new SQL servers, trying the next region"; continue
    fi
    echo "$out" >&2; exit 1
  done
  [ -n "$LOCATION" ] || { echo "No region in '$REGIONS' accepted a SQL server. Try: REGIONS=\"eastus northcentralus\" bash $0" >&2; exit 1; }
else
  LOCATION=$(az sql server show -g "$RG" -n "$SQL_SERVER" --query location -o tsv)
  say "SQL server $SQL_SERVER exists ($LOCATION)"
fi
say "Using region $LOCATION for the database, storage and backend"
me=$(az ad signed-in-user show --query id -o tsv)
me_upn=$(az ad signed-in-user show --query userPrincipalName -o tsv)
say "Making you ($me_upn) the SQL server's Entra admin (sign in with SSMS / Azure Data Studio)"
az sql server ad-admin create -g "$RG" -s "$SQL_SERVER" --display-name "$me_upn" --object-id "$me" -o none
az sql server firewall-rule create -g "$RG" -s "$SQL_SERVER" -n AllowAzureServices \
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 -o none
if ! az sql db show -g "$RG" -s "$SQL_SERVER" -n "$DB_NAME" -o none 2>/dev/null; then
  say "Database $DB_NAME ($SQL_SKU)"
  az sql db create -g "$RG" -s "$SQL_SERVER" -n "$DB_NAME" --service-objective "$SQL_SKU" -o none
else
  say "Database $DB_NAME exists"
fi

# ---------- Storage ----------
if ! az storage account show -g "$RG" -n "$STORAGE" -o none 2>/dev/null; then
  say "Storage account $STORAGE"
  az storage account create -g "$RG" -n "$STORAGE" -l "$LOCATION" --sku Standard_LRS --kind StorageV2 \
    --min-tls-version TLS1_2 --allow-blob-public-access false --https-only true -o none
else
  say "Storage account $STORAGE exists"
fi
az storage container-rm create -g "$RG" --storage-account "$STORAGE" -n "$CONTAINER" --public-access off -o none 2>/dev/null \
  || say "Container $CONTAINER exists"
storage_id=$(az storage account show -g "$RG" -n "$STORAGE" --query id -o tsv)

# ---------- Website (Static Web App) ----------
if ! az staticwebapp show -g "$RG" -n "$SWA" -o none 2>/dev/null; then
  made=""
  for r in $SWA_REGIONS; do
    say "Static Web App $SWA ($SWA_SKU): trying $r"
    if az staticwebapp create -g "$RG" -n "$SWA" -l "$r" --sku "$SWA_SKU" -o none; then made=1; break; fi
  done
  [ -n "$made" ] || { echo "Could not create the Static Web App in $SWA_REGIONS" >&2; exit 1; }
else
  say "Static Web App $SWA exists"
fi
site="https://$(az staticwebapp show -g "$RG" -n "$SWA" --query defaultHostname -o tsv)"

# ---------- Backend (App Service) ----------
if ! az appservice plan show -g "$RG" -n "$PLAN" -o none 2>/dev/null; then
  say "App Service plan $PLAN ($PLAN_SKU, Linux)"
  az appservice plan create -g "$RG" -n "$PLAN" -l "$LOCATION" --is-linux --sku "$PLAN_SKU" -o none
fi
if ! az webapp show -g "$RG" -n "$WEBAPP" -o none 2>/dev/null; then
  # Newest Node LTS Azure offers, preferring 22 (the version CI builds with)
  runtimes=$(az webapp list-runtimes --os-type linux -o tsv | tr '\t' '\n' | grep -iE '^node[:|]' || true)
  runtime=$(echo "$runtimes" | grep -iE '^node[:|]22' | head -1)
  [ -n "$runtime" ] || runtime=$(echo "$runtimes" | grep -i lts | sort -t: -k2 -V | tail -1)
  [ -n "$runtime" ] || { echo "No Node runtime offered: $runtimes" >&2; exit 1; }
  say "Backend web app $WEBAPP ($runtime)"
  az webapp create -g "$RG" -p "$PLAN" -n "$WEBAPP" --runtime "$runtime" -o none
else
  say "Backend web app $WEBAPP exists"
fi
az webapp update -g "$RG" -n "$WEBAPP" --https-only true -o none
az webapp config set -g "$RG" -n "$WEBAPP" --always-on true --startup-file "npm start" \
  --min-tls-version 1.2 --ftps-state Disabled -o none
principal=$(az webapp identity assign -g "$RG" -n "$WEBAPP" --query principalId -o tsv)
say "Giving the backend access to storage"
az role assignment create --assignee-object-id "$principal" --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" --scope "$storage_id" -o none 2>/dev/null || true
api="https://$(az webapp show -g "$RG" -n "$WEBAPP" --query defaultHostName -o tsv)"

say "Backend app settings"
settings=(
  ORG=src NODE_ENV=production
  AZURE_SQL_SERVER="$SQL_SERVER.database.windows.net" AZURE_SQL_DATABASE="$DB_NAME" AZURE_SQL_USER="$SQL_ADMIN"
  AZURE_STORAGE_ACCOUNT="$STORAGE" AZURE_BLOB_CONTAINER="$CONTAINER" ENABLE_LOCAL_FALLBACK=false
  FRONTEND_URL="$site" SCM_DO_BUILD_DURING_DEPLOYMENT=false
)
[ -n "$new_password" ] && settings+=(AZURE_SQL_PASSWORD="$new_password")
az webapp config appsettings set -g "$RG" -n "$WEBAPP" --settings "${settings[@]}" -o none
unset new_password

# ---------- Sign-in address ----------
appId=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
if [ -n "$appId" ]; then
  say "Adding $site to the '$APP_NAME' sign-in addresses"
  objId=$(az ad app show --id "$appId" --query id -o tsv)
  uris=$(az ad app show --id "$appId" --query "spa.redirectUris" -o tsv | grep -v "^$site$" || true)
  list=$(printf '"%s",' $uris "$site"); list="[${list%,}]"
  az rest --method PATCH --uri "https://graph.microsoft.com/v1.0/applications/$objId" \
    --headers "Content-Type=application/json" --body "{\"spa\":{\"redirectUris\":$list}}" -o none
else
  say "App registration '$APP_NAME' not found; add $site as a sign-in address by hand"
fi

echo >&2
echo "===== Send this back (no passwords in it) =====" >&2
cat <<OUT
environment:      $ENV_NAME
resource group:   $RG
region:           $LOCATION
website:          $site
backend app:      $WEBAPP
backend URL:      $api
sql server:       $SQL_SERVER.database.windows.net
database:         $DB_NAME
storage account:  $STORAGE
OUT
