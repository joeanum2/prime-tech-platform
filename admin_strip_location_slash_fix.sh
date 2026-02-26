set -euo pipefail

DOMAIN="admin.joetechx.co.uk"
CONF_DIR="/var/www/vhosts/system/${DOMAIN}/conf"
HTTP_INC="${CONF_DIR}/vhost_nginx.conf"
SSL_INC="${CONF_DIR}/vhost_nginx_ssl.conf"

TS="$(date +%Y%m%d_%H%M%S)"
BK_DIR="/opt/backups/plesk_nginx_fix_${DOMAIN}_${TS}"
mkdir -p "$BK_DIR"

echo "[1/8] Backup include files"
cp -a "$HTTP_INC" "$BK_DIR/vhost_nginx.conf.bak" 2>/dev/null || true
cp -a "$SSL_INC" "$BK_DIR/vhost_nginx_ssl.conf.bak" 2>/dev/null || true

echo "[2/8] Show current HTTP include around the reported line(s)"
if [ -f "$HTTP_INC" ]; then
  nl -ba "$HTTP_INC" | sed -n '1,120p'
else
  echo "HTTP include not found: $HTTP_INC"
fi

echo "[3/8] Remove any 'location / { ... }' blocks from HTTP+SSL include (Plesk must own /)"
strip_location_slash() {
  local f="$1"
  [ -f "$f" ] || return 0

  # Remove multi-line blocks: location / { ... }
  perl -0777 -i -pe 's/\n\s*location\s+\/\s*\{.*?\n\s*\}\s*\n/\n/sg' "$f"
  # Remove single-line blocks: location / { ... }
  perl -i -pe 's/^\s*location\s+\/\s*\{.*\}\s*$//g' "$f"
}

strip_location_slash "$HTTP_INC"
strip_location_slash "$SSL_INC"

echo "[4/8] Confirm no 'location /' remains"
grep -nE '^\s*location\s+/\b' "$HTTP_INC" || echo "OK: no location / in HTTP include"
[ -f "$SSL_INC" ] && (grep -nE '^\s*location\s+/\b' "$SSL_INC" || echo "OK: no location / in SSL include") || true

echo "[5/8] Ask Plesk to regenerate configs for this domain"
plesk sbin httpdmng --reconfigure-domain "$DOMAIN"

echo "[6/8] Validate nginx"
nginx -t

echo "[7/8] Reload nginx"
systemctl reload nginx

echo "[8/8] Optional: run Plesk web repair (safe) to clear the dashboard warning"
plesk repair web -y || true

echo "DONE. Backup: $BK_DIR"