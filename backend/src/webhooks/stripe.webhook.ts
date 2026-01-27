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
