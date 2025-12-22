import { db } from "./db";
import { NextRequest } from "next/server";

export type Role = "admin" | "manager" | "user" | "viewer";
export type Permission =
  | "sessions.create"
  | "sessions.read"
  | "sessions.update"
  | "sessions.delete"
  | "users.create"
  | "users.read"
  | "users.update"
  | "users.delete"
  | "config.read"
  | "config.update"
  | "audit.read"
  | "metrics.read";

/**
 * Role to permissions mapping
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "sessions.create",
    "sessions.read",
    "sessions.update",
    "sessions.delete",
    "users.create",
    "users.read",
    "users.update",
    "users.delete",
    "config.read",
    "config.update",
    "audit.read",
    "metrics.read",
  ],
  manager: [
    "sessions.create",
    "sessions.read",
    "sessions.update",
    "sessions.delete",
    "users.read",
    "config.read",
    "audit.read",
    "metrics.read",
  ],
  user: [
    "sessions.create",
    "sessions.read",
    "sessions.update",
    "sessions.delete",
    "metrics.read",
  ],
  viewer: ["sessions.read", "metrics.read"],
};

/**
 * Check if user has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get user role from database
 */
export async function getUserRole(userId: string): Promise<Role> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return (user?.role as Role) || "user";
  } catch (error) {
    console.error("Failed to get user role:", error);
    return "user";
  }
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  role: Role
): Promise<boolean> {
  try {
    await db.user.update({
      where: { id: userId },
      data: { role },
    });
    return true;
  } catch (error) {
    console.error("Failed to update user role:", error);
    return false;
  }
}

/**
 * Assign role to user
 */
export async function assignRole(
  userId: string,
  role: Role,
  assignedBy: string
): Promise<boolean> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        role,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: assignedBy,
        action: "user.role.update",
        resourceType: "user",
        resourceId: userId,
        details: JSON.stringify({ newRole: role }),
        ipAddress: "",
      },
    });

    return true;
  } catch (error) {
    console.error("Failed to assign role:", error);
    return false;
  }
}

/**
 * Get all users with their roles
 */
export async function getUsersWithRoles() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users.map((user) => ({
      ...user,
      role: (user.role as Role) || "user",
      permissions: ROLE_PERMISSIONS[(user.role as Role) || "user"],
    }));
  } catch (error) {
    console.error("Failed to get users with roles:", error);
    return [];
  }
}

/**
 * Check if user can access resource
 */
export async function canAccessResource(
  userId: string,
  resourceType: "session" | "user",
  resourceId: string,
  action: "read" | "update" | "delete"
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const role = (user?.role as Role) || "user";

    // Admins can access everything
    if (role === "admin") {
      return true;
    }

    // Check if user owns the resource
    if (resourceType === "session") {
      const session = await db.browserSession.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      });

      if (session?.userId === userId) {
        return true;
      }
    }

    // Check permissions
    const permission = `${resourceType}s.${action}` as Permission;
    return hasPermission(role, permission);
  } catch (error) {
    console.error("Failed to check resource access:", error);
    return false;
  }
}

/**
 * Middleware to check permissions
 */
export function requirePermission(permission: Permission) {
  return async (userId: string): Promise<boolean> => {
    const role = await getUserRole(userId);
    return hasPermission(role, permission);
  };
}

/**
 * Middleware to check role
 */
export function requireRole(allowedRoles: Role[]) {
  return async (userId: string): Promise<boolean> => {
    const role = await getUserRole(userId);
    return allowedRoles.includes(role);
  };
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role can perform action
 */
export function canPerformAction(role: Role, action: Permission): boolean {
  return hasPermission(role, action);
}
