# ============================================================
# Phase D.1 — Stripe Checkout + Webhook processing (Policy B)
# ============================================================
$ErrorActionPreference = "Stop"

$Root    = (Get-Location).Path
$Backend = Join-Path $Root "backend"
if (-not (Test-Path $Backend)) { throw "Run from repo root. backend/ not found." }

function Ensure-Dir($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }
function Write-File($path, $content) {
  $dir = Split-Path $path -Parent
  Ensure-Dir $dir
  Set-Content -Encoding UTF8 $path $content
}

Write-Host "== Phase D.1 :: Stripe Checkout + Webhooks ==" -ForegroundColor Cyan

# ---------------------------
# 1) Add env vars to .env.example (non-destructive append)
# ---------------------------
$envExample = Join-Path $Backend ".env.example"
if (Test-Path $envExample) {
  $txt = Get-Content -Raw $envExample
  $need = @(
    "STRIPE_SECRET_KEY=",
    "STRIPE_WEBHOOK_SECRET=",
    "STRIPE_SUCCESS_URL=http://localhost:3000/checkout/success",
    "STRIPE_CANCEL_URL=http://localhost:3000/checkout/cancel"
  )
  foreach ($line in $need) {
    if ($txt -notmatch [regex]::Escape($line)) { $txt += "`r`n$line" }
  }
  Set-Content -Encoding UTF8 $envExample $txt
  Write-Host "OK: backend/.env.example updated (Stripe vars)" -ForegroundColor Green
} else {
  Write-Host "WARN: backend/.env.example not found (skipped)" -ForegroundColor Yellow
}

# ---------------------------
# 2) Stripe client helper
# ---------------------------
Write-File (Join-Path $Backend "src/integrations/stripe/stripe.ts") @'
import Stripe from "stripe";
import { loadEnv } from "../../config/env";

const env = loadEnv();

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});
'@

# ---------------------------
# 3) Checkout service/controller/routes
# ---------------------------
Ensure-Dir (Join-Path $Backend "src/checkout")
Write-File (Join-Path $Backend "src/checkout/checkout.controller.ts") @'
import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { stripe } from "../integrations/stripe/stripe";

function ordIdNow() {
  const d = new Date();
  const y = d.getUTCFullYear().toString();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `ORD-${y}${m}${day}-${rand}`;
}

// Policy B: invoice created at checkout start.
// NOTE: Counter-based INV/RCP formatting should be upgraded to your counter table later if required.
// For now, use timestamp-based safe unique to keep Phase D.1 moving.
function invNumberNow() {
  const y = new Date().getUTCFullYear();
  const n = Date.now().toString().slice(-6);
  return `INV-${y}-${n}`;
}

export async function startCheckout(req: Request, res: Response) {
  // Minimal payload (expand to spec as needed)
  const { items, currency = "GBP" } = req.body as {
    items: Array<{ releaseId: string; quantity: number; unitPrice: number }>;
    currency?: string;
  };

  if (!items?.length) return res.status(400).json({ error: "Missing items" });

  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: "Missing tenant" });

  const ordId = ordIdNow();

  const subtotal = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
  const total = subtotal; // tax later

  const order = await prisma.order.create({
    data: {
      tenantId,
      ordId,
      status: "PENDING_PAYMENT",
      currency,
      subtotal,
      tax: 0,
      total,
      items: {
        create: items.map(i => ({
          tenantId,
          releaseId: i.releaseId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          currency,
        })),
      },
      invoice: {
        create: {
          tenantId,
          invNumber: invNumberNow(),
          status: "ISSUED",
        },
      },
    },
    include: { invoice: true },
  });

  // Create Stripe Checkout Session
  const env = process.env;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: env.STRIPE_SUCCESS_URL || "http://localhost:3000/checkout/success",
    cancel_url: env.STRIPE_CANCEL_URL || "http://localhost:3000/checkout/cancel",
    currency: currency.toLowerCase(),
    line_items: items.map(i => ({
      quantity: i.quantity,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: i.unitPrice,
        product_data: { name: `Release ${i.releaseId}` },
      },
    })),
    metadata: {
      tenantId,
      orderId: order.id,
      ordId: order.ordId,
      invNumber: order.invoice?.invNumber || "",
    },
  });

  await prisma.payment.create({
    data: {
      tenantId,
      orderId: order.id,
      provider: "stripe",
      checkoutSessionId: session.id,
      paymentIntentId: (session.payment_intent as string) || null,
      status: "PENDING",
    },
  });

  res.json({
    ordId: order.ordId,
    invNumber: order.invoice?.invNumber,
    checkoutSessionId: session.id,
    checkoutUrl: session.url,
  });
}
'@

