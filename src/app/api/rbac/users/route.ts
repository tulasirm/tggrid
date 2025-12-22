import { NextRequest, NextResponse } from "next/server";
import { getUsersWithRoles } from "@/lib/rbac";
import { rbacMiddleware } from "@/middleware/rbac";

/**
 * Get all users with their roles
 * GET /api/rbac/users
 */
export async function GET(request: NextRequest) {
  const authResult = await rbacMiddleware(request, ["users.read"]);
  if (authResult.error) {
    return authResult.response;
  }

  const users = await getUsersWithRoles();

  return NextResponse.json({
    success: true,
    users,
  });
}
