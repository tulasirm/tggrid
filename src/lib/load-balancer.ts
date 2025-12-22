import { db } from "./db";

export type LoadBalancerAlgorithm =
  | "round-robin"
  | "least-connections"
  | "resource-based";

interface BrowserNode {
  id: string;
  host: string;
  port: number;
  isHealthy: boolean;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
  lastHealthCheck: Date;
}

class LoadBalancer {
  private nodes: Map<string, BrowserNode> = new Map();
  private currentIndex = 0;
  private algorithm: LoadBalancerAlgorithm = "round-robin";

  constructor() {
    this.loadConfiguration();
  }

  async loadConfiguration() {
    try {
      const config = await db.loadBalancerConfig.findFirst();
      if (config) {
        this.algorithm = config.algorithm as LoadBalancerAlgorithm;
      }
    } catch (error) {
      console.error("Failed to load load balancer config:", error);
    }
  }

  /**
   * Add a browser pool node
   */
  addNode(node: Omit<BrowserNode, "lastHealthCheck">): void {
    this.nodes.set(node.id, {
      ...node,
      lastHealthCheck: new Date(),
    });
    console.log(`✅ Added node: ${node.id} (${node.host}:${node.port})`);
  }

  /**
   * Remove a browser pool node
   */
  removeNode(nodeId: string): boolean {
    const removed = this.nodes.delete(nodeId);
    if (removed) {
      console.log(`🗑️  Removed node: ${nodeId}`);
    }
    return removed;
  }

  /**
   * Update node health status
   */
  updateNodeHealth(
    nodeId: string,
    isHealthy: boolean,
    metrics?: {
      cpuUsage?: number;
      memoryUsage?: number;
      activeConnections?: number;
    }
  ): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isHealthy = isHealthy;
      node.lastHealthCheck = new Date();

      if (metrics) {
        if (metrics.cpuUsage !== undefined) node.cpuUsage = metrics.cpuUsage;
        if (metrics.memoryUsage !== undefined)
          node.memoryUsage = metrics.memoryUsage;
        if (metrics.activeConnections !== undefined) {
          node.activeConnections = metrics.activeConnections;
        }
      }
    }
  }

  /**
   * Get next node using configured algorithm
   */
  getNextNode(): BrowserNode | null {
    const healthyNodes = Array.from(this.nodes.values()).filter(
      (node) => node.isHealthy
    );

    if (healthyNodes.length === 0) {
      console.warn("⚠️  No healthy nodes available");
      return null;
    }

    switch (this.algorithm) {
      case "round-robin":
        return this.getRoundRobinNode(healthyNodes);

      case "least-connections":
        return this.getLeastConnectionsNode(healthyNodes);

      case "resource-based":
        return this.getResourceBasedNode(healthyNodes);

      default:
        return this.getRoundRobinNode(healthyNodes);
    }
  }

  /**
   * Round-robin algorithm
   */
  private getRoundRobinNode(nodes: BrowserNode[]): BrowserNode {
    const node = nodes[this.currentIndex % nodes.length];
    this.currentIndex = (this.currentIndex + 1) % nodes.length;
    return node;
  }

  /**
   * Least connections algorithm
   */
  private getLeastConnectionsNode(nodes: BrowserNode[]): BrowserNode {
    return nodes.reduce((min, node) =>
      node.activeConnections < min.activeConnections ? node : min
    );
  }

  /**
   * Resource-based algorithm (considers CPU and memory)
   */
  private getResourceBasedNode(nodes: BrowserNode[]): BrowserNode {
    // Calculate resource score (lower is better)
    const nodesWithScore = nodes.map((node) => ({
      node,
      score:
        node.cpuUsage * 0.5 +
        node.memoryUsage * 0.3 +
        node.activeConnections * 0.2,
    }));

    return nodesWithScore.reduce((min, current) =>
      current.score < min.score ? current : min
    ).node;
  }

  /**
   * Set load balancing algorithm
   */
  async setAlgorithm(algorithm: LoadBalancerAlgorithm): Promise<void> {
    this.algorithm = algorithm;

    // Update in database
    try {
      const config = await db.loadBalancerConfig.findFirst();
      if (config) {
        await db.loadBalancerConfig.update({
          where: { id: config.id },
          data: { algorithm },
        });
      } else {
        await db.loadBalancerConfig.create({
          data: {
            algorithm,
            healthCheckInterval: 30,
            healthCheckTimeout: 5,
          },
        });
      }
      console.log(`🔄 Load balancer algorithm set to: ${algorithm}`);
    } catch (error) {
      console.error("Failed to save load balancer config:", error);
    }
  }

  /**
   * Get load balancer statistics
   */
  getStats() {
    const nodes = Array.from(this.nodes.values());
    const healthyNodes = nodes.filter((node) => node.isHealthy);

    return {
      algorithm: this.algorithm,
      totalNodes: nodes.length,
      healthyNodes: healthyNodes.length,
      unhealthyNodes: nodes.length - healthyNodes.length,
      totalConnections: nodes.reduce(
        (sum, node) => sum + node.activeConnections,
        0
      ),
      avgCpuUsage:
        nodes.reduce((sum, node) => sum + node.cpuUsage, 0) / nodes.length || 0,
      avgMemoryUsage:
        nodes.reduce((sum, node) => sum + node.memoryUsage, 0) / nodes.length ||
        0,
      nodes: nodes.map((node) => ({
        id: node.id,
        host: node.host,
        port: node.port,
        isHealthy: node.isHealthy,
        activeConnections: node.activeConnections,
        cpuUsage: node.cpuUsage,
        memoryUsage: node.memoryUsage,
        lastHealthCheck: node.lastHealthCheck,
      })),
    };
  }

  /**
   * Health check all nodes
   */
  async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.nodes.values()).map(async (node) => {
      try {
        const response = await fetch(
          `http://${node.host}:${node.port}/health`,
          {
            timeout: 5000,
          }
        );

        if (response.ok) {
          const data = await response.json();
          this.updateNodeHealth(node.id, true, {
            cpuUsage: data.cpuUsage || 0,
            memoryUsage: data.memoryUsage || 0,
            activeConnections: data.activeConnections || 0,
          });
        } else {
          this.updateNodeHealth(node.id, false);
        }
      } catch (error) {
        this.updateNodeHealth(node.id, false);
        console.error(`Health check failed for node ${node.id}:`, error);
      }
    });

    await Promise.all(promises);
  }
}

// Singleton instance
export const loadBalancer = new LoadBalancer();

// Start periodic health checks
setInterval(() => {
  loadBalancer.performHealthChecks();
}, 30000); // Every 30 seconds
