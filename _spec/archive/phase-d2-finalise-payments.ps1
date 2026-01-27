# Phase D.2 – Finalise Payments (Safe Version)

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Backend = Join-Path $Root "backend"

Write-Host "Running Phase D.2"

# ---- checkout.routes.ts ----
$checkoutPath = "$Backend\src\routes\checkout.routes.ts"

@'
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { createCheckoutSession } from "../checkout/checkout.controller";

export const checkoutRoutes = Router();

checkoutRoutes.post("/start", requireAuth, createCheckoutSession);
'@ | Set-Content -Encoding UTF8 $checkoutPath

# ---- checkout.controller.ts ----
$controllerPath = "$Backend\src\checkout\checkout.controller.ts"

@'
import { Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../db/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function createCheckoutSession(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const order = await prisma.order.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      status: "PENDING_PAYMENT",
      total: 1000,
      currency: "GBP"
    }
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: process.env.STRIPE_SUCCESS_URL!,
    cancel_url: process.env.STRIPE_CANCEL_URL!,
    metadata: {
      orderId: order.id,
      tenantId: user.tenantId,
      userId: user.id
    },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: 1000,
        product_data: { name: "Prime Tech Purchase" }
      }
    }]
  });

  await prisma.payment.create({
    data: {
      tenantId: user.tenantId,
      orderId: order.id,
      provider: "stripe",
      checkoutSessionId: session.id,
      status: "PENDING"
    }
  });

  res.json({ url: session.url });
}
'@ | Set-Content -Encoding UTF8 $controllerPath

# ---- stripe webhook ----
$webhookPath = "$Backend\src\webhooks\stripe.webhook.ts"

@'
import { Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../db/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;

  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const { orderId, userId, tenantId } = session.metadata || {};

    if (!orderId || !userId || !tenantId) {
      return res.status(400).end();
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" }
      }),
      prisma.receipt.create({
        data: {
          tenantId,
          orderId,
          rcpNumber: `RCP-${Date.now()}`
        }
      }),
      prisma.entitlement.create({
        data: {
          tenantId,
          userId,
          releaseId: "DEFAULT"
        }
      })
    ]);
  }

  res.json({ received: true });
}
'@ | Set-Content -Encoding UTF8 $webhookPath

Write-Host "Phase D.2 applied successfully"
