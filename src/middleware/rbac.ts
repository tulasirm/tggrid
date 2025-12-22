import { NextRequest, NextResponse } from "next/server";
import { getUserRole, hasPermission, Permission } from "@/lib/rbac";

function decodeToken(token: string): string | null {
  try {
    const decodedEmail = Buffer.from(token, "base64").toString().split(":")[0];
    return decodedEmail;
  } catch {
    return null;
  }
}

async function getUserIdFromToken(token: string): Promise<string | null> {
  const email = decodeToken(token);
  if (!email) return null;

  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id || null;
}

/**
 * RBAC middleware to protect API routes
 *
 * Usage:
 * export async function POST(request: NextRequest) {
 *   const authResult = await rbacMiddleware(request, ['sessions.create']);
 *   if (authResult.error) {
 *     return authResult.response;
 *   }
 *
 *   const { userId, role } = authResult;
 *   // ... rest of your handler
 * }
 */
export async function rbacMiddleware(
  request: NextRequest,
  requiredPermissions: Permission[]
): Promise<{
  userId?: string;
  role?: string;
  error?: string;
  response?: NextResponse;
}> {
  try {
    // Check authentication
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return {
        error: "Unauthorized",
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    // Get user ID from token
    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return {
        error: "Invalid token",
        response: NextResponse.json(
          { error: "Invalid token" },
          { status: 401 }
        ),
      };
    }

    // Get user role
    const role = await getUserRole(userId);

    // Check permissions
    const hasRequiredPermissions = requiredPermissions.every((permission) =>
      hasPermission(role, permission)
    );

    if (!hasRequiredPermissions) {
      return {
        error: "Forbidden",
        response: NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        ),
      };
    }

    return { userId, role };
  } catch (error) {
    console.error("RBAC middleware error:", error);
    return {
      error: "Internal server error",
      response: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
    };
  }
}
