#!/usr/bin/env bash
# Adds one clearly fake test client to the SRC database, with the same columns
# the app's New Client form fills in (routes/clients.js POST /). Safe to run
# more than once: an existing client with that ID is left as it is.
#
# Run in Azure Cloud Shell (Bash), signed in to SRC's directory:
#   bash create-src-test-client.sh
# Optional: CLIENT_ID, FIRST, LAST, SITE (must be an SRC site), e.g.
#   SITE="Long Beach 4th" bash create-src-test-client.sh
set -euo pipefail

SRC_TENANT=d9d9d842-715a-4e28-93ef-635d3443575d
SRC_RG=rg-src-care-prod
SRC_DB=src-care
CLIENT_ID="${CLIENT_ID:-123456789}"
FIRST="${FIRST:-Test}"
LAST="${LAST:-Client}"
SITE="${SITE:-Lakeview Terrace}"
DOB="${DOB:-1980-01-01}"
RULE="cloudshell-test-client"
WORK="$HOME/schema-copy"
say() { echo "▶ $*" >&2; }

case "$SITE" in
  "Lakeview Terrace"|"Long Beach 4th"|"Torrance-Cabrillo") ;;
  *) echo "SITE must be Lakeview Terrace, Long Beach 4th or Torrance-Cabrillo" >&2; exit 1;;
esac
[[ "$CLIENT_ID" =~ ^[A-Za-z0-9-]+$ ]] || { echo "CLIENT_ID may use letters, digits and '-' only" >&2; exit 1; }
for v in "$FIRST" "$LAST"; do [[ "$v" =~ ^[A-Za-z\ .-]+$ ]] || { echo "Names may use letters, spaces, '.' and '-' only" >&2; exit 1; }; done

if [ "$(az account show --query tenantId -o tsv 2>/dev/null)" != "$SRC_TENANT" ]; then
  say "Sign in to SRC's directory (Serenity Recuperative Care)"
  az login --tenant "$SRC_TENANT" --use-device-code -o none
fi

SQLCMD=$(command -v sqlcmd || true)
[ -n "$SQLCMD" ] || { [ -x "$WORK/sqlcmd/sqlcmd" ] && SQLCMD="$WORK/sqlcmd/sqlcmd"; } || true
if [ -z "$SQLCMD" ]; then
  say "Downloading sqlcmd"
  mkdir -p "$WORK/sqlcmd"
  curl -fsSL https://github.com/microsoft/go-sqlcmd/releases/latest/download/sqlcmd-linux-amd64.tar.bz2 | tar -xj -C "$WORK/sqlcmd"
  SQLCMD="$WORK/sqlcmd/sqlcmd"
fi

SRC_SERVER=$(az sql server list -g "$SRC_RG" --query "[?starts_with(name,'src-care-sql-')].name | [0]" -o tsv)
app=$(az webapp list -g "$SRC_RG" --query "[?starts_with(name,'src-care-api-')].name | [0]" -o tsv)
SQL_USER=$(az webapp config appsettings list -g "$SRC_RG" -n "$app" --query "[?name=='AZURE_SQL_USER'].value | [0]" -o tsv)
export SQLCMDPASSWORD=$(az webapp config appsettings list -g "$SRC_RG" -n "$app" --query "[?name=='AZURE_SQL_PASSWORD'].value | [0]" -o tsv)
[ -n "$SRC_SERVER" ] && [ -n "$SQLCMDPASSWORD" ] || { echo "Could not find SRC's SQL server or login" >&2; exit 1; }

myip=$(curl -fsS https://api.ipify.org)
trap 'az sql server firewall-rule delete -g "$SRC_RG" -s "$SRC_SERVER" -n "$RULE" -o none 2>/dev/null && say "Removed the temporary firewall rule"' EXIT
say "Allowing Cloud Shell through SRC's SQL firewall (temporary)"
az sql server firewall-rule create -g "$SRC_RG" -s "$SRC_SERVER" -n "$RULE" \
  --start-ip-address "$myip" --end-ip-address "$myip" -o none
sleep 20

say "Adding test client $CLIENT_ID ($FIRST $LAST, $SITE)"
"$SQLCMD" -S "$SRC_SERVER.database.windows.net" -d "$SRC_DB" -U "$SQL_USER" -N -b -h -1 -W -Q "
SET NOCOUNT ON;
IF EXISTS (SELECT 1 FROM dbo.Clients WHERE clientID = N'$CLIENT_ID')
  PRINT 'Client $CLIENT_ID already exists; left unchanged.';
ELSE
BEGIN
  INSERT INTO dbo.Clients (clientID, clientFirstName, clientLastName, clientSite,
                           clientDOB, clientAdmitDate, createdAt, updatedAt)
  VALUES (N'$CLIENT_ID', N'$FIRST', N'$LAST', N'$SITE',
          '$DOB', CAST(GETDATE() AS date), GETDATE(), GETDATE());
  PRINT 'Created client $CLIENT_ID.';
END
SELECT 'clientID=' + clientID + ' | ' + ISNULL(clientFirstName,'') + ' ' + ISNULL(clientLastName,'')
     + ' | site=' + ISNULL(clientSite,'') + ' | DOB=' + ISNULL(CONVERT(varchar(10), clientDOB, 23),'')
     + ' | admitted=' + ISNULL(CONVERT(varchar(10), clientAdmitDate, 23),'')
FROM dbo.Clients WHERE clientID = N'$CLIENT_ID';"
unset SQLCMDPASSWORD
