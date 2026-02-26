set -euo pipefail

DOMAIN="api.joetechx.co.uk"
HTTP_INC="/var/www/vhosts/system/${DOMAIN}/conf/vhost_nginx.conf"
SSL_INC="/var/www/vhosts/system/${DOMAIN}/conf/vhost_nginx_ssl.conf"

backup_dir="/opt/backups/nginx_api_fix_$(date -u +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"
cp -a "$HTTP_INC" "$backup_dir/vhost_nginx.conf.bak" 2>/dev/null || true
cp -a "$SSL_INC"  "$backup_dir/vhost_nginx_ssl.conf.bak" 2>/dev/null || true

cat > "$HTTP_INC" <<'EOF'
# Managed by Codex: api.joetechx.co.uk reverse proxy -> backend :4000
location / {
  proxy_pass http://127.0.0.1:4000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
EOF

cat > "$SSL_INC" <<'EOF'
# Managed by Codex: api.joetechx.co.uk reverse proxy -> backend :4000 (SSL)
location / {
  proxy_pass http://127.0.0.1:4000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
EOF

plesk sbin httpdmng --reconfigure-domain "$DOMAIN"
nginx -t
systemctl reload nginx

echo "VERIFY:"
curl -sSI "https://${DOMAIN}/api/health" | head -n 20
curl -sS  "https://${DOMAIN}/api/health" ; echo