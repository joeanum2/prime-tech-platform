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
