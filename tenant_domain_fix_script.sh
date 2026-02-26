#!/usr/bin/env bash
set -euo pipefail

DOMAIN="api.joetechx.co.uk"
API_URL="https://${DOMAIN}/api/health"

echo "[1/7] Pre-check: backend direct health (localhost)"
curl -sS -i http://127.0.0.1:4000/api/health | head -n 5 || true
echo

echo "[2/7] Pre-check: public API health (should currently show Tenant not found)"
curl -sS -i "${API_URL}" | head -n 20 || true
echo

echo "[3/7] Locate DATABASE_URL used by backend (tries common env files)"
DB_URL=""
for f in \
  /opt/prime-tech-platform/backend/.env.production \
  /opt/prime-tech-platform/backend/.env \
  /opt/prime-tech-backend/.env.production \
  /opt/prime-tech-backend/.env \
  /etc/prime-tech-backend.env \
  /etc/prime-tech-platform.env

do
  if [ -f "$f" ]; then
    if grep -q '^DATABASE_URL=' "$f"; then
      DB_URL="$(grep '^DATABASE_URL=' "$f" | tail -n 1 | sed 's/^DATABASE_URL=//')"
      echo "Found DATABASE_URL in $f"
      break
    fi
  fi
done

if [ -z "${DB_URL}" ]; then
  echo "ERROR: Could not find DATABASE_URL in known locations."
  echo "Action: paste the backend DATABASE_URL line here (without password if you prefer)."
  exit 1
fi

echo "[4/7] Connect to PostgreSQL and discover likely tenant table/columns"
# Use psql via the URL directly; mask password in echo
echo "Using DATABASE_URL (masked): $(echo "$DB_URL" | sed -E 's#(postgresql://[^:]+):[^@]+@#\1:***@#')"

# Find candidate tables with 'tenant' in the name
CANDIDATE_TABLES="$(psql "$DB_URL" -Atc \
  "select table_schema||'.'||table_name
   from information_schema.tables
   where table_type='BASE TABLE'
     and lower(table_name) like '%tenant%'
   order by table_schema, table_name;" || true)"

if [ -z "${CANDIDATE_TABLES}" ]; then
  echo "ERROR: No tables found containing 'tenant' in the name."
  echo "Action: tell me the tenant model/table name from your Prisma schema."
  exit 1
fi

echo "Candidate tenant tables:"
echo "$CANDIDATE_TABLES" | sed 's/^/  - /'
echo

echo "[5/7] Choose best tenant table (prefers public.tenant or public.tenants)"
TENANT_TABLE=""
if echo "$CANDIDATE_TABLES" | grep -qi '^public\.tenant$'; then
  TENANT_TABLE="public.tenant"
elif echo "$CANDIDATE_TABLES" | grep -qi '^public\.tenants$'; then
  TENANT_TABLE="public.tenants"
else
  # pick the first public.* match, else first overall
  TENANT_TABLE="$(echo "$CANDIDATE_TABLES" | awk 'BEGIN{IGNORECASE=1} $0 ~ /^public\./{print; exit} END{}')"
  if [ -z "$TENANT_TABLE" ]; then
    TENANT_TABLE="$(echo "$CANDIDATE_TABLES" | head -n 1)"
  fi
fi

echo "Selected tenant table: $TENANT_TABLE"
echo

echo "[6/7] Discover columns (domain/host fields) and upsert the tenant domain"
COLS="$(psql "$DB_URL" -Atc \
  "select column_name
   from information_schema.columns
   where table_schema=split_part('$TENANT_TABLE','.',1)
     and table_name=split_part('$TENANT_TABLE','.',2)
   order by ordinal_position;" )"

echo "Columns:"
echo "$COLS" | sed 's/^/  - /'
echo

# Prefer column names commonly used for tenancy routing
DOMAIN_COL=""
for c in domain host hostname fqdn; do
  if echo "$COLS" | awk '{print tolower($0)}' | grep -qx "$c"; then
    DOMAIN_COL="$c"
    break
  fi
done

if [ -z "$DOMAIN_COL" ]; then
  echo "ERROR: Could not find a domain column (domain/host/hostname/fqdn) on $TENANT_TABLE."
  echo "Action: tell me which column stores the tenant domain."
  exit 1
fi

# Find a primary key column (common: id, tenant_id)
PK_COL=""
for c in id tenant_id; do
  if echo "$COLS" | awk '{print tolower($0)}' | grep -qx "$c"; then
    PK_COL="$c"
    break
  fi
done

if [ -z "$PK_COL" ]; then
  # fallback: use first column as PK (not ideal, but avoids guessing)
  PK_COL="$(echo "$COLS" | head -n 1)"
fi

echo "Using domain column: $DOMAIN_COL"
echo "Using key column:    $PK_COL"
echo

# If tenant row already exists with that domain, nothing to do.
EXISTS="$(psql "$DB_URL" -Atc \
  "select 1 from $TENANT_TABLE where lower($DOMAIN_COL)=lower('$DOMAIN') limit 1;" || true)"

if [ "$EXISTS" = "1" ]; then
  echo "Tenant for $DOMAIN already exists in $TENANT_TABLE.$DOMAIN_COL"
else
  # If there is exactly one tenant row, set its domain to the API domain (common initial setup).
  CNT="$(psql "$DB_URL" -Atc "select count(*) from $TENANT_TABLE;" )"
  if [ "$CNT" = "1" ]; then
    echo "Exactly one tenant found; updating it to domain=$DOMAIN"
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c \
      "update $TENANT_TABLE set $DOMAIN_COL='${DOMAIN}' where ${PK_COL} = (select ${PK_COL} from $TENANT_TABLE limit 1);"
  else
    echo "Multiple tenants exist."
    echo "Creating a new tenant row is schema-specific; attempting safe insert using only the domain column..."
    # Try insert with only domain column; if schema requires more fields, it will fail and we will stop with a clear error.
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c \
      "insert into $TENANT_TABLE ($DOMAIN_COL) values ('${DOMAIN}');"
  fi
fi

echo
echo "[7/7] Restart backend and verify"
pm2 restart prime-tech-backend >/dev/null 2>&1 || pm2 restart prime-tech-platform-backend >/dev/null 2>&1 || true
sleep 1

echo "Public API check:"
curl -sS -i "${API_URL}" | head -n 20
echo
echo "Done."