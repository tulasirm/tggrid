import { NextRequest, NextResponse } from "next/server";
import {
  getUserRole,
  getPermissionsForRole,
  assignRole,
  Role,
} from "@/lib/rbac";
import { rbacMiddleware } from "@/middleware/rbac";

/**
 * Get user's role and permissions
 * GET /api/rbac/me
 */
export async function GET(request: NextRequest) {
  const authResult = await rbacMiddleware(request, ["users.read"]);
  if (authResult.error) {
    return authResult.response;
  }

  const { userId, role } = authResult;
  const permissions = getPermissionsForRole(role as Role);

  return NextResponse.json({
    success: true,
    userId,
    role,
    permissions,
  });
}
