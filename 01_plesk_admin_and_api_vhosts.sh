#!/usr/bin/env bash
set -euo pipefail

DOMAIN="joetechx.co.uk"
ADMIN_SUB="admin.${DOMAIN}"
API_SUB="api.${DOMAIN}"

# Ports already in use by PM2 apps
FRONTEND_UPSTREAM="http://127.0.0.1:3000"
BACKEND_UPSTREAM="http://127.0.0.1:4000"

echo "[1/6] Ensure subdomains exist in Plesk (idempotent)..."
# If already created, these commands may fail; ignore safely.
plesk bin subdomain --create admin -domain "${DOMAIN}" -www-root "admin.${DOMAIN}" >/dev/null 2>&1 || true
plesk bin subdomain --create api   -domain "${DOMAIN}" -www-root "api.${DOMAIN}"   >/dev/null 2>&1 || true

echo "[2/6] Write nginx include configs for admin + api subdomains..."

write_vhost_files() {
  local d="$1"
  local conf_dir="/var/www/vhosts/system/${d}/conf"
  mkdir -p "$conf_dir"

  # HTTP include
  cat > "${conf_dir}/vhost_nginx.conf" <<EOF
# Managed by Codex: ${d}

# --- API subdomain: proxy everything to backend ---
# --- Admin subdomain: only allow /admin; deny/redirect everything else ---
EOF

  # SSL include
  cat > "${conf_dir}/vhost_nginx_ssl.conf" <<EOF
# Managed by Codex: ${d} (SSL)

# --- API subdomain: proxy everything to backend ---
# --- Admin subdomain: only allow /admin; deny/redirect everything else ---
EOF
}

write_api_config() {
  local d="$1"
  local conf_dir="/var/www/vhosts/system/${d}/conf"

  cat >> "${conf_dir}/vhost_nginx.conf" <<EOF

location / {
  proxy_pass ${BACKEND_UPSTREAM};
  proxy_http_version 1.1;
  proxy_set_header Host \$host;
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF

  cat >> "${conf_dir}/vhost_nginx_ssl.conf" <<EOF

location / {
  proxy_pass ${BACKEND_UPSTREAM};
  proxy_http_version 1.1;
  proxy_set_header Host \$host;
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF
}

write_admin_config() {
  local d="$1"
  local conf_dir="/var/www/vhosts/system/${d}/conf"

  # Admin: only allow /admin and assets; everything else redirected/denied.
  # This keeps admin subdomain “separate from public view” without needing a separate Next.js instance.
  cat >> "${conf_dir}/vhost_nginx.conf" <<EOF

# Redirect root to /admin
location = / {
  return 302 https://${d}/admin;
}

# Allow only /admin (and Next assets)
location ^~ /admin {
  proxy_pass ${FRONTEND_UPSTREAM};
  proxy_http_version 1.1;

  proxy_set_header Host \$host;
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;

  proxy_set_header Upgrade \$http_upgrade;
  proxy_set_header Connection "upgrade";
}

location ^~ /_next/ {
  proxy_pass ${FRONTEND_UPSTREAM};
  proxy_http_version 1.1;
  proxy_set_header Host \$host;
  proxy_set_header X-Forwarded-Proto \$scheme;
  proxy_set_header Upgrade \$http_upgrade;
  proxy_set_header Connection "upgrade";
}

# Block everything else
location / {
  return 404;
}
EOF

  cat >> "${conf_dir}/vhost_nginx_ssl.conf" <<EOF

# Redirect root to /admin
location = / {
  return 302 https://${d}/admin;
}

location ^~ /admin {
  proxy_pass ${FRONTEND_UPSTREAM};
  proxy_http_version 1.1;

  proxy_set_header Host \$host;
  proxy_set_header X-Real-IP \$remote_addr;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;

  proxy_set_header Upgrade \$http_upgrade;
  proxy_set_header Connection "upgrade";
}

location ^~ /_next/ {
  proxy_pass ${FRONTEND_UPSTREAM};
  proxy_http_version 1.1;
  proxy_set_header Host \$host;
  proxy_set_header X-Forwarded-Proto \$scheme;
  proxy_set_header Upgrade \$http_upgrade;
  proxy_set_header Connection "upgrade";
}

location / {
  return 404;
}
EOF
}

# Create include files and write appropriate routing
write_vhost_files "${API_SUB}"
write_api_config  "${API_SUB}"

write_vhost_files "${ADMIN_SUB}"
write_admin_config "${ADMIN_SUB}"

echo "[3/6] Reconfigure domains via Plesk..."
plesk sbin httpdmng --reconfigure-domain "${API_SUB}"
plesk sbin httpdmng --reconfigure-domain "${ADMIN_SUB}"

echo "[4/6] Validate and reload nginx..."
nginx -t
systemctl reload nginx

echo "[5/6] Basic HTTP checks (status lines only)..."
curl -sSI "http://${API_SUB}/api/health" | head -n 1 || true
curl -sSI "https://${ADMIN_SUB}/" | head -n 1 || true

echo "[6/6] Done."