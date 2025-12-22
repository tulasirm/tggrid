import { db } from "./db";

export type Region = "us-east-1" | "us-west-2" | "eu-west-1" | "ap-southeast-1";

interface RegionConfig {
  name: Region;
  displayName: string;
  endpoint: string;
  databaseUrl: string;
  isPrimary: boolean;
  isActive: boolean;
  latency?: number;
}

const REGIONS: Record<Region, RegionConfig> = {
  "us-east-1": {
    name: "us-east-1",
    displayName: "US East (Virginia)",
    endpoint: "https://us-east-1.ufbrowsers.com",
    databaseUrl: process.env.DATABASE_URL_US_EAST || "",
    isPrimary: true,
    isActive: true,
  },
  "us-west-2": {
    name: "us-west-2",
    displayName: "US West (Oregon)",
    endpoint: "https://us-west-2.ufbrowsers.com",
    databaseUrl: process.env.DATABASE_URL_US_WEST || "",
    isPrimary: false,
    isActive: true,
  },
  "eu-west-1": {
    name: "eu-west-1",
    displayName: "EU West (Ireland)",
    endpoint: "https://eu-west-1.ufbrowsers.com",
    databaseUrl: process.env.DATABASE_URL_EU_WEST || "",
    isPrimary: false,
    isActive: true,
  },
  "ap-southeast-1": {
    name: "ap-southeast-1",
    displayName: "Asia Pacific (Singapore)",
    endpoint: "https://ap-southeast-1.ufbrowsers.com",
    databaseUrl: process.env.DATABASE_URL_AP_SOUTHEAST || "",
    isPrimary: false,
    isActive: true,
  },
};

/**
 * Get current region from environment
 */
export function getCurrentRegion(): Region {
  return (process.env.REGION as Region) || "us-east-1";
}

/**
 * Get all available regions
 */
export function getAvailableRegions(): RegionConfig[] {
  return Object.values(REGIONS).filter((region) => region.isActive);
}

/**
 * Get region by name
 */
export function getRegion(name: Region): RegionConfig | undefined {
  return REGIONS[name];
}

/**
 * Get nearest region based on client location
 */
export function getNearestRegion(clientIp: string): Region {
  // In production, use IP geolocation service
  // For now, return primary region
  return getCurrentRegion();
}

/**
 * Check if region is healthy
 */
export async function checkRegionHealth(region: Region): Promise<boolean> {
  try {
    const config = REGIONS[region];
    const response = await fetch(`${config.endpoint}/api/health`, {
      timeout: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get region latency
 */
export async function measureRegionLatency(region: Region): Promise<number> {
  const start = Date.now();
  try {
    const config = REGIONS[region];
    await fetch(`${config.endpoint}/api/health`, { timeout: 3000 });
    return Date.now() - start;
  } catch {
    return 9999; // High latency indicates unreachable
  }
}

/**
 * Find best region for user based on latency
 */
export async function findBestRegion(): Promise<Region> {
  const regions = getAvailableRegions();
  const latencies = await Promise.all(
    regions.map(async (region) => ({
      region: region.name,
      latency: await measureRegionLatency(region.name),
    }))
  );

  const best = latencies.reduce((min, current) =>
    current.latency < min.latency ? current : min
  );

  return best.region;
}

/**
 * Sync data across regions
 */
export async function syncDataAcrossRegions(
  dataType: "session" | "user" | "metric",
  data: any
): Promise<void> {
  const regions = getAvailableRegions().filter((r) => !r.isPrimary);

  await Promise.all(
    regions.map(async (region) => {
      try {
        await fetch(`${region.endpoint}/api/sync/${dataType}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch (error) {
        console.error(`Failed to sync to ${region.name}:`, error);
      }
    })
  );
}

/**
 * Get region statistics
 */
export async function getRegionStats(region: Region) {
  try {
    const config = REGIONS[region];

    // Get session count for region
    const sessions = await db.browserSession.count({
      where: { region },
    });

    // Get active sessions
    const activeSessions = await db.browserSession.count({
      where: {
        region,
        status: "running",
      },
    });

    const healthy = await checkRegionHealth(region);
    const latency = await measureRegionLatency(region);

    return {
      region,
      displayName: config.displayName,
      endpoint: config.endpoint,
      isPrimary: config.isPrimary,
      isHealthy: healthy,
      latency,
      totalSessions: sessions,
      activeSessions,
    };
  } catch (error) {
    console.error(`Failed to get stats for ${region}:`, error);
    return null;
  }
}
