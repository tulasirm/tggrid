/**
 * Cost Analysis & Pricing Model
 *
 * Cloud Infrastructure Cost Calculation for UFBrowsers
 * Based on Alpine Linux containers with 128MB RAM and 0.25 CPU per session
 */

// ============================================================================
// CLOUD INFRASTRUCTURE COSTS (AWS/GCP/Azure Average)
// ============================================================================

interface InfrastructureCosts {
  cpuCostPerHour: number; // $/vCPU-hour
  memoryCostPerHour: number; // $/GB-hour
  networkCostPerGB: number; // $/GB bandwidth
  storageCostPerGB: number; // $/GB-month
  containerOverhead: number; // Percentage overhead (orchestration, monitoring)
}

// Current market rates (2024-2025)
export const INFRASTRUCTURE_COSTS: InfrastructureCosts = {
  cpuCostPerHour: 0.0265, // AWS t3.medium: ~$0.0265/hour for 1 vCPU
  memoryCostPerHour: 0.0075, // AWS: ~$0.0075/hour per GB
  networkCostPerGB: 0.12, // AWS: $0.12/GB for data out
  storageCostPerGB: 0.023, // AWS: $0.023/GB-month (container images)
  containerOverhead: 0.15, // 15% for orchestration, monitoring, networking
};

// ============================================================================
// PER-SESSION RESOURCE REQUIREMENTS
// ============================================================================

interface SessionResources {
  cpuCores: number; // Number of vCPU cores
  memoryGB: number; // Memory in GB
  sessionDurationMinutes: number; // Average session duration
  dataTransferGB: number; // Average data transfer per session
}

// Alpine-based Chrome/Firefox containers (ultra-light)
export const SESSION_RESOURCES: SessionResources = {
  cpuCores: 0.25, // 1/4 CPU core
  memoryGB: 0.128, // 128 MB RAM
  sessionDurationMinutes: 5, // Average session duration
  dataTransferGB: 0.01, // 10 MB average per session
};

// ============================================================================
// COST CALCULATION FUNCTIONS
// ============================================================================

export interface SessionCostBreakdown {
  computeCost: number; // CPU cost
  memoryCost: number; // RAM cost
  networkCost: number; // Bandwidth cost
  overheadCost: number; // Infrastructure overhead
  totalInfrastructureCost: number; // Total infrastructure cost per session
  marginPercentage: number; // Target margin %
  pricePerSession: number; // Recommended customer price
  profitPerSession: number; // Profit per session
}

/**
 * Calculate the infrastructure cost for a single session
 */
export function calculateSessionCost(
  costs: InfrastructureCosts = INFRASTRUCTURE_COSTS,
  resources: SessionResources = SESSION_RESOURCES,
  targetMarginPercentage: number = 50
): SessionCostBreakdown {
  // Convert session duration to hours
  const sessionDurationHours = resources.sessionDurationMinutes / 60;

  // Calculate component costs
  const computeCost =
    resources.cpuCores * costs.cpuCostPerHour * sessionDurationHours;
  const memoryCost =
    resources.memoryGB * costs.memoryCostPerHour * sessionDurationHours;
  const networkCost = resources.dataTransferGB * costs.networkCostPerGB;

  // Calculate base infrastructure cost
  const baseInfrastructureCost = computeCost + memoryCost + networkCost;

  // Add overhead (orchestration, monitoring, logging, storage, etc)
  const overheadCost = baseInfrastructureCost * costs.containerOverhead;

  // Total infrastructure cost
  const totalInfrastructureCost = baseInfrastructureCost + overheadCost;

  // Calculate price with margin
  // If we want 50% margin: Profit = Cost, Price = Cost * 2
  // Price = Cost / (1 - marginPercentage/100)
  const marginDecimal = targetMarginPercentage / 100;
  const pricePerSession = totalInfrastructureCost / (1 - marginDecimal);
  const profitPerSession = pricePerSession - totalInfrastructureCost;

  return {
    computeCost,
    memoryCost,
    networkCost,
    overheadCost,
    totalInfrastructureCost,
    marginPercentage: targetMarginPercentage,
    pricePerSession,
    profitPerSession,
  };
}

/**
 * Calculate monthly costs for a tier
 */
export interface TierCostAnalysis {
  tierName: string;
  monthlySessionLimit: number;
  monthlyPrice: number;
  infrastructureCostPerSession: number;
  revenuePerSession: number;
  profitPerSession: number;
  estimatedMonthlyInfrastructureCost: number;
  estimatedMonthlyRevenue: number;
  estimatedMonthlyProfit: number;
  profitMarginPercentage: number;
  breakEvenSessions: number;
}

export function calculateTierCosts(
  tierName: string,
  monthlySessionLimit: number,
  monthlyPrice: number
): TierCostAnalysis {
  const sessionCostBreakdown = calculateSessionCost();
  const infrastructureCostPerSession =
    sessionCostBreakdown.totalInfrastructureCost;
  const revenuePerSession = monthlyPrice / monthlySessionLimit;
  const profitPerSession = revenuePerSession - infrastructureCostPerSession;

  const estimatedMonthlyInfrastructureCost =
    infrastructureCostPerSession * monthlySessionLimit;
  const estimatedMonthlyRevenue = monthlyPrice;
  const estimatedMonthlyProfit =
    estimatedMonthlyRevenue - estimatedMonthlyInfrastructureCost;

  const profitMarginPercentage =
    monthlySessionLimit > 0
      ? (estimatedMonthlyProfit / estimatedMonthlyRevenue) * 100
      : 0;

  // Calculate break-even sessions
  const breakEvenSessions = monthlyPrice / infrastructureCostPerSession;

  return {
    tierName,
    monthlySessionLimit,
    monthlyPrice,
    infrastructureCostPerSession,
    revenuePerSession,
    profitPerSession,
    estimatedMonthlyInfrastructureCost,
    estimatedMonthlyRevenue,
    estimatedMonthlyProfit,
    profitMarginPercentage,
    breakEvenSessions,
  };
}

