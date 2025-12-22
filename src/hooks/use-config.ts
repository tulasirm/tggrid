import { useState, useEffect } from "react";
import { useToast } from "./use-toast";

export interface SystemConfig {
  id: string;
  defaultBrowser: string;
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  enableVNCByDefault: boolean;
  environment: string;
  logLevel: string;
  metricsCollectionEnabled: boolean;
  autoScalingEnabled: boolean;
  poolPrewarmSize: number;
  maxPoolSize: number;
  containerMemoryMB: number;
  enableMetrics: boolean;
  enableLogging: boolean;
  logRetentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export function useConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to fetch config:", error);
      toast({
        title: "Error",
        description: "Failed to load configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<SystemConfig>) => {
    try {
      setSaving(true);
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update config");

      const updated = await res.json();
      setConfig(updated);

      toast({
        title: "Success",
        description: "Configuration updated successfully",
      });

      return updated;
    } catch (error) {
      console.error("Failed to update config:", error);
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return { config, loading, saving, fetchConfig, updateConfig };
}
