import { db } from "./db";
import Docker from "dockerode";

const docker = new Docker();

interface AutoScalingConfig {
  enabled: boolean;
  minPoolSize: number;
  maxPoolSize: number;
  scaleUpThreshold: number; // percentage
  scaleDownThreshold: number; // percentage
  cooldownPeriod: number; // seconds
}

class AutoScaler {
  private config: AutoScalingConfig = {
    enabled: false,
    minPoolSize: 5,
    maxPoolSize: 50,
    scaleUpThreshold: 80,
    scaleDownThreshold: 30,
    cooldownPeriod: 300, // 5 minutes
  };

  private lastScaleTime: Date | null = null;
  private currentPoolSize = 0;

  constructor() {
    this.loadConfiguration();
  }

  async loadConfiguration() {
    try {
      const config = await db.systemConfiguration.findFirst();
      if (config) {
        this.config.enabled = config.autoScaling || false;
        this.config.minPoolSize = config.minPoolSize || 5;
        this.config.maxPoolSize = config.maxPoolSize || 50;
      }
    } catch (error) {
      console.error("Failed to load auto-scaling config:", error);
    }
  }

  /**
   * Check if scaling action is needed and perform it
   */
  async evaluate(): Promise<{
    action: "scale-up" | "scale-down" | "none";
    currentSize: number;
    targetSize: number;
    reason: string;
  }> {
    if (!this.config.enabled) {
      return {
        action: "none",
        currentSize: this.currentPoolSize,
        targetSize: this.currentPoolSize,
        reason: "Auto-scaling is disabled",
      };
    }

    // Check cooldown period
    if (this.lastScaleTime) {
      const timeSinceLastScale =
        (Date.now() - this.lastScaleTime.getTime()) / 1000;
      if (timeSinceLastScale < this.config.cooldownPeriod) {
        return {
          action: "none",
          currentSize: this.currentPoolSize,
          targetSize: this.currentPoolSize,
          reason: `In cooldown period (${Math.floor(timeSinceLastScale)}s / ${
            this.config.cooldownPeriod
          }s)`,
        };
      }
    }

    // Get current metrics
    const metrics = await this.getPoolMetrics();
    const utilization = (metrics.activeSessions / metrics.totalCapacity) * 100;

    // Determine scaling action
    if (
      utilization >= this.config.scaleUpThreshold &&
      this.currentPoolSize < this.config.maxPoolSize
    ) {
      const targetSize = Math.min(
        this.currentPoolSize + Math.ceil(this.currentPoolSize * 0.2), // Scale up by 20%
        this.config.maxPoolSize
      );

      await this.scaleUp(targetSize - this.currentPoolSize);

      return {
        action: "scale-up",
        currentSize: this.currentPoolSize,
        targetSize,
        reason: `Utilization ${utilization.toFixed(1)}% >= ${
          this.config.scaleUpThreshold
        }%`,
      };
    }

    if (
      utilization <= this.config.scaleDownThreshold &&
      this.currentPoolSize > this.config.minPoolSize
    ) {
      const targetSize = Math.max(
        this.currentPoolSize - Math.ceil(this.currentPoolSize * 0.2), // Scale down by 20%
        this.config.minPoolSize
      );

      await this.scaleDown(this.currentPoolSize - targetSize);

      return {
        action: "scale-down",
        currentSize: this.currentPoolSize,
        targetSize,
        reason: `Utilization ${utilization.toFixed(1)}% <= ${
          this.config.scaleDownThreshold
        }%`,
      };
    }

    return {
      action: "none",
      currentSize: this.currentPoolSize,
      targetSize: this.currentPoolSize,
      reason: `Utilization ${utilization.toFixed(1)}% is within normal range`,
    };
  }

  /**
   * Get pool metrics for scaling decisions
   */
  private async getPoolMetrics(): Promise<{
    totalCapacity: number;
    activeSessions: number;
    availableCapacity: number;
  }> {
    try {
      // Count active sessions
      const activeSessions = await db.browserSession.count({
        where: {
          status: "running",
        },
      });

      // Get container count
      const containers = await docker.listContainers({
        filters: {
          label: ["app=ufbrowsers-browser"],
        },
      });

      this.currentPoolSize = containers.length;

      return {
        totalCapacity: this.currentPoolSize,
        activeSessions,
        availableCapacity: Math.max(0, this.currentPoolSize - activeSessions),
      };
    } catch (error) {
      console.error("Failed to get pool metrics:", error);
      return {
        totalCapacity: this.currentPoolSize,
        activeSessions: 0,
        availableCapacity: this.currentPoolSize,
      };
    }
  }

  /**
   * Scale up the pool
   */
  private async scaleUp(count: number): Promise<void> {
    console.log(`⬆️  Scaling up by ${count} containers...`);

    try {
      // Create new containers
      // In production, this would communicate with browser-pool service
      this.currentPoolSize += count;
      this.lastScaleTime = new Date();

      console.log(`✅ Scaled up to ${this.currentPoolSize} containers`);
    } catch (error) {
      console.error("Scale up failed:", error);
    }
  }

  /**
   * Scale down the pool
   */
  private async scaleDown(count: number): Promise<void> {
    console.log(`⬇️  Scaling down by ${count} containers...`);

    try {
      // Remove idle containers
      // In production, this would communicate with browser-pool service
      this.currentPoolSize = Math.max(
        this.config.minPoolSize,
        this.currentPoolSize - count
      );
      this.lastScaleTime = new Date();

      console.log(`✅ Scaled down to ${this.currentPoolSize} containers`);
    } catch (error) {
      console.error("Scale down failed:", error);
    }
  }

  /**
   * Update auto-scaling configuration
   */
  async updateConfig(config: Partial<AutoScalingConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    try {
      const dbConfig = await db.systemConfiguration.findFirst();
      if (dbConfig) {
        await db.systemConfiguration.update({
          where: { id: dbConfig.id },
          data: {
            autoScaling: this.config.enabled,
            minPoolSize: this.config.minPoolSize,
            maxPoolSize: this.config.maxPoolSize,
          },
        });
      }
    } catch (error) {
      console.error("Failed to save auto-scaling config:", error);
    }
  }

  /**
   * Get current auto-scaling status
   */
  getStatus() {
    return {
      ...this.config,
      currentPoolSize: this.currentPoolSize,
      lastScaleTime: this.lastScaleTime,
    };
  }
}

// Singleton instance
export const autoScaler = new AutoScaler();

// Start periodic evaluation
setInterval(async () => {
  const result = await autoScaler.evaluate();
  if (result.action !== "none") {
    console.log(`🔄 Auto-scaling: ${result.action} - ${result.reason}`);
  }
}, 60000); // Every 60 seconds
