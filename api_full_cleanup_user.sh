set -euo pipefail

DOMAIN="api.joetechx.co.uk"
CONF_DIR="/var/www/vhosts/system/${DOMAIN}/conf"
HTTP_INC="${CONF_DIR}/vhost_nginx.conf"
SSL_INC="${CONF_DIR}/vhost_nginx_ssl.conf"

TS="$(date +%Y%m%d_%H%M%S)"
BK_DIR="/opt/backups/plesk_full_cleanup_${DOMAIN}_${TS}"
mkdir -p "$BK_DIR"

echo "[1/6] Backup API include files"
cp -a "$HTTP_INC" "$BK_DIR/vhost_nginx.conf.bak" 2>/dev/null || true
cp -a "$SSL_INC" "$BK_DIR/vhost_nginx_ssl.conf.bak" 2>/dev/null || true

echo "[2/6] Completely empty API include files"
: > "$HTTP_INC" 2>/dev/null || true
: > "$SSL_INC" 2>/dev/null || true

echo "[3/6] Reconfigure domain via Plesk"
plesk sbin httpdmng --reconfigure-domain "$DOMAIN"

echo "[4/6] Test nginx"
nginx -t

echo "[5/6] Reload nginx"
systemctl reload nginx

echo "[6/6] Run full web repair (safe)"
plesk repair web -y

echo "DONE. Backup stored in $BK_DIR"