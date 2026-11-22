#!/usr/bin/env bash
# Copies the database STRUCTURE (tables, views, stored procedures, indexes) from
# HOPE production into the empty SRC database. No rows are copied: the extract
# is schema-only (ExtractAllTableData=false). Nothing in HOPE's database changes.
#
# Part 1 runs signed in to HOPE's directory, part 2 signs you in to SRC's.
# For each side, Cloud Shell's address is allowed through that SQL server's
# firewall only while the script runs; the rule is removed at the end.
# The SQL logins are read from each backend's app settings and never printed.
#
# Run in Azure Cloud Shell (Bash), already signed in to HOPE's directory:
#   bash copy-schema-hope-to-src.sh
set -euo pipefail

HOPE_TENANT=2fca3a49-cd1a-4717-bccc-5dbd1ea86b64
HOPE_SERVER=clientintakeserver
HOPE_DB=ClientIntakeDB
SRC_TENANT=d9d9d842-715a-4e28-93ef-635d3443575d
SRC_RG=rg-src-care-prod
SRC_DB=src-care
CARE_TEAM_SQL_URL="https://raw.githubusercontent.com/jrknowah/hcd-db/claude/nice-lamport-4q5eux/src/backend/store/dbScripts/ClientCareTeam.sql"

RULE="cloudshell-schema-copy"
WORK="$HOME/schema-copy"
mkdir -p "$WORK"
say() { echo "▶ $*" >&2; }

cleanup() {
  set +e
  if [ -n "${HOPE_RG:-}" ]; then
    az account set -s "$HOPE_SUB" >/dev/null 2>&1 && \
    az sql server firewall-rule delete -g "$HOPE_RG" -s "$HOPE_SERVER" -n "$RULE" -o none 2>/dev/null && say "Removed the temporary firewall rule on HOPE"
  fi
  if [ -n "${SRC_SERVER:-}" ]; then
    az sql server firewall-rule delete -g "$SRC_RG" -s "$SRC_SERVER" -n "$RULE" -o none 2>/dev/null && say "Removed the temporary firewall rule on SRC"
  fi
}
trap cleanup EXIT

setting() { # resource group, web app, name -> value
  az webapp config appsettings list -g "$1" -n "$2" --query "[?name=='$3'].value | [0]" -o tsv
}

# ---------- Tools ----------
SQLPACKAGE="$WORK/sqlpackage/sqlpackage"
if [ ! -x "$SQLPACKAGE" ]; then
  say "Downloading SqlPackage (Microsoft's database copy tool)"
  curl -fsSL -o "$WORK/sqlpackage.zip" https://aka.ms/sqlpackage-linux
  rm -rf "$WORK/sqlpackage" && mkdir -p "$WORK/sqlpackage"
  (cd "$WORK/sqlpackage" && unzip -q ../sqlpackage.zip) && chmod +x "$SQLPACKAGE"
fi
SQLCMD=$(command -v sqlcmd || true)
if [ -z "$SQLCMD" ]; then
  say "Downloading sqlcmd"
  mkdir -p "$WORK/sqlcmd"
  curl -fsSL https://github.com/microsoft/go-sqlcmd/releases/latest/download/sqlcmd-linux-amd64.tar.bz2 | tar -xj -C "$WORK/sqlcmd"
  SQLCMD="$WORK/sqlcmd/sqlcmd"
