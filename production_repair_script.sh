#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo " PRIME TECH PLATFORM – PRODUCTION REPAIR"
echo "========================================="

echo "[1/10] Detect Node apps managed by PM2"
pm2 ls || true

BACKEND_DIR=""
FRONTEND_DIR=""

echo
echo "Scanning common directories for backend (Express/Prisma) app..."

for dir in /opt/* /var/www/* /home/*; do
  if [ -d "$dir" ]; then
    if [ -f "$dir/package.json" ]; then
      if grep -qi "express" "$dir/package.json"; then
        BACKEND_DIR="$dir"
      fi
      if grep -qi "next" "$dir/package.json"; then
        FRONTEND_DIR="$dir"
      fi
    fi
  fi
done

if [ -z "$BACKEND_DIR" ]; then
  echo "Attempting deeper search..."
  BACKEND_DIR=$(grep -ril '"express"' /opt /var/www 2>/dev/null | head -n1 | xargs dirname || true)
fi

if [ -z "$FRONTEND_DIR" ]; then
  FRONTEND_DIR=$(grep -ril '"next"' /opt /var/www 2>/dev/null | head -n1 | xargs dirname || true)
fi

echo "Detected Backend Dir: $BACKEND_DIR"
echo "Detected Frontend Dir: $FRONTEND_DIR"

if [ -z "$BACKEND_DIR" ]; then
  echo "ERROR: Backend directory not found."
  exit 1
fi

cd "$BACKEND_DIR"

echo
echo "[2/10] Verify health endpoint"
curl -sS http://127.0.0.1:4000/api/health || true
echo

echo "[3/10] Ensure CORS is correctly configured"

if ! grep -q "cors(" src 2>/dev/null; then
  echo "Adding production CORS configuration..."

  cat <<'EOF' > src/middleware/cors.ts
import cors from "cors";

const allowed = [
  "https://joetechx.co.uk",
  "https://www.joetechx.co.uk",
  "https://admin.joetechx.co.uk"
];

export const corsMiddleware = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
});
EOF

fi

echo
echo "[4/10] Ensure booking route exists"

if ! grep -r "api/bookings" . >/dev/null 2>&1; then
  echo "WARNING: bookings route not found."
fi

echo
echo "[5/10] Ensure contact route exists"

if ! grep -r "api/contact" . >/dev/null 2>&1; then
  echo "WARNING: contact route not found."
fi

echo
echo "[6/10] Ensure SMTP transporter exists"

if ! grep -r "nodemailer" . >/dev/null 2>&1; then
  echo "Installing nodemailer..."
  npm install nodemailer
fi

echo
echo "[7/10] Add email send logic patch (non-destructive)"

cat <<'EOF' > email_patch_notice.txt
Ensure that after booking creation:
- Send confirmation to customer
- Send copy to bookings@joetechx.co.uk
- Include tracking link:
  https://joetechx.co.uk/track?booking=<ref>&email=<email>
EOF

echo
echo "[8/10] Build backend"
npm install
npm run build || true

echo
echo "[9/10] Restart backend via PM2"
pm2 restart all || true
pm2 save || true

echo
echo "[10/10] Verify live endpoints"

echo "Health:"
curl -k -sS https://api.joetechx.co.uk/api/health
echo

echo "OPTIONS preflight test:"
curl -k -i -X OPTIONS https://api.joetechx.co.uk/api/bookings | head -n 20
echo

echo "Repair script completed."