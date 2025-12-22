import {
  KubeConfig,
  AppsV1Api,
  CoreV1Api,
  NetworkingV1Api,
  AutoscalingV2Api,
} from "@kubernetes/client-node";

/**
 * Kubernetes Client Wrapper
 * Handles all K8s operations for customer resource allocation/deallocation
 */

let kubeConfig: KubeConfig | null = null;
let appsApi: AppsV1Api | null = null;
let coreApi: CoreV1Api | null = null;
let networkingApi: NetworkingV1Api | null = null;
let autoscalingApi: AutoscalingV2Api | null = null;

/**
 * Initialize Kubernetes client
 * Can use in-cluster auth or kubeconfig file
 */
export function initializeKubernetesClient() {
  if (kubeConfig) return; // Already initialized

  kubeConfig = new KubeConfig();

  // Try to load from in-cluster first (Pod)
  if (process.env.KUBERNETES_SERVICE_HOST) {
    console.log("[K8S] Loading in-cluster authentication");
    kubeConfig.loadFromCluster();
  } else {
    // Fall back to kubeconfig file (local development)
    console.log("[K8S] Loading kubeconfig from file");
    kubeConfig.loadFromDefault();
  }

  // Initialize API clients
  appsApi = kubeConfig.makeApiClient(AppsV1Api);
  coreApi = kubeConfig.makeApiClient(CoreV1Api);
  networkingApi = kubeConfig.makeApiClient(NetworkingV1Api);
  autoscalingApi = kubeConfig.makeApiClient(AutoscalingV2Api);

  console.log("[K8S] Kubernetes client initialized");
}

/**
 * Get or initialize the Apps API client
 */
function getAppsApi() {
  if (!appsApi) initializeKubernetesClient();
  return appsApi!;
}

/**
 * Get or initialize the Core API client
 */
function getCoreApi() {
  if (!coreApi) initializeKubernetesClient();
  return coreApi!;
}

/**
 * Get or initialize the Networking API client
 */
function getNetworkingApi() {
  if (!networkingApi) initializeKubernetesClient();
  return networkingApi!;
}

/**
 * Get or initialize the Autoscaling API client
 */
function getAutoscalingApi() {
  if (!autoscalingApi) initializeKubernetesClient();
  return autoscalingApi!;
}

/**
 * Create a namespace for a customer
 */
export async function createNamespace(customerId: string): Promise<string> {
  const namespace = `customer-${customerId.substring(0, 8)}`;
  const coreClient = getCoreApi();

  try {
    const namespaceObj = {
      apiVersion: "v1",
      kind: "Namespace",
      metadata: {
        name: namespace,
        labels: {
          app: "ufbrowsers",
          "customer-id": customerId,
          "managed-by": "payment-controller",
        },
      },
    };

    await coreClient.createNamespace(namespaceObj as any);
    console.log(`[K8S] Created namespace: ${namespace}`);
    return namespace;
  } catch (err: any) {
    if (err.response?.statusCode === 409) {
      // Already exists
      console.log(`[K8S] Namespace already exists: ${namespace}`);
      return namespace;
    }
    throw err;
  }
}

/**
 * Create ResourceQuota for a customer
 */
export async function createResourceQuota(
  customerId: string,
  plan: "starter" | "professional" | "enterprise"
): Promise<void> {
  const namespace = `customer-${customerId.substring(0, 8)}`;
  const coreClient = getCoreApi();
  const quotas = getPlanQuotas(plan);

  try {
    const quota = {
      apiVersion: "v1",
      kind: "ResourceQuota",
      metadata: {
        name: `quota-${customerId.substring(0, 8)}`,
        namespace,
      },
      spec: {
        hard: {
          pods: quotas.maxPods.toString(),
          "requests.memory": quotas.maxMemory,
          "requests.cpu": quotas.maxCpu.toString(),
          "limits.memory": (quotas.maxMemory * 1.2).toString(),
          "limits.cpu": (quotas.maxCpu * 1.5).toString(),
        },
      },
    };

    await coreClient.createNamespacedResourceQuota(namespace, quota as any);
    console.log(
      `[K8S] Created ResourceQuota for ${customerId} in namespace ${namespace}`
    );
  } catch (err: any) {
    if (err.response?.statusCode === 409) {
      console.log(`[K8S] ResourceQuota already exists`);
      return;
    }
    throw err;
  }
}

/**
 * Create NetworkPolicy for customer isolation
 */
export async function createNetworkPolicy(customerId: string): Promise<void> {
  const namespace = `customer-${customerId.substring(0, 8)}`;
  const networkingClient = getNetworkingApi();

  try {
    const policy = {
      apiVersion: "networking.k8s.io/v1",
      kind: "NetworkPolicy",
      metadata: {
        name: `netpol-${customerId.substring(0, 8)}`,
        namespace,
      },
      spec: {
        podSelector: {},
        policyTypes: ["Ingress", "Egress"],
        ingress: [
          {
            from: [
              {
                podSelector: {
                  matchLabels: {
                    app: "api-server",
                  },
                },
              },
            ],
          },
        ],
        egress: [
          {
            to: [{ namespaceSelector: {} }],
            ports: [
              { protocol: "TCP", port: 443 }, // HTTPS
              { protocol: "TCP", port: 80 }, // HTTP
              { protocol: "TCP", port: 5432 }, // PostgreSQL
              { protocol: "TCP", port: 3306 }, // MySQL
            ],
          },
        ],
      },
    };

    await networkingClient.createNamespacedNetworkPolicy(
      namespace,
      policy as any
    );
    console.log(`[K8S] Created NetworkPolicy for ${customerId}`);
  } catch (err: any) {
    if (err.response?.statusCode === 409) {
      console.log(`[K8S] NetworkPolicy already exists`);
      return;
    }
    throw err;
  }
}

/**
 * Create HorizontalPodAutoscaler for a customer
 */
export async function createHPA(
  customerId: string,
  plan: "starter" | "professional" | "enterprise"
): Promise<void> {
  const namespace = `customer-${customerId.substring(0, 8)}`;
  const autoscalingClient = getAutoscalingApi();
  const quotas = getPlanQuotas(plan);

  try {
    const hpa = {
      apiVersion: "autoscaling/v2",
      kind: "HorizontalPodAutoscaler",
      metadata: {
        name: `hpa-${customerId.substring(0, 8)}`,
        namespace,
      },
      spec: {
        scaleTargetRef: {
          apiVersion: "apps/v1",
          kind: "Deployment",
          name: "browser-session-pool",
        },
        minReplicas: quotas.minPods,
        maxReplicas: quotas.maxPods,
        metrics: [
          {
            type: "Resource",
            resource: {
              name: "cpu",
              target: {
                type: "Utilization",
                averageUtilization: 70,
              },
            },
          },
          {
            type: "Resource",
            resource: {
              name: "memory",
              target: {
                type: "Utilization",
                averageUtilization: 75,
              },
            },
          },
        ],
        behavior: {
          scaleDown: {
            stabilizationWindowSeconds: 300,
            policies: [
              {
                type: "Percent",
                value: 50,
                periodSeconds: 60,
              },
            ],
          },
          scaleUp: {
            stabilizationWindowSeconds: 30,
            policies: [
              {
                type: "Percent",
                value: 100,
                periodSeconds: 15,
              },
            ],
          },
        },
      },
    };

    await autoscalingClient.createNamespacedHorizontalPodAutoscaler(
      namespace,
      hpa as any
    );
    console.log(`[K8S] Created HPA for ${customerId}`);
  } catch (err: any) {
    if (err.response?.statusCode === 409) {
      console.log(`[K8S] HPA already exists`);
      return;
    }
    throw err;
  }
}

/**
 * Get container info (IP, port, CDP URL)
 */
export async function getContainerInfo(containerId: string): Promise<{
  ip: string;
  port: number;
  cdpUrl: string;
  browserUrl: string;
}> {
  const coreClient = getCoreApi();

  try {
    // In a real implementation, we'd query K8s for the pod details
    // For now, return mock data (integrate with docker/containerd)
    return {
      ip: "127.0.0.1",
      port: 9222,
      cdpUrl: `ws://127.0.0.1:9222`,
      browserUrl: `http://127.0.0.1:9222`,
    };
  } catch (err) {
    console.error("[K8S] Error getting container info:", err);
    throw err;
  }
}

/**
 * Delete namespace and all its resources
 */
export async function deleteNamespace(customerId: string): Promise<void> {
  const namespace = `customer-${customerId.substring(0, 8)}`;
  const coreClient = getCoreApi();

  try {
    await coreClient.deleteNamespace(
      namespace,
      undefined,
      undefined,
      undefined,
      30 // Grace period for graceful shutdown
    );
    console.log(`[K8S] Deleted namespace: ${namespace}`);
  } catch (err: any) {
    if (err.response?.statusCode === 404) {
      console.log(`[K8S] Namespace not found: ${namespace}`);
      return;
    }
    throw err;
  }
}

/**
 * List all namespaces for a customer
 */
export async function listCustomerResources(customerId: string): Promise<{
  namespace: string;
  pods: number;
  quota: any;
}> {
  const namespace = `customer-${customerId.substring(0, 8)}`;
  const coreClient = getCoreApi();

  try {
    const podsResponse = await coreClient.listNamespacedPod(namespace);
    const quotaResponse = await coreClient.listNamespacedResourceQuota(
      namespace
    );

    return {
      namespace,
      pods: podsResponse.items.length,
      quota: quotaResponse.items[0]?.spec || null,
    };
  } catch (err: any) {
    if (err.response?.statusCode === 404) {
      return { namespace, pods: 0, quota: null };
    }
    throw err;
  }
}

/**
 * Get plan quotas
 */
function getPlanQuotas(plan: string): {
  minPods: number;
  maxPods: number;
  maxMemory: string;
  maxCpu: number;
} {
  const quotas = {
    starter: {
      minPods: 1,
      maxPods: 5,
      maxMemory: "640Mi",
      maxCpu: 1,
    },
    professional: {
      minPods: 5,
      maxPods: 50,
      maxMemory: "6.4Gi",
      maxCpu: 10,
    },
    enterprise: {
      minPods: 20,
      maxPods: 500,
      maxMemory: "64Gi",
      maxCpu: 100,
    },
  };

  return quotas[plan as keyof typeof quotas] || quotas.starter;
}

/**
 * Health check - verify cluster connectivity
 */
export async function healthCheck(): Promise<{
  status: "healthy" | "unhealthy";
  clusterName?: string;
  error?: string;
}> {
  try {
    const coreClient = getCoreApi();
    const namespaces = await coreClient.listNamespace();

    return {
      status: "healthy",
      clusterName: kubeConfig?.getCurrentCluster()?.name,
    };
  } catch (err: any) {
    console.error("[K8S] Health check failed:", err.message);
    return {
      status: "unhealthy",
      error: err.message,
    };
  }
}

export const kubernetesClient = {
  init: initializeKubernetesClient,
  createNamespace,
  createResourceQuota,
  createNetworkPolicy,
  createHPA,
  getContainerInfo,
  deleteNamespace,
  listCustomerResources,
  healthCheck,
};