fi
myip=$(curl -fsS https://api.ipify.org)
say "Cloud Shell address: $myip"

# ---------- Part 1: HOPE (read only) ----------
[ "$(az account show --query tenantId -o tsv)" = "$HOPE_TENANT" ] \
  || { echo "Sign in to HOPE's directory first: az login --tenant $HOPE_TENANT --use-device-code" >&2; exit 1; }
HOPE_SUB=$(az account show --query id -o tsv)
HOPE_RG=$(az sql server list --query "[?name=='$HOPE_SERVER'].resourceGroup | [0]" -o tsv)
[ -n "$HOPE_RG" ] || { HOPE_RG=""; echo "SQL server $HOPE_SERVER not found in this subscription" >&2; exit 1; }
hope_app=$(az webapp list --query "[?starts_with(name,'hcd-db-backend')] | [0]" -o json)
hope_app_rg=$(echo "$hope_app" | python3 -c 'import json,sys;print(json.load(sys.stdin)["resourceGroup"])')
hope_app_name=$(echo "$hope_app" | python3 -c 'import json,sys;print(json.load(sys.stdin)["name"])')
HOPE_USER=$(setting "$hope_app_rg" "$hope_app_name" AZURE_SQL_USER)
HOPE_PASS=$(setting "$hope_app_rg" "$hope_app_name" AZURE_SQL_PASSWORD)
[ -n "$HOPE_USER" ] && [ -n "$HOPE_PASS" ] || { echo "Could not read HOPE's SQL login from $hope_app_name" >&2; exit 1; }

say "Allowing Cloud Shell through HOPE's SQL firewall (temporary)"
az sql server firewall-rule create -g "$HOPE_RG" -s "$HOPE_SERVER" -n "$RULE" \
  --start-ip-address "$myip" --end-ip-address "$myip" -o none
sleep 20   # firewall rules take a few seconds to apply

say "Reading HOPE's database structure (no data)"
"$SQLPACKAGE" /Action:Extract /TargetFile:"$WORK/hope-schema.dacpac" \
  /SourceServerName:"$HOPE_SERVER.database.windows.net" /SourceDatabaseName:"$HOPE_DB" \
  /SourceUser:"$HOPE_USER" /SourcePassword:"$HOPE_PASS" /SourceEncryptConnection:True \
  /p:ExtractAllTableData=false /p:IgnoreUserLoginMappings=true /p:IgnorePermissions=true \
  /p:VerifyExtraction=false /p:ExtractApplicationScopedObjectsOnly=true >"$WORK/extract.log" 2>&1 \
  || { tail -20 "$WORK/extract.log" >&2; exit 1; }
unset HOPE_PASS
tail -2 "$WORK/extract.log" >&2
az sql server firewall-rule delete -g "$HOPE_RG" -s "$HOPE_SERVER" -n "$RULE" -o none && HOPE_RG=""
say "Removed the temporary firewall rule on HOPE"

# ---------- Part 2: SRC ----------
say "Now sign in to SRC's directory (Serenity Recuperative Care)"
az login --tenant "$SRC_TENANT" --use-device-code -o none
SRC_SERVER=$(az sql server list -g "$SRC_RG" --query "[?starts_with(name,'src-care-sql-')].name | [0]" -o tsv)
src_app=$(az webapp list -g "$SRC_RG" --query "[?starts_with(name,'src-care-api-')].name | [0]" -o tsv)
SRC_USER=$(setting "$SRC_RG" "$src_app" AZURE_SQL_USER)
SRC_PASS=$(setting "$SRC_RG" "$src_app" AZURE_SQL_PASSWORD)
[ -n "$SRC_SERVER" ] && [ -n "$SRC_PASS" ] || { echo "Could not find SRC's SQL server or login in $SRC_RG" >&2; exit 1; }

say "Allowing Cloud Shell through SRC's SQL firewall (temporary)"
az sql server firewall-rule create -g "$SRC_RG" -s "$SRC_SERVER" -n "$RULE" \
  --start-ip-address "$myip" --end-ip-address "$myip" -o none
sleep 20

say "Creating the tables in the SRC database"
"$SQLPACKAGE" /Action:Publish /SourceFile:"$WORK/hope-schema.dacpac" \
  /TargetServerName:"$SRC_SERVER.database.windows.net" /TargetDatabaseName:"$SRC_DB" \
  /TargetUser:"$SRC_USER" /TargetPassword:"$SRC_PASS" /TargetEncryptConnection:True \
  /p:ScriptDatabaseOptions=false /p:AllowIncompatiblePlatform=true \
  /p:DropObjectsNotInSource=false /p:BlockOnPossibleDataLoss=true \
  /p:ExcludeObjectTypes="Users;Logins;RoleMembership;Permissions;ApplicationRoles;DatabaseRoles;Credentials;DatabaseScopedCredentials;ExternalDataSources;ExternalFileFormats;ExternalTables;DatabaseAuditSpecifications;ServerAuditSpecifications" \
  >"$WORK/publish.log" 2>&1 || { tail -30 "$WORK/publish.log" >&2; exit 1; }
tail -2 "$WORK/publish.log" >&2

say "Adding the care-team columns (ClientCareTeam.sql)"
curl -fsSL -o "$WORK/ClientCareTeam.sql" "$CARE_TEAM_SQL_URL"
SQLCMDPASSWORD="$SRC_PASS" "$SQLCMD" -S "$SRC_SERVER.database.windows.net" -d "$SRC_DB" -U "$SRC_USER" \
  -N -b -i "$WORK/ClientCareTeam.sql"

echo >&2
echo "===== Send this back =====" >&2
SQLCMDPASSWORD="$SRC_PASS" "$SQLCMD" -S "$SRC_SERVER.database.windows.net" -d "$SRC_DB" -U "$SRC_USER" -N -h -1 -W -Q "
SET NOCOUNT ON;
SELECT 'tables: ' + CAST(COUNT(*) AS varchar) FROM sys.tables;
SELECT 'views: ' + CAST(COUNT(*) AS varchar) FROM sys.views;
SELECT 'procedures: ' + CAST(COUNT(*) AS varchar) FROM sys.procedures;
SELECT 'rows in Clients: ' + CAST(COUNT(*) AS varchar) FROM dbo.Clients;
SELECT 'care team columns: ' + CAST(COUNT(*) AS varchar) FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.Clients') AND name LIKE 'client%StaffEmail';"
unset SRC_PASS
