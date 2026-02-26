set -euo pipefail

DOMAIN="admin.joetechx.co.uk"
CONF_DIR="/var/www/vhosts/system/${DOMAIN}/conf"
HTTP_INC="${CONF_DIR}/vhost_nginx.conf"
SSL_INC="${CONF_DIR}/vhost_nginx_ssl.conf"

echo "[1/5] Remove duplicate root location blocks"

# Replace include files with Plesk-safe config
cat > "$HTTP_INC" <<'EOF'
# Plesk-safe include (no duplicate location /)

location ^~ /admin/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;

  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;

  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
EOF

cat > "$SSL_INC" <<'EOF'
# Plesk-safe include (SSL)

location ^~ /admin/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;

  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto https;

  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
EOF

echo "[2/5] Reconfigure domain"
plesk sbin httpdmng --reconfigure-domain "$DOMAIN"

echo "[3/5] Test nginx"
nginx -t

echo "[4/5] Reload nginx"
systemctl reload nginx

echo "[5/5] Verify"
curl -I https://${DOMAIN}/admin/ | head -n 20