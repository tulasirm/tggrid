import { Stripe } from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/event-bus";

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return stripe;
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Stripe Webhook Receiver
 * Handles payment events and triggers Kubernetes scaling
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature")!;

    // Verify webhook signature (critical for security)
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error(
        "[STRIPE] Webhook signature verification failed:",
        err.message
      );
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    console.log(`[STRIPE] Webhook event received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        return await handleCheckoutSessionCompleted(event);

      case "invoice.payment_succeeded":
        return await handleInvoicePaymentSucceeded(event);

      case "customer.subscription.deleted":
        return await handleSubscriptionCancelled(event);

      case "invoice.payment_failed":
        return await handleInvoicePaymentFailed(event);

      default:
        console.log(`[STRIPE] Unhandled event type: ${event.type}`);
        return NextResponse.json({ received: true }, { status: 200 });
    }
  } catch (err) {
    console.error("[STRIPE] Webhook error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 * Customer completes initial payment
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  console.log(`[STRIPE] Checkout completed: ${session.id}`);

  try {
    // Extract customer ID and plan from metadata
    const customerId = session.client_reference_id; // Your user ID
    const plan = session.metadata?.plan as "professional" | "enterprise";
    const stripeSubscriptionId = session.subscription as string;
    const stripeCustomerId = session.customer as string;

    if (!customerId) {
      console.error("[STRIPE] No client_reference_id in session");
      return NextResponse.json(
        { error: "Missing client_reference_id" },
        { status: 400 }
      );
    }

    // Update database: mark payment as successful
    const updatedUser = await db.user.update({
      where: { id: customerId },
      data: {
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionPlan: plan || "professional",
        subscriptionStatus: "active",
        paidAt: new Date(),
        accountBalance: getPlanBalance(plan || "professional"),
      },
    });

    console.log(
      `[STRIPE] ✓ Updated user ${customerId} with subscription ${stripeSubscriptionId}`
    );

    // 🎯 CRITICAL: Publish event to trigger Kubernetes scaling
    await publishEvent("customer:payment-verified", {
      customerId,
      plan: plan || "professional",
      timestamp: new Date().toISOString(),
      stripeSubscriptionId,
      stripeCustomerId,
    });

    // Log transaction
    await db.transaction.create({
      data: {
        userId: customerId,
        type: "credit",
        amount: getPlanBalance(plan || "professional"),
        description: `Subscription payment received: ${plan} plan`,
        balanceAfter: getPlanBalance(plan || "professional"),
        stripeChargeId: session.payment_intent as string,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[STRIPE] Error handling checkout session:", err);
    return NextResponse.json(
      { error: "Failed to handle checkout session" },
      { status: 500 }
    );
  }
}

/**
 * Handle invoice.payment_succeeded
 * Monthly subscription renews
 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  console.log(`[STRIPE] Invoice paid: ${invoice.id}`);

  try {
    const stripeCustomerId = invoice.customer as string;

    // Find user by Stripe customer ID
    const user = await db.user.findUnique({
      where: { stripeCustomerId },
    });

    if (!user) {
      console.warn(
        `[STRIPE] User not found for Stripe customer ${stripeCustomerId}`
      );
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const plan = user.subscriptionPlan as "professional" | "enterprise";
    const newBalance = getPlanBalance(plan);

    // Refresh account balance
    await db.user.update({
      where: { id: user.id },
      data: {
        accountBalance: newBalance,
        lastBillingDate: new Date(),
      },
    });

    // Log transaction
    await db.transaction.create({
      data: {
        userId: user.id,
        type: "credit",
        amount: newBalance,
        description: `Monthly billing renewal for ${plan} plan`,
        balanceAfter: newBalance,
        stripeChargeId: invoice.payment_intent as string,
        timestamp: new Date(),
      },
    });

    console.log(
      `[STRIPE] ✓ Renewed balance for ${user.id}: ${newBalance} sessions`
    );

    // Publish renewal event
    await publishEvent("customer:billing-renewed", {
      customerId: user.id,
      plan,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[STRIPE] Error handling invoice payment:", err);
    return NextResponse.json(
      { error: "Failed to handle invoice payment" },
      { status: 500 }
    );
  }
}

/**
 * Handle customer.subscription.deleted
 * Customer cancels subscription
 */
async function handleSubscriptionCancelled(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  console.log(`[STRIPE] Subscription cancelled: ${subscription.id}`);

  try {
    const stripeCustomerId = subscription.customer as string;

    // Find user
    const user = await db.user.findUnique({
      where: { stripeCustomerId },
    });

    if (!user) {
      console.warn(
        `[STRIPE] User not found for Stripe customer ${stripeCustomerId}`
      );
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update subscription status
    await db.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "cancelled",
        accountBalance: 0,
      },
    });

    console.log(`[STRIPE] ✓ Cancelled subscription for ${user.id}`);

    // Publish event to deallocate Kubernetes resources
    await publishEvent("customer:subscription-cancelled", {
      customerId: user.id,
      timestamp: new Date().toISOString(),
      stripeSubscriptionId: subscription.id,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[STRIPE] Error handling subscription cancellation:", err);
    return NextResponse.json(
      { error: "Failed to handle subscription cancellation" },
      { status: 500 }
    );
  }
}

/**
 * Handle invoice.payment_failed
 * Payment failed
 */
async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;

  console.log(`[STRIPE] Invoice payment failed: ${invoice.id}`);

  try {
    const stripeCustomerId = invoice.customer as string;

    const user = await db.user.findUnique({
      where: { stripeCustomerId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update status
    await db.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "overdue",
      },
    });

    // Publish event
    await publishEvent("customer:billing-failed", {
      customerId: user.id,
      invoiceId: invoice.id,
      amount: invoice.amount_due,
      timestamp: new Date().toISOString(),
    });

    console.log(`[STRIPE] ✓ Marked subscription as overdue for ${user.id}`);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[STRIPE] Error handling payment failure:", err);
    return NextResponse.json(
      { error: "Failed to handle payment failure" },
      { status: 500 }
    );
  }
}

/**
 * Get plan-based account balance/credit
 */
function getPlanBalance(plan: string): number {
  const balances = {
    starter: 0, // Free tier
    professional: 5000, // 5,000 sessions/month
    enterprise: 50000, // 50,000 sessions/month
  };
  return balances[plan as keyof typeof balances] || 0;
}
