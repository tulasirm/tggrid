/**
 * License usage tracking
 * Tracks and records usage metrics for billing and monitoring
 */

import { LicenseUsageEvent, UsageMetrics, LicenseTier } from "./types";

export interface UsageTracker {
  organizationId: string;
  tier: LicenseTier;
  events: LicenseUsageEvent[];
  aggregatedMetrics: UsageMetrics;
}

export class LicenseUsageTracker {
  private trackers: Map<string, UsageTracker> = new Map();

  /**
   * Record a usage event
   */
  recordEvent(
    organizationId: string,
    tier: LicenseTier,
    event: Omit<LicenseUsageEvent, "tier" | "organizationId">
  ): void {
    let tracker = this.trackers.get(organizationId);

    if (!tracker) {
      tracker = {
        organizationId,
        tier,
        events: [],
        aggregatedMetrics: this.createEmptyMetrics(),
      };
      this.trackers.set(organizationId, tracker);
    }

    const fullEvent: LicenseUsageEvent = {
      ...event,
      tier,
      organizationId,
    };

    tracker.events.push(fullEvent);
    this.updateAggregatedMetrics(tracker, fullEvent);
  }

  /**
   * Get usage metrics for an organization
   */
  getMetrics(organizationId: string): UsageMetrics | null {
    const tracker = this.trackers.get(organizationId);
    return tracker?.aggregatedMetrics || null;
  }

  /**
   * Get all events for an organization
   */
  getEvents(organizationId: string, limit?: number): LicenseUsageEvent[] {
    const tracker = this.trackers.get(organizationId);
    if (!tracker) return [];

    const events = tracker.events;
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Record session created event
   */
  recordSessionCreated(
    organizationId: string,
    tier: LicenseTier,
    browserType: "chrome" | "firefox",
    region: string
  ): void {
    this.recordEvent(organizationId, tier, {
      type: "session_created",
      timestamp: new Date(),
      metadata: {
        browserType,
        region,
      },
    });
  }

  /**
   * Record session completed event
   */
  recordSessionCompleted(
    organizationId: string,
    tier: LicenseTier,
    duration: number
  ): void {
    this.recordEvent(organizationId, tier, {
      type: "session_completed",
      timestamp: new Date(),
      metadata: {
        duration,
      },
    });
  }

  /**
   * Record browser type usage
   */
  recordBrowserUsage(
    organizationId: string,
    tier: LicenseTier,
    browserType: "chrome" | "firefox"
  ): void {
    this.recordEvent(organizationId, tier, {
      type: "browser_type_used",
      timestamp: new Date(),
      metadata: {
        browserType,
      },
    });
  }

  /**
   * Record region usage
   */
  recordRegionUsage(
    organizationId: string,
    tier: LicenseTier,
    region: string
  ): void {
    this.recordEvent(organizationId, tier, {
      type: "region_used",
      timestamp: new Date(),
      metadata: {
        region,
      },
    });
  }

  /**
   * Record API call
   */
  recordApiCall(
    organizationId: string,
    tier: LicenseTier,
    endpoint: string,
    status: number
  ): void {
    this.recordEvent(organizationId, tier, {
      type: "api_call",
      timestamp: new Date(),
      metadata: {
        endpoint,
        status,
      },
    });
  }

  /**
   * Get summary for a time period
   */
  getSummary(
    organizationId: string,
    daysBack: number = 30
  ): Record<string, any> {
    const events = this.getEvents(organizationId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const filtered = events.filter((e) => e.timestamp >= cutoffDate);

    const summary = {
      totalEvents: filtered.length,
      sessionCreated: 0,
      sessionCompleted: 0,
      browserTypeUsage: { chrome: 0, firefox: 0 },
      regionUsage: {} as Record<string, number>,
      apiCalls: 0,
      timeRange: {
        from: cutoffDate.toISOString(),
        to: new Date().toISOString(),
      },
    };

    for (const event of filtered) {
      switch (event.type) {
        case "session_created":
          summary.sessionCreated++;
          break;
        case "session_completed":
          summary.sessionCompleted++;
          break;
        case "browser_type_used":
          const browserType = event.metadata.browserType as
            | "chrome"
            | "firefox";
          summary.browserTypeUsage[browserType]++;
          break;
        case "region_used":
          const region = event.metadata.region as string;
          summary.regionUsage[region] = (summary.regionUsage[region] || 0) + 1;
          break;
        case "api_call":
          summary.apiCalls++;
          break;
      }
    }

    return summary;
  }

  /**
   * Clear events for an organization (for testing)
   */
  clearEvents(organizationId: string): void {
    this.trackers.delete(organizationId);
  }

  /**
   * Export metrics to Prometheus format
   */
  exportMetrics(): string {
    const lines: string[] = [];

    for (const [orgId, tracker] of this.trackers.entries()) {
      const metrics = tracker.aggregatedMetrics;

      lines.push(`# HELP ufbrowsers_sessions_total Total sessions created`);
      lines.push(`# TYPE ufbrowsers_sessions_total counter`);
      lines.push(
        `ufbrowsers_sessions_total{org="${orgId}",tier="${tracker.tier}"} ${metrics.sessionCount}`
      );

      lines.push(
        `# HELP ufbrowsers_max_concurrent_sessions Max concurrent sessions`
      );
      lines.push(`# TYPE ufbrowsers_max_concurrent_sessions gauge`);
      lines.push(
        `ufbrowsers_max_concurrent_sessions{org="${orgId}",tier="${tracker.tier}"} ${metrics.maxConcurrentSessions}`
      );

      lines.push(`# HELP ufbrowsers_api_calls_total Total API calls`);
      lines.push(`# TYPE ufbrowsers_api_calls_total counter`);
      lines.push(
        `ufbrowsers_api_calls_total{org="${orgId}",tier="${tracker.tier}"} ${metrics.totalApiCalls}`
      );
    }

    return lines.join("\n");
  }

  private updateAggregatedMetrics(
    tracker: UsageTracker,
    event: LicenseUsageEvent
  ): void {
    const metrics = tracker.aggregatedMetrics;

    switch (event.type) {
      case "session_created":
        metrics.sessionCount++;
        break;
      case "browser_type_used":
        const browserType = event.metadata.browserType as "chrome" | "firefox";
        metrics.browserTypeBreakdown[browserType]++;
        break;
      case "region_used":
        const region = event.metadata.region as string;
        metrics.regionUsage[region] = (metrics.regionUsage[region] || 0) + 1;
        break;
      case "api_call":
        metrics.totalApiCalls++;
        break;
    }
  }

  private createEmptyMetrics(): UsageMetrics {
    return {
      period: "monthly",
      sessionCount: 0,
      browserTypeBreakdown: { chrome: 0, firefox: 0 },
      regionUsage: {},
      maxConcurrentSessions: 0,
      totalApiCalls: 0,
      storageUsedGB: 0,
      timestamp: new Date(),
    };
  }
}

// Global instance
export const globalUsageTracker = new LicenseUsageTracker();
