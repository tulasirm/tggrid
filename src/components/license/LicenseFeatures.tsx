'use client';

/**
 * License Features Component
 * Displays available features for a license tier
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LicenseFeatures, LicenseTier } from '@/lib/licensing/types';
import { getLicenseTier } from '@/lib/licensing/tiers';
import { Check, X } from 'lucide-react';

interface LicenseFeaturesProps {
  tier: LicenseTier;
  className?: string;
}

const featureDisplayNames: Record<keyof LicenseFeatures, string> = {
  maxSessions: 'Concurrent Sessions',
  maxSessionsPerMonth: 'Monthly Sessions',
  supportedBrowsers: 'Supported Browsers',
  regions: 'Global Regions',
  advancedMonitoring: 'Advanced Monitoring',
  apiAccess: 'REST API Access',
  auditLogs: 'Audit Logging',
  autoScaling: 'Auto-Scaling',
  customIntegration: 'Custom Integration',
  dedicatedSupport: 'Dedicated Support',
  slaGuarantee: 'SLA Guarantee',
  onPremiseOption: 'On-Premise Option',
  multiTeamManagement: 'Multi-Team Management',
  advancedSecurity: 'Advanced Security',
  vncLiveViewing: 'VNC Live Viewing',
  recordingCapability: 'Session Recording',
  webhookIntegration: 'Webhook Integration',
  prioritySupport: 'Priority Support',
};

export function LicenseFeatures({ tier, className = '' }: LicenseFeaturesProps) {
  const tierConfig = getLicenseTier(tier);
  
  if (!tierConfig) {
    return null;
  }
  
  const features = tierConfig.features;
  
  const booleanFeatures = Object.entries(features)
    .filter(([_, value]) => typeof value === 'boolean')
    .sort(([_, a], [__, b]) => (b as boolean ? 1 : -1) - (a as boolean ? 1 : -1));
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Available Features</CardTitle>
        <CardDescription>Features included in your {tierConfig.displayName} plan</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-2">
          {booleanFeatures.map(([featureKey, enabled]) => (
            <div
              key={featureKey}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium">
                {featureDisplayNames[featureKey as keyof LicenseFeatures] || featureKey}
              </span>
              {enabled ? (
                <Badge variant="outline" className="bg-green-50">
                  <Check className="h-3 w-3 text-green-600 mr-1" />
                  Included
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50">
                  <X className="h-3 w-3 text-gray-600 mr-1" />
                  Not included
                </Badge>
              )}
            </div>
          ))}
          
          {/* Display numeric features */}
          {features.maxSessions !== undefined && (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Concurrent Sessions</span>
              <Badge variant="secondary">
                {features.maxSessions === Infinity ? 'Unlimited' : features.maxSessions}
              </Badge>
            </div>
          )}
          
          {features.maxSessionsPerMonth !== undefined && (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Monthly Sessions</span>
              <Badge variant="secondary">
                {features.maxSessionsPerMonth === Infinity ? 'Unlimited' : features.maxSessionsPerMonth}
              </Badge>
            </div>
          )}
          
          {features.regions !== undefined && (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Available Regions</span>
              <Badge variant="secondary">
                {features.regions}
              </Badge>
            </div>
          )}
          
          {/* Display browser support */}
          {features.supportedBrowsers && (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Supported Browsers</span>
              <div className="flex gap-1">
                {features.supportedBrowsers.map(browser => (
                  <Badge key={browser} variant="secondary" className="capitalize">
                    {browser}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
