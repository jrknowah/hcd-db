#!/usr/bin/env bash
# Creates the SRC security groups in Entra ID and prints the IDs that go into
# src/backend/config/orgs/src.json. Safe to run more than once: a group that
# already exists (same display name) is reused, not duplicated.
#
# Run it in Azure Cloud Shell (Bash), signed in to SRC's directory:
#   bash create-src-groups.sh
set -euo pipefail

# Role groups: "<key in src.json>|<display name>|<description>"
ROLE_GROUPS=(
  "HOPE_it|SRC_IT|SRC care database: IT admins (full access, admin console)"
  "HOPE_level1|SRC_Level1|SRC care database: Level 1 (all sections, unlock records, audit trail)"
  "HOPE_case|SRC_CaseManager|SRC care database: case managers (behavioral care team)"
  "HOPE_nursing|SRC_Nursing|SRC care database: nurses (medical care team)"
  "HOPE_audit|SRC_Audit|SRC care database: auditors (read all sites)"
  "HOPE_readonly|SRC_ReadOnly|SRC care database: read-only (Sections 1-2)"
  "HOPE_nursing_admin|SRC_NursingAdmin|SRC care database: Nursing documentation report"
  "HOPE_behavioral_admin|SRC_BehavioralAdmin|SRC care database: Behavioral Health documentation report"
)

# Site groups: "<site name exactly as in src.json>|<display name>"
SITE_GROUPS=(
  "Lakeview Terrace|SRC_Site_LakeviewTerrace"
  "Long Beach 4th|SRC_Site_LongBeach4th"
  "Torrance-Cabrillo|SRC_Site_TorranceCabrillo"
)

group_id() { # display name, description -> object id (creates if missing)
  local name="$1" desc="$2" id
  id=$(az ad group list --display-name "$name" --query "[0].id" -o tsv)
  if [ -z "$id" ]; then
    id=$(az ad group create --display-name "$name" --mail-nickname "$name" \
           --description "$desc" --query id -o tsv)
    echo "created  $name" >&2
  else
    echo "exists   $name" >&2
  fi
  echo "$id"
}

tenant=$(az account show --query tenantId -o tsv)
echo "Directory (tenant): $tenant" >&2
echo >&2

groups_json=""
for row in "${ROLE_GROUPS[@]}"; do
  IFS='|' read -r key name desc <<<"$row"
  id=$(group_id "$name" "$desc")
  groups_json+="    \"$key\": \"$id\",\n"
done

sites_json=""
for row in "${SITE_GROUPS[@]}"; do
  IFS='|' read -r site name <<<"$row"
  id=$(group_id "$name" "SRC care database: clients at $site")
  sites_json+="    { \"name\": \"$site\", \"groupId\": \"$id\" },\n"
done

echo >&2
echo "===== Copy everything below this line and send it back =====" >&2
printf '{\n  "name": "SRC",\n  "tenantId": "%s",\n  "clientId": "",\n  "groups": {\n%b  },\n  "sites": [\n%b  ]\n}\n' \
  "$tenant" "${groups_json%,\\n}\n" "${sites_json%,\\n}\n"
