import { NextRequest, NextResponse } from "next/server";
import { assignRole, Role } from "@/lib/rbac";
import { rbacMiddleware } from "@/middleware/rbac";

/**
 * Assign role to user
 * POST /api/rbac/assign
 */
export async function POST(request: NextRequest) {
  const authResult = await rbacMiddleware(request, ["users.update"]);
  if (authResult.error) {
    return authResult.response;
  }

  const { userId: adminUserId } = authResult;
  const body = await request.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return NextResponse.json(
      { error: "userId and role are required" },
      { status: 400 }
    );
  }

  const validRoles: Role[] = ["admin", "manager", "user", "viewer"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be: admin, manager, user, or viewer" },
      { status: 400 }
    );
  }

  const success = await assignRole(userId, role, adminUserId!);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to assign role" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Role ${role} assigned to user ${userId}`,
  });
}