// ============================================================================
// PRICING RECOMMENDATIONS
// ============================================================================

export function generatePricingRecommendations() {
  const sessionCost = calculateSessionCost();

  // Starter tier: Loss leader (break-even or slight loss)
  const starterMonthly = 0;
  const starterSessions = 10;
  const starterAnalysis = calculateTierCosts(
    "Starter",
    starterSessions,
    starterMonthly
  );

  // Professional tier: Target 50% margin on 10,000 sessions/month
  const professionalSessions = 10000;
  const priceFor50Percent = sessionCost.pricePerSession * professionalSessions;
  const professionalAnalysis = calculateTierCosts(
    "Professional",
    professionalSessions,
    priceFor50Percent
  );

  // Enterprise tier: Premium pricing (3x Professional base, volume discount)
  const enterpriseSessions = 100000; // Assume 100k sessions for calculation
  const enterprisePricePerSession = sessionCost.pricePerSession * 0.8; // 20% volume discount
  const enterpriseMonthly = enterprisePricePerSession * enterpriseSessions;
  const enterpriseAnalysis = calculateTierCosts(
    "Enterprise",
    enterpriseSessions,
    enterpriseMonthly
  );

  return {
    sessionCost,
    starterAnalysis,
    professionalAnalysis,
    enterpriseAnalysis,
  };
}

// ============================================================================
// DETAILED COST BREAKDOWN FOR DOCUMENTATION
// ============================================================================

export function generateCostReport(): string {
  const recommendations = generatePricingRecommendations();
  const sessionCost = recommendations.sessionCost;

  let report = `
╔════════════════════════════════════════════════════════════════════════╗
║          UFBrowsers - Cloud Infrastructure Cost Analysis              ║
║                    with 50% Profit Margin Target                      ║
╚════════════════════════════════════════════════════════════════════════╝

📊 PER-SESSION COST BREAKDOWN
────────────────────────────────────────────────────────────────────────

Container Specifications:
  • CPU: 0.25 vCPU cores (shared)
  • Memory: 128 MB RAM
  • Duration: 5 minutes average
  • Data Transfer: 10 MB per session

Cost Components:
  • Compute (CPU):    $${sessionCost.computeCost.toFixed(6)}
  • Memory (RAM):     $${sessionCost.memoryCost.toFixed(6)}
  • Network (10MB):   $${sessionCost.networkCost.toFixed(6)}
  • Overhead (15%):   $${sessionCost.overheadCost.toFixed(6)}
  ─────────────────────────────
  TOTAL INFRASTRUCTURE: $${sessionCost.totalInfrastructureCost.toFixed(6)}
  
With 50% Profit Margin:
  • Price per Session: $${sessionCost.pricePerSession.toFixed(6)}
  • Profit per Session: $${sessionCost.profitPerSession.toFixed(6)}

💰 TIER PRICING RECOMMENDATIONS
────────────────────────────────────────────────────────────────────────
`;

  const tiers = [
    recommendations.starterAnalysis,
    recommendations.professionalAnalysis,
  ];

  for (const tier of tiers) {
    report += `
${tier.tierName.toUpperCase()} TIER
──────────────────────────────────────────────────────────────
  Monthly Price: ${
    tier.monthlyPrice === 0 ? "Free" : "$" + tier.monthlyPrice.toFixed(2)
  }
  Max Sessions/Month: ${tier.monthlySessionLimit.toLocaleString()}
  
  Economics:
    • Infra Cost/Session: $${tier.infrastructureCostPerSession.toFixed(6)}
    • Revenue/Session: $${tier.revenuePerSession.toFixed(6)}
    • Profit/Session: $${tier.profitPerSession.toFixed(6)}
    
  Monthly Economics:
    • Infrastructure Cost: $${tier.estimatedMonthlyInfrastructureCost.toFixed(
      2
    )}
    • Revenue: ${
      tier.monthlyPrice === 0 ? "Free" : "$" + tier.monthlyPrice.toFixed(2)
    }
    • Profit/Loss: $${tier.estimatedMonthlyProfit.toFixed(2)}
    • Margin: ${tier.profitMarginPercentage.toFixed(1)}%
    
  Break-Even Analysis:
    • Break-even sessions: ${Math.ceil(tier.breakEvenSessions).toLocaleString()}
`;
  }

  return report;
}

// ============================================================================
// EXPORT FOR USAGE
// ============================================================================

// Example usage:
// const cost = calculateSessionCost();
// console.log('Cost per session:', cost.totalInfrastructureCost);
// console.log('Price per session (50% margin):', cost.pricePerSession);
//
// const tierAnalysis = calculateTierCosts('Professional', 10000, 99);
// console.log('Margin:', tierAnalysis.profitMarginPercentage);