Write-File (Join-Path $Backend "src/routes/checkout.routes.ts") @'
import { Router } from "express";
import { startCheckout } from "../checkout/checkout.controller";

export const checkoutRoutes = Router();
checkoutRoutes.post("/start", startCheckout);
'@

# ---------------------------
# 4) Webhook handler (raw body) + idempotency
# ---------------------------
Write-File (Join-Path $Backend "src/webhooks/stripe.webhook.ts") @'
import type { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../integrations/stripe/stripe";
import { prisma } from "../db/prisma";

export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || typeof sig !== "string") return res.status(400).send("Missing stripe-signature");
  if (!secret) return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent((req as any).rawBody, sig, secret);
  } catch (err: any) {
    return res.status(400).send(`Webhook signature verification failed`);
  }

  // Idempotency
  const tenantId = (event.data.object as any)?.metadata?.tenantId as string | undefined;
  const providerEventId = event.id;

  const existing = await prisma.webhookEvent.findUnique({ where: { providerEventId } });
  if (existing?.processedAt) return res.json({ received: true, idempotent: true });

  await prisma.webhookEvent.upsert({
    where: { providerEventId },
    update: {},
    create: { tenantId: tenantId || "00000000-0000-0000-0000-000000000000", provider: "stripe", providerEventId },
  });

  // Handle payment success
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    const tId = session.metadata?.tenantId;

    if (orderId && tId) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "PAID" },
        });

        const pay = await tx.payment.findFirst({
          where: { orderId, tenantId: tId },
        });

        // Create receipt (Policy B: receipt only after payment confirmed)
        const y = new Date().getUTCFullYear();
        const n = Date.now().toString().slice(-6);
        const rcpNumber = `RCP-${y}-${n}`;

        await tx.receipt.create({
          data: {
            tenantId: tId,
            rcpNumber,
            orderId,
            paymentId: pay?.id || null,
          },
        });

        // Entitlements for all order items
        const items = await tx.orderItem.findMany({ where: { orderId } });
        // If userId is required later, attach after auth is wired; Phase D.1 grants tenant-level for now.
        for (const it of items) {
          // Skip if already granted
          await tx.entitlement.upsert({
            where: { tenantId_userId_releaseId: { tenantId: tId, userId: "00000000-0000-0000-0000-000000000000", releaseId: it.releaseId } },
            update: {},
            create: { tenantId: tId, userId: "00000000-0000-0000-0000-000000000000", releaseId: it.releaseId },
          });
        }
      });
    }
  }

  await prisma.webhookEvent.update({
    where: { providerEventId },
    data: { processedAt: new Date() },
  });

  res.json({ received: true });
}
'@

Write-File (Join-Path $Backend "src/routes/webhooks.routes.ts") @'
import { Router } from "express";
import { stripeWebhook } from "../webhooks/stripe.webhook";

export const webhooksRoutes = Router();
webhooksRoutes.post("/stripe", stripeWebhook);
'@

Write-Host "OK: Phase D.1 files written. Now ensure app.ts mounts checkoutRoutes and webhooksRoutes (already should)." -ForegroundColor Green

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1) Update backend/.env with STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + URLs" -ForegroundColor Yellow
Write-Host "2) cd backend; npm i stripe" -ForegroundColor Yellow
Write-Host "3) cd backend; npm run dev" -ForegroundColor Yellow
Write-Host "4) Use Stripe CLI to forward webhooks to http://localhost:4000/api/webhooks/stripe" -ForegroundColor Yellow
