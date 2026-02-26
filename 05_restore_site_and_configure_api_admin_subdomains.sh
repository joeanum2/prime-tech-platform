#!/usr/bin/env bash
set -euo pipefail

DOMAIN_MAIN="joetechx.co.uk"
DOMAIN_WWW="www.joetechx.co.uk"
DOMAIN_API="api.joetechx.co.uk"
DOMAIN_ADMIN="admin.joetechx.co.uk"

FRONTEND_UPSTREAM="http://127.0.0.1:3000"
BACKEND_UPSTREAM="http://127.0.0.1:4000"

TS="$(date -u +%Y%m%d_%H%M%S)"
SNAP_DIR="/opt/backups"
SNAP_PATH="${SNAP_DIR}/full_snapshot_${TS}.tar.gz"

mkdir -p /root/codex_tasks
mkdir -p "$SNAP_DIR"

echo "[1/8] Snapshot backup (before changes): ${SNAP_PATH}"
tar -czf "$SNAP_PATH" \
  /opt/prime-tech-platform \
  /opt/prime-tech-backend \
  /opt/prime-tech-frontend \
  /var/www/vhosts/system/${DOMAIN_MAIN}/conf \
  /var/www/vhosts/system/${DOMAIN_API}/conf 2>/dev/null || true
echo "SNAPSHOT_OK: ${SNAP_PATH}"

echo
echo "[2/8] Quick status (PM2 + local ports)"
pm2 ls || true
ss -ltnp | egrep ':3000|:4000|:80|:443' || true

echo
echo "[3/8] Local health checks (direct)"
curl -fsS -i "http://127.0.0.1:4000/api/health" | head -n 20 || true
curl -fsS -I "http://127.0.0.1:3000" | head -n 20 || true

write_nginx_include() {
  local dom="$1"
  local file="$2"
  local kind="$3" # "api" or "admin"

  mkdir -p "/var/www/vhosts/system/${dom}/conf"

  if [[ "$kind" == "api" ]]; then
    cat > "$file" <<EOF
# Managed by Codex: ${TS}
# Reverse-proxy entire api.\${domain} to backend :4000

location / {
  proxy_pass ${BACKEND_UPSTREAM};
  proxy_http_version 1.1;

  proxy_set_header Host \$host;
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF
  else
    # Optional Basic Auth for admin subdomain (set ADMIN_BASIC_USER + ADMIN_BASIC_PASS env before running)
    local auth_block=""
    if [[ -n "${ADMIN_BASIC_USER:-}" && -n "${ADMIN_BASIC_PASS:-}" ]]; then
      local ht="/etc/nginx/.htpasswd_${DOMAIN_ADMIN}"
      mkdir -p /etc/nginx
      if ! command -v htpasswd >/dev/null 2>&1; then
        apt-get update -y >/dev/null
        apt-get install -y apache2-utils >/dev/null
      fi
      htpasswd -bc "$ht" "$ADMIN_BASIC_USER" "$ADMIN_BASIC_PASS" >/dev/null
      chmod 600 "$ht"
      auth_block=$'\n  auth_basic "Restricted";\n  auth_basic_user_file '"$ht"$';\n'
    fi

    cat > "$file" <<EOF
# Managed by Codex: ${TS}
# Reverse-proxy admin.\${domain} to frontend :3000 (optionally basic-auth)

location / {
  proxy_pass ${FRONTEND_UPSTREAM};
  proxy_http_version 1.1;

  proxy_set_header Host \$host;
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;

  proxy_set_header Upgrade \$http_upgrade;
  proxy_set_header Connection "upgrade";
${auth_block}}
EOF
  fi
}

echo
echo "[4/8] Ensure Plesk has the subdomains (safe if already exists)"
# If they already exist, these may error — ignore safely.
plesk bin subdomain --create api   -domain "$DOMAIN_MAIN" --www-root "api.${DOMAIN_MAIN}"   >/dev/null 2>&1 || true
plesk bin subdomain --create admin -domain "$DOMAIN_MAIN" --www-root "admin.${DOMAIN_MAIN}" >/dev/null 2>&1 || true

echo
echo "[5/8] Write Nginx include files for api/admin subdomains"
API_NGX="/var/www/vhosts/system/${DOMAIN_API}/conf/vhost_nginx.conf"
API_SSL="/var/www/vhosts/system/${DOMAIN_API}/conf/vhost_nginx_ssl.conf"
ADMIN_NGX="/var/www/vhosts/system/${DOMAIN_ADMIN}/conf/vhost_nginx.conf"
ADMIN_SSL="/var/www/vhosts/system/${DOMAIN_ADMIN}/conf/vhost_nginx_ssl.conf"

write_nginx_include "$DOMAIN_API"   "$API_NGX"  "api"
write_nginx_include "$DOMAIN_API"   "$API_SSL"  "api"
write_nginx_include "$DOMAIN_ADMIN" "$ADMIN_NGX" "admin"
write_nginx_include "$DOMAIN_ADMIN" "$ADMIN_SSL" "admin"

echo
echo "[6/8] Reconfigure domains in Plesk and reload nginx"
plesk sbin httpdmng --reconfigure-domain "$DOMAIN_API"
plesk sbin httpdmng --reconfigure-domain "$DOMAIN_ADMIN"
plesk sbin httpdmng --reconfigure-domain "$DOMAIN_MAIN" || true

nginx -t
systemctl reload nginx

echo
echo "[7/8] Public HTTPS verification"
echo "- main site:"
curl -fsS -I "https://${DOMAIN_WWW}" | head -n 20 || true
echo "- api health:"
curl -fsS -i "https://${DOMAIN_API}/api/health" | head -n 30 || true
echo "- admin (expect 200 or 401 if basic-auth enabled):"
curl -fsS -I "https://${DOMAIN_ADMIN}/" | head -n 20 || true

echo
echo "[8/8] If main site is still failing, show concise Next.js + backend logs"
pm2 logs --lines 60 --nostream || true

echo
echo "DONE"
echo "SNAPSHOT_PATH=${SNAP_PATH}"