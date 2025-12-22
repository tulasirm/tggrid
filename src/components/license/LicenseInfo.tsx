'use client';

/**
 * License Info Component
 * Displays current license tier and usage
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LicenseCheckResult, LicenseTier } from '@/lib/licensing/types';
import { LicenseValidator } from '@/lib/licensing/validator';
import { AlertTriangle, Check, Clock } from 'lucide-react';

interface LicenseInfoProps {
  tier: LicenseTier;
  maxSessions?: number;
  currentSessions?: number;
  daysUntilExpiration?: number;
  className?: string;
}

export function LicenseInfo({
  tier,
  maxSessions = 0,
  currentSessions = 0,
  daysUntilExpiration,
  className = '',
}: LicenseInfoProps) {
  const [licenseInfo, setLicenseInfo] = useState<LicenseCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // In production, fetch actual license info
    // For now, create mock data
    const mockLicense = {
      valid: true,
      tier,
      expiresAt: daysUntilExpiration ? new Date(Date.now() + daysUntilExpiration * 24 * 60 * 60 * 1000) : undefined,
      allowedFeatures: {},
      usageMetrics: {
        period: 'monthly' as const,
        sessionCount: currentSessions,
        browserTypeBreakdown: { chrome: currentSessions, firefox: 0 },
        regionUsage: {},
        maxConcurrentSessions: currentSessions,
        totalApiCalls: 0,
        storageUsedGB: 0,
        timestamp: new Date(),
      },
    };
    
    setLicenseInfo(mockLicense as LicenseCheckResult);
    setLoading(false);
  }, [tier, currentSessions, daysUntilExpiration]);
  
  if (loading) {
    return <div className={className}>Loading license info...</div>;
  }
  
  if (!licenseInfo) {
    return null;
  }
  
  const sessionUsagePercent = maxSessions > 0 ? (currentSessions / maxSessions) * 100 : 0;
  const tierColors: Record<LicenseTier, string> = {
    starter: 'bg-blue-500',
    professional: 'bg-purple-500',
    enterprise: 'bg-amber-500',
  };
  
  const tierLabels: Record<LicenseTier, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>License Information</CardTitle>
            <CardDescription>Current plan and usage</CardDescription>
          </div>
          <Badge className={tierColors[tier]}>
            {tierLabels[tier]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status */}
        {licenseInfo.valid ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            License is active
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              License is not valid
            </AlertDescription>
          </Alert>
        )}
        
        {/* Expiration */}
        {licenseInfo.expiresAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Expires:</span>
            <div className="flex items-center gap-2">
              {daysUntilExpiration !== undefined && daysUntilExpiration < 30 && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span>
                {daysUntilExpiration !== undefined
                  ? `${daysUntilExpiration} days`
                  : licenseInfo.expiresAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
        
        {/* Session Usage */}
        {maxSessions > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Session Usage</span>
              <span className="font-semibold">
                {currentSessions} / {maxSessions}
              </span>
            </div>
            <Progress value={sessionUsagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {sessionUsagePercent.toFixed(1)}% of limit
            </p>
          </div>
        )}
        
        {/* Violations */}
        {licenseInfo.violations && licenseInfo.violations.length > 0 && (
          <Alert variant={licenseInfo.violations.some(v => v.severity === 'critical') ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {licenseInfo.violations.map((violation, i) => (
                  <li key={i}>
                    {violation.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
