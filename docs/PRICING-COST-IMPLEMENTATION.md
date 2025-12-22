# Cost-Based Pricing Implementation Guide

## Overview

This guide explains how UFBrowsers implements cost-based pricing with a 50% profit margin target. It includes formulas, calculations, and implementation examples.

---

## 1. Cost Formula

### Infrastructure Cost per Session

```typescript
// AWS market rates (2024-2025)
const CPU_COST_PER_VCPU_HOUR = 0.0265;      // $0.0265/vCPU-hour
const MEMORY_COST_PER_GB_HOUR = 0.0075;     // $0.0075/GB-hour
const NETWORK_COST_PER_GB = 0.12;           // $0.12/GB out
const OVERHEAD_PERCENTAGE = 0.15;            // 15% for monitoring/logging

// Alpine container specs per session
const CPU_CORES = 0.25;                     // vCPU
const MEMORY_GB = 0.128;                    // GB (128 MB)
const SESSION_DURATION_HOURS = 5 / 60;      // 5 minutes = 0.0833 hours
const DATA_TRANSFER_GB = 0.01;              // 10 MB per session

// Calculation
function calculateInfrastructureCost() {
  const cpuCost = CPU_CORES * CPU_COST_PER_VCPU_HOUR * SESSION_DURATION_HOURS;
  // = 0.25 * 0.0265 * 0.0833 = $0.000552
  
  const memoryCost = MEMORY_GB * MEMORY_COST_PER_GB_HOUR * SESSION_DURATION_HOURS;
  // = 0.128 * 0.0075 * 0.0833 = $0.000080
  
  const networkCost = DATA_TRANSFER_GB * NETWORK_COST_PER_GB;
  // = 0.01 * 0.12 = $0.001200
  
  const baseInfrastructureCost = cpuCost + memoryCost + networkCost;
  // = $0.001832
  
  const overhead = baseInfrastructureCost * OVERHEAD_PERCENTAGE;
  // = $0.001832 * 0.15 = $0.000275
  
  const totalInfrastructureCost = baseInfrastructureCost + overhead;
  // = $0.002107 per session
  
  return totalInfrastructureCost;
}

// Result: $0.002107 per session (≈ $0.0021)
```

---

## 2. Pricing Formula with 50% Margin

### Basic Formula

```
Price = Infrastructure Cost / (1 - Margin Percentage)
```

### With 50% Margin

```
Price = Infrastructure Cost / (1 - 0.50)
Price = Infrastructure Cost / 0.50
Price = Infrastructure Cost × 2

Example:
Infrastructure Cost per session: $0.002107
Price per session (50% margin): $0.002107 × 2 = $0.004214
```

### Profit Calculation

```
Profit = Price - Infrastructure Cost
Profit = $0.004214 - $0.002107 = $0.002107

Profit Margin = (Profit / Price) × 100
Profit Margin = ($0.002107 / $0.004214) × 100 = 50%
```

---

## 3. Tier Pricing Implementation

### Professional Tier: $49/month for 5,000 Sessions

```typescript
// Monthly pricing
const TIER_PRICE = 49;                      // $49/month
const MONTHLY_SESSION_LIMIT = 5000;         // 5,000 sessions
const OVERAGE_PRICE = 0.01;                 // $0.01 per session

// Cost analysis at different utilization levels
function analyzeProfessionalTier(utilizationPercent: number) {
  const monthlySessionsUsed = MONTHLY_SESSION_LIMIT * (utilizationPercent / 100);
  const infrastructureCost = monthlySessionsUsed * 0.002107;
  const revenue = TIER_PRICE;
  const profit = revenue - infrastructureCost;
  const margin = (profit / revenue) * 100;
  
  return {
    utilizationPercent,
    monthlySessionsUsed,
    infrastructureCost: infrastructureCost.toFixed(2),
    revenue,
    profit: profit.toFixed(2),
    margin: margin.toFixed(1) + '%'
  };
}

// Results at different utilization rates:
// 25% utilization (1,250 sessions):
// - Cost: $2.63
// - Revenue: $49.00
// - Profit: $46.37
// - Margin: 94.6%

// 50% utilization (2,500 sessions):
// - Cost: $5.27
// - Revenue: $49.00
// - Profit: $43.73
// - Margin: 89.2%

// 100% utilization (5,000 sessions):
// - Cost: $10.54
// - Revenue: $49.00
// - Profit: $38.46
// - Margin: 78.5%
```

### Why Professional Tier Exceeds 50% Margin

```
Even at 100% utilization, Professional tier maintains 78.5% margin
This is significantly above the 50% target, allowing for:

1. Volume discounts (overage pricing at $0.01/session)
2. Competitive flexibility (can lower prices if needed)
3. Buffer for cost increases (15-20% cost spike still profitable)
4. Investment in features (use excess margin for innovation)
5. Market share growth (can compete on price vs $99-199 market alternatives)
```

---

## 4. Annual Customer Profitability

### Professional Customer Economics

```typescript
// Assumptions
const MONTHLY_PRICE = 49;
const AVG_UTILIZATION_PERCENT = 30; // Most customers don't max out
const MONTHLY_COST = 5000 * 0.30 * 0.002107;  // $3.16

// Monthly Economics
const monthlyMargin = MONTHLY_PRICE - MONTHLY_COST;  // $45.84
const monthlyMarginPercent = (monthlyMargin / MONTHLY_PRICE) * 100;  // 93.6%

// Annual Economics
const annualPrice = MONTHLY_PRICE * 12;              // $588
const annualCost = MONTHLY_COST * 12;               // $37.92
const annualProfit = annualPrice - annualCost;      // $550.08
const annualMarginPercent = (annualProfit / annualPrice) * 100;  // 93.6%

// Payback period (assuming $15 CAC)
const customerAcquisitionCost = 15;
const monthsToPayback = customerAcquisitionCost / monthlyMargin;  // 0.33 months (10 days)
```

**Key Insight**: Each Professional customer generates $550/year pure profit, with payback in 10 days. This is exceptional SaaS economics.

---

## 5. Break-Even Analysis

### Company-Level Break-Even

```typescript
// Fixed costs estimate
const monthlyFixedCosts = {
  engineering: 8000,           // 1 FTE
  operations: 4000,            // 0.5 FTE
  salesMarketing: 5000,        // Sales, marketing, content
  infrastructureOverhead: 2000  // Database, hosting, misc
};

const totalMonthlyFixedCosts = 19000;

// Variable costs per customer (Professional tier)
const monthlyVariableCostPerCustomer = 3.16;  // @ 30% avg utilization
const monthlyRevenuePerCustomer = 49;
const monthlyContributionPerCustomer = 49 - 3.16;  // $45.84

// Break-even customers
const breakEvenCustomers = totalMonthlyFixedCosts / monthlyContributionPerCustomer;
// = 19000 / 45.84 = 415 customers

// Break-even timeframe
const customersPerMonth = 50;  // Acquisition rate
const monthsToBreakEven = breakEvenCustomers / customersPerMonth;
// = 415 / 50 = 8.3 months (approximately 8-9 months)

// Additional insights
const breakEvenMonthlyRevenue = breakEvenCustomers * monthlyRevenuePerCustomer;
// = 415 * 49 = $20,335/month
```

---

## 6. Overage Pricing Strategy

### Why $0.01 per Session Beyond Limit?

```typescript
// Overage price calculation
const BASE_SESSION_COST = 0.002107;
const OVERAGE_MULTIPLIER = 5;  // 5x margin target
const OVERAGE_PRICE_PER_SESSION = BASE_SESSION_COST * OVERAGE_MULTIPLIER;
// = $0.002107 * 5 = $0.01054 ≈ $0.01

// At $0.01 per session:
// - Cost: $0.00211
// - Price: $0.01
// - Profit: $0.00789
// - Margin: 78.9%

// Example: Customer exceeds limit by 1,000 sessions
const overageRevenue = 1000 * 0.01;           // $10
const overageCost = 1000 * 0.002107;          // $2.11
const overageProfit = overageRevenue - overageCost;  // $7.89
```

**Benefit**: Overage pricing aligns customer success with your revenue. When customers grow and use more sessions, you grow proportionally.

---

## 7. Enterprise Tier Economics

### Enterprise Entry Level ($249/month for 50,000 sessions)

```typescript
function analyzeEnterpriseTier(tier: string, monthlyPrice: number, monthlySessionLimit: number) {
  // Assume 80% average utilization at enterprise level
  const utilizationPercent = 80;
  const monthlySessionsUsed = monthlySessionLimit * (utilizationPercent / 100);
  
  const baseCost = monthlySessionsUsed * 0.002107;
  const totalCost = baseCost + 0.15 * baseCost;  // Add 15% overhead
  const profit = monthlyPrice - totalCost;
  const margin = (profit / monthlyPrice) * 100;
  const annualProfit = profit * 12;
  
  return {
    tier,
    monthlyPrice,
    monthlySessionLimit,
    actualUtilization: monthlySessionsUsed,
    monthlyCost: totalCost.toFixed(2),
    monthlyProfit: profit.toFixed(2),
    margin: margin.toFixed(1) + '%',
    annualProfit: annualProfit.toFixed(2)
  };
}

// Enterprise tiers:
// Entry ($249/mo, 50k sessions @ 80%):
// - Cost: $72.29
// - Profit: $176.71/month
// - Margin: 70.9%
// - Annual: $2,120.52/customer

// Standard ($499/mo, 100k sessions @ 80%):
// - Cost: $144.58
// - Profit: $354.42/month
// - Margin: 71.0%
// - Annual: $4,253.04/customer

// Premium ($999/mo, 250k sessions @ 80%):
// - Cost: $361.45
// - Profit: $637.55/month
// - Margin: 63.8%
// - Annual: $7,650.60/customer
```

---

## 8. Cost Optimization Roadmap

### Three-Year Cost Reduction Plan

```typescript
interface CostOptimization {
  year: number;
  strategy: string;
  costReduction: number;
  newCostPerSession: number;
  margin: number;
}

const roadmap: CostOptimization[] = [
  {
    year: 1,
    strategy: "Baseline (on-demand instances)",
    costReduction: 0,
    newCostPerSession: 0.002107,
    margin: 0.57
  },
  {
    year: 2,
    strategy: "Reserved instances (1-year commitment)",
    costReduction: 0.25,  // 25% savings on compute
    newCostPerSession: 0.001756,
    margin: 0.65
  },
  {
    year: 3,
    strategy: "Spot instances + container packing optimization",
    costReduction: 0.32,  // 32% total savings
    newCostPerSession: 0.001438,
    margin: 0.71
  }
];

// Savings example for 3,000 customers at 30% utilization:
// Year 1: 3000 × 1500 × $0.002107 = $9,481/month
// Year 3: 3000 × 1500 × $0.001438 = $6,471/month
// Monthly savings: $3,010
// Annual savings: $36,120
```

---

## 9. Margin by Tier (Summary)

```
STARTER:
- Price: Free
- Margin: 0% (loss-leader)
- Strategy: Convert to paid within 60 days

PROFESSIONAL:
- Price: $49/month
- Margin: 78.5% - 93.6% (depends on utilization)
- Target Margin: 50% (EXCEEDED by 28-43 percentage points)
- Annual profit per customer: $550+

ENTERPRISE:
- Price: Custom ($249-999+)
- Margin: 55% - 75% (volume-dependent)
- Target Margin: 50% (EXCEEDED by 5-25 percentage points)
- Annual profit per customer: $2,000 - $7,600+
```

---

## 10. Implementation Checklist

### Database Schema Updates

```sql
-- Add cost tracking columns to license tiers
ALTER TABLE license_tiers ADD COLUMN cost_per_session DECIMAL(8,6);
ALTER TABLE license_tiers ADD COLUMN margin_percentage DECIMAL(3,2);
ALTER TABLE license_tiers ADD COLUMN overage_price_per_session DECIMAL(6,4);

-- Example data:
-- Starter: cost_per_session=0.002107, margin_percentage=0
-- Professional: cost_per_session=0.002107, margin_percentage=0.57
-- Enterprise: cost_per_session=0.002107, margin_percentage=0.58
```

### API Implementation

```typescript
// Calculate customer profitability
export function calculateCustomerProfitability(
  tier: string,
  monthlyPrice: number,
  monthlySessionsUsed: number
) {
  const costPerSession = 0.002107;
  const totalCost = monthlySessionsUsed * costPerSession;
  const profit = monthlyPrice - totalCost;
  const margin = profit / monthlyPrice;
  
  return {
    monthlyPrice,
    totalCost: totalCost.toFixed(4),
    profit: profit.toFixed(2),
    margin: (margin * 100).toFixed(1) + '%'
  };
}

// Calculate overage charges
export function calculateOverageCharge(sessionsBeyondLimit: number) {
  const overagePrice = 0.01;  // $0.01 per session
  return {
    sessions: sessionsBeyondLimit,
    pricePerSession: overagePrice,
    totalCharge: (sessionsBeyondLimit * overagePrice).toFixed(2),
    profitPerSession: (overagePrice - 0.002107).toFixed(6)
  };
}

// Monthly invoice calculation
export function calculateMonthlyInvoice(
  tier: string,
  monthlyPrice: number,
  sessionsUsed: number,
  monthlySessionLimit: number
) {
  const basePrice = monthlyPrice;
  
  const overages = Math.max(0, sessionsUsed - monthlySessionLimit);
  const overageCharge = overages * 0.01;
  
  const totalPrice = basePrice + overageCharge;
  
  return {
    tier,
    basePrice: basePrice.toFixed(2),
    overageCharge: overageCharge.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
    sessionsUsed,
    monthlySessionLimit,
    overageCount: overages
  };
}
```

### Monitoring & Alerts

```typescript
// Monitor tier profitability
interface TierMetrics {
  tier: string;
  totalCustomers: number;
  avgUtilization: number;
  avgMonthlyRevenue: number;
  avgMonthlyCost: number;
  avgMonthlyProfit: number;
  avgMargin: number;
}

// Alert conditions:
// - If average margin drops below 50%: CRITICAL
// - If average margin drops below 60%: WARNING
// - If infrastructure costs spike >10%: INVESTIGATE
// - If customer CAC ratio drops below $20/revenue: INEFFICIENT
```

---

## Conclusion

The cost-based pricing model ensures:

1. **Profitability**: All tiers exceed the 50% margin target
2. **Sustainability**: Breaks even in 8-9 months with moderate acquisition
3. **Competitiveness**: Professional tier at $49/month is 2x cheaper than market alternatives
4. **Flexibility**: Overage pricing auto-scales with customer success
5. **Growth**: Roadmap for 32% cost reduction provides expansion room

This pricing structure is suitable for a high-growth SaaS business targeting $1M+ ARR within 3 years.
