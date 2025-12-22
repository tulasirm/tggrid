/**
 * Audit Logging Utility
 * Tracks all important actions in the system
 */

import { db } from "./db";

export type AuditAction =
  | "session.create"
  | "session.stop"
  | "session.delete"
  | "user.login"
  | "user.logout"
  | "user.register"
  | "user.update"
  | "user.delete"
  | "config.update"
  | "loadbalancer.update"
  | "security.update";

export type ResourceType =
  | "session"
  | "user"
  | "config"
  | "loadbalancer"
  | "security";

export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  resourceType?: ResourceType;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        details: data.details || null,
        ipAddress: data.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging failures shouldn't break the app
  }
}

export async function getAuditLogs(filters?: {
  userId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const where: any = {};

  if (filters?.userId) where.userId = filters.userId;
  if (filters?.action) where.action = filters.action;
  if (filters?.resourceType) where.resourceType = filters.resourceType;

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  return await db.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: filters?.limit || 100,
  });
}

// Helper to extract IP from request
export function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "unknown";
}
