import { kubernetesClient } from "./kubernetes";
import { publishEvent } from "./event-bus";

/**
 * Resource Allocator
 * Orchestrates Kubernetes resource creation and deletion for customers
 */

/**
 * Allocate Kubernetes resources for a customer
 * Called immediately after payment verification
 */
export async function allocateKubernetesResources(
  customerId: string,
  plan: "starter" | "professional" | "enterprise"
): Promise<void> {
  console.log(
    `[ALLOCATOR] Starting resource allocation for ${customerId} on ${plan} plan`
  );

  try {
    // Step 1: Initialize Kubernetes client
    kubernetesClient.init();

    // Step 2: Create namespace
    const namespace = await kubernetesClient.createNamespace(customerId);
    console.log(`[ALLOCATOR] ✓ Namespace created: ${namespace}`);

    // Step 3: Create ResourceQuota
    await kubernetesClient.createResourceQuota(customerId, plan);
    console.log(`[ALLOCATOR] ✓ ResourceQuota created`);

    // Step 4: Create NetworkPolicy
    await kubernetesClient.createNetworkPolicy(customerId);
    console.log(`[ALLOCATOR] ✓ NetworkPolicy created`);

    // Step 5: Create HPA
    await kubernetesClient.createHPA(customerId, plan);
    console.log(`[ALLOCATOR] ✓ HPA created`);

    // Step 6: Publish event for pod warmer to start pre-warming
    await publishEvent("k8s:resources-allocated", {
      customerId,
      plan,
      namespace,
      timestamp: new Date().toISOString(),
    });

    console.log(`[ALLOCATOR] ✓ All resources allocated successfully`);
  } catch (err) {
    console.error(`[ALLOCATOR] ✗ Resource allocation failed:`, err);

    // Publish error event for rollback
    await publishEvent("error:resource-allocation", {
      customerId,
      plan,
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });

    throw err;
  }
}

/**
 * Deallocate Kubernetes resources for a customer
 * Called when subscription is cancelled
 */
export async function deallocateKubernetesResources(
  customerId: string
): Promise<void> {
  console.log(`[ALLOCATOR] Starting resource deallocation for ${customerId}`);

  try {
    // Initialize Kubernetes client
    kubernetesClient.init();

    // Get current resources (for logging)
    const resources = await kubernetesClient.listCustomerResources(customerId);
    console.log(
      `[ALLOCATOR] Current resources:`,
      JSON.stringify(resources, null, 2)
    );

    // Delete namespace (cascades to all resources within)
    await kubernetesClient.deleteNamespace(customerId);
    console.log(`[ALLOCATOR] ✓ Namespace deleted`);

    // Publish event for cleanup
    await publishEvent("k8s:resources-deallocated", {
      customerId,
      previousResources: resources,
      timestamp: new Date().toISOString(),
    });

    console.log(`[ALLOCATOR] ✓ All resources deallocated successfully`);
  } catch (err) {
    console.error(`[ALLOCATOR] ✗ Resource deallocation failed:`, err);

    // Publish error event
    await publishEvent("error:resource-deallocation", {
      customerId,
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });

    throw err;
  }
}

/**
 * Get current resource usage for a customer
 */
export async function getCustomerResourceUsage(customerId: string): Promise<{
  namespace: string;
  pods: number;
  quota: any;
  utilizationPercent: number;
}> {
  try {
    kubernetesClient.init();

    const resources = await kubernetesClient.listCustomerResources(customerId);

    // Calculate utilization
    const maxPods = resources.quota?.hard?.pods
      ? parseInt(resources.quota.hard.pods)
      : 50;
    const utilizationPercent =
      maxPods > 0 ? (resources.pods / maxPods) * 100 : 0;

    return {
      ...resources,
      utilizationPercent,
    };
  } catch (err) {
    console.error(`[ALLOCATOR] Error getting resource usage:`, err);
    throw err;
  }
}

/**
 * Scale up resources for a customer (upgrade plan)
 */
export async function upgradeCustomerResources(
  customerId: string,
  newPlan: "starter" | "professional" | "enterprise"
): Promise<void> {
  console.log(
    `[ALLOCATOR] Upgrading resources for ${customerId} to ${newPlan}`
  );

  try {
    kubernetesClient.init();

    // Update ResourceQuota
    await kubernetesClient.createResourceQuota(customerId, newPlan);

    // Update HPA
    await kubernetesClient.createHPA(customerId, newPlan);

    // Publish upgrade event
    await publishEvent("k8s:resources-upgraded", {
      customerId,
      newPlan,
      timestamp: new Date().toISOString(),
    });

    console.log(`[ALLOCATOR] ✓ Resources upgraded to ${newPlan}`);
  } catch (err) {
    console.error(`[ALLOCATOR] ✗ Resource upgrade failed:`, err);
    throw err;
  }
}

/**
 * Check health of customer's Kubernetes namespace
 */
export async function checkNamespaceHealth(customerId: string): Promise<{
  healthy: boolean;
  podsRunning: number;
  podsTotal: number;
  quotaStatus: string;
  error?: string;
}> {
  try {
    kubernetesClient.init();

    const resources = await kubernetesClient.listCustomerResources(customerId);

    if (!resources.quota) {
      return {
        healthy: false,
        podsRunning: 0,
        podsTotal: 0,
        quotaStatus: "not-found",
        error: "Namespace or quota not found",
      };
    }

    return {
      healthy: resources.pods > 0,
      podsRunning: resources.pods,
      podsTotal: parseInt(resources.quota.hard?.pods || "0"),
      quotaStatus: "active",
    };
  } catch (err) {
    return {
      healthy: false,
      podsRunning: 0,
      podsTotal: 0,
      quotaStatus: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
