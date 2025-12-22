import { EventEmitter } from "events";
import { db } from "./db";
import {
  allocateKubernetesResources,
  deallocateKubernetesResources,
} from "./resource-allocator";

/**
 * Global Event Bus
 * Handles payment events, scaling events, and lifecycle events
 * Used for async processing without blocking API responses
 */

export const eventBus = new EventEmitter();

// Configure for high-concurrency scenarios
eventBus.setMaxListeners(100);

/**
 * Publish an event to the event bus
 */
export async function publishEvent(
  eventType: string,
  payload: Record<string, any>
) {
  console.log(`[EVENT] ${eventType}:`, JSON.stringify(payload, null, 2));

  // Emit locally for immediate processing
  eventBus.emit(eventType, payload);

  // Persist to database for audit trail
  try {
    await db.auditLog.create({
      data: {
        eventType,
        userId: payload.customerId || payload.userId,
        payload,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    console.error("[EVENT] Failed to persist audit log:", err);
  }
}

/**
 * EVENT: customer:payment-verified
 * Triggered when Stripe webhook confirms successful payment
 */
eventBus.on("customer:payment-verified", async (payload) => {
  const { customerId, plan, stripeSubscriptionId } = payload;
  console.log(
    `[SCALING] Allocating Kubernetes resources for customer ${customerId}, plan: ${plan}`
  );

  try {
    // Allocate Kubernetes resources
    await allocateKubernetesResources(customerId, plan);

    // Update user status
    await db.user.update({
      where: { id: customerId },
      data: {
        k8sNamespace: `customer-${customerId.substring(0, 8)}`,
        resourcesAllocated: true,
        lastResourceAllocationAt: new Date(),
      },
    });

    console.log(
      `[SCALING] ✓ Successfully allocated resources for ${customerId}`
    );
  } catch (err) {
    console.error(`[SCALING] ✗ Failed to allocate resources:`, err);

    // Notify ops team - critical issue
    await notifyOps("critical", {
      message: `Failed to allocate K8s resources for customer ${customerId}`,
      error: err instanceof Error ? err.message : String(err),
      customerId,
    });

    // Refund customer (payment was processed but resources couldn't be allocated)
    await refundPayment(customerId, stripeSubscriptionId);
  }
});

/**
 * EVENT: customer:subscription-cancelled
 * Triggered when customer cancels subscription
 */
eventBus.on("customer:subscription-cancelled", async (payload) => {
  const { customerId } = payload;
  console.log(`[SCALING] Deallocating resources for customer ${customerId}`);

  try {
    await deallocateKubernetesResources(customerId);

    // Update user status
    await db.user.update({
      where: { id: customerId },
      data: {
        resourcesAllocated: false,
        k8sNamespace: null,
        subscriptionStatus: "cancelled",
        accountBalance: 0,
      },
    });

    console.log(
      `[SCALING] ✓ Successfully deallocated resources for ${customerId}`
    );
  } catch (err) {
    console.error(`[SCALING] ✗ Failed to deallocate resources:`, err);

    // Alert ops team - namespace might be left behind
    await notifyOps("warning", {
      message: `Failed to deallocate K8s resources for customer ${customerId}`,
      error: err instanceof Error ? err.message : String(err),
      customerId,
    });
  }
});

/**
 * EVENT: customer:billing-renewed
 * Triggered when monthly subscription renews
 */
eventBus.on("customer:billing-renewed", async (payload) => {
  const { customerId, plan } = payload;
  console.log(`[BILLING] Billing renewed for customer ${customerId}`);

  try {
    // Reset account balance to plan limit
    const balances = {
      starter: 0,
      professional: 5000,
      enterprise: 50000,
    };

    const newBalance = balances[plan as keyof typeof balances] || 0;

    await db.user.update({
      where: { id: customerId },
      data: {
        accountBalance: newBalance,
        lastBillingDate: new Date(),
      },
    });

    // Log billing renewal
    await db.transaction.create({
      data: {
        userId: customerId,
        type: "credit",
        amount: newBalance,
        description: `Monthly billing renewal for ${plan} plan`,
        balanceAfter: newBalance,
        timestamp: new Date(),
      },
    });

    console.log(
      `[BILLING] ✓ Renewed balance for ${customerId}: ${newBalance} sessions`
    );
  } catch (err) {
    console.error(`[BILLING] ✗ Failed to process renewal:`, err);
  }
});

/**
 * EVENT: session:started
 * Triggered when a session is created
 */
eventBus.on("session:started", async (payload) => {
  const { sessionId, customerId, containerId } = payload;
  console.log(
    `[SESSION] Session started: ${sessionId} (container: ${containerId})`
  );

  try {
    // Update metrics
    await db.sessionMetric.create({
      data: {
        sessionId,
        userId: customerId,
        eventType: "session:started",
        metric: JSON.stringify({ containerId, startTime: new Date() }),
        timestamp: new Date(),
      },
    });
  } catch (err) {
    console.error(`[SESSION] Error logging session start:`, err);
  }
});

/**
 * EVENT: session:completed
 * Triggered when a session ends
 */
eventBus.on("session:completed", async (payload) => {
  const { sessionId, customerId, durationMinutes, actualCost } = payload;
  console.log(
    `[SESSION] Session completed: ${sessionId} (${durationMinutes}min, cost: $${actualCost})`
  );

  try {
    // Update session metrics
    await db.sessionMetric.create({
      data: {
        sessionId,
        userId: customerId,
        eventType: "session:completed",
        metric: JSON.stringify({
          durationMinutes,
          actualCost,
          completedAt: new Date(),
        }),
        timestamp: new Date(),
      },
    });

    // Update total usage statistics
    await db.user.update({
      where: { id: customerId },
      data: {
        totalSessionsUsed: { increment: 1 },
        totalCostIncurred: { increment: actualCost },
      },
    });
  } catch (err) {
    console.error(`[SESSION] Error logging session completion:`, err);
  }
});

/**
 * EVENT: pod:warm-acquired
 * Triggered when a pre-warmed pod is allocated to a customer
 */
eventBus.on("pod:warm-acquired", async (payload) => {
  const { containerId, customerId, acquiredAt } = payload;
  console.log(
    `[POD-WARMER] Warm pod allocated: ${containerId} to ${customerId}`
  );

  try {
    // Trigger creation of replacement warm pod
    publishEvent("pod:replacement-needed", {
      containerId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[POD-WARMER] Error in warm pod event:`, err);
  }
});

/**
 * EVENT: pod:replacement-needed
 * Triggered when a warm pod needs to be replaced
 */
eventBus.on("pod:replacement-needed", async (payload) => {
  console.log(`[POD-WARMER] Replacement warm pod needed`);

  try {
    // The pod warmer service listens to this event
    // and creates a new warm pod to maintain the pool
    // (handled in mini-services/browser-pool)
  } catch (err) {
    console.error(`[POD-WARMER] Error in replacement event:`, err);
  }
});

/**
 * EVENT: error:resource-allocation
 * Triggered when resource allocation fails
 */
eventBus.on("error:resource-allocation", async (payload) => {
  console.error(`[ERROR] Resource allocation failed:`, payload);

  try {
    await db.auditLog.create({
      data: {
        eventType: "error:resource-allocation",
        userId: payload.customerId,
        payload,
        timestamp: new Date(),
      },
    });

    // Alert ops team
    await notifyOps("error", {
      message: "Resource allocation failed",
      payload,
    });
  } catch (err) {
    console.error(`[ERROR] Failed to log resource allocation error:`, err);
  }
});

/**
 * Send notification to ops team
 */
async function notifyOps(
  severity: "critical" | "warning" | "error" | "info",
  payload: any
) {
  try {
    // Integration point: send to Slack, PagerDuty, email, etc.
    console.log(
      `[OPS-ALERT] [${severity.toUpperCase()}]`,
      JSON.stringify(payload)
    );

    // TODO: Implement actual notification channel
    // Example: send to Slack webhook
    // await fetch(process.env.SLACK_WEBHOOK_URL!, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     text: `UFBrowsers [${severity}]: ${payload.message}`,
    //     attachments: [{text: JSON.stringify(payload)}]
    //   })
    // })
  } catch (err) {
    console.error("[OPS-ALERT] Failed to send notification:", err);
  }
}

/**
 * Refund a payment (in case resource allocation failed)
 */
async function refundPayment(customerId: string, stripeSubscriptionId: string) {
  try {
    console.log(
      `[REFUND] Initiating refund for customer ${customerId} (${stripeSubscriptionId})`
    );

    // TODO: Implement actual Stripe refund
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // await stripe.refunds.create({ charge: chargeId })

    await db.auditLog.create({
      data: {
        eventType: "payment:refunded",
        userId: customerId,
        payload: { stripeSubscriptionId, reason: "resource-allocation-failed" },
        timestamp: new Date(),
      },
    });

    console.log(`[REFUND] ✓ Refund processed for ${customerId}`);
  } catch (err) {
    console.error(`[REFUND] ✗ Failed to process refund:`, err);
  }
}

/**
 * Initialize event bus listeners
 * Call this in app startup
 */
export function initializeEventBus() {
  console.log("[EVENT-BUS] Initialized with all event handlers");

  // Log all events (for debugging)
  if (process.env.DEBUG_EVENTS === "true") {
    eventBus.onAny((eventName: string, ...args: any[]) => {
      console.log(`[EVENT-DEBUG] ${eventName}:`, args);
    });
  }
}
