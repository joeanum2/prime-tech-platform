set -euo pipefail

DOMAIN="admin.joetechx.co.uk"
CONF_DIR="/var/www/vhosts/system/${DOMAIN}/conf"
F1="${CONF_DIR}/vhost_nginx.conf"
F2="${CONF_DIR}/vhost_nginx_ssl.conf"

echo "[1/5] Overwrite include files with minimal safe proxy"

cat > "$F1" <<'EOF'
location / {
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

cat > "$F2" <<'EOF'
location / {
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

echo "[2/5] Reconfigure only this domain"
plesk sbin httpdmng --reconfigure-domain "$DOMAIN"

echo "[3/5] Test nginx config"
nginx -t

echo "[4/5] Reload nginx"
systemctl reload nginx

echo "[5/5] Verify admin site"
curl -I https://${DOMAIN}/ | head -n 20