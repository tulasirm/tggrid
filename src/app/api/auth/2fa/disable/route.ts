import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAuditLog, getIpFromRequest } from "@/lib/audit-logger";

function decodeToken(token: string): string | null {
  try {
    const decodedEmail = Buffer.from(token, "base64").toString().split(":")[0];
    return decodedEmail;
  } catch {
    return null;
  }
}

/**
 * Disable 2FA for user
 * POST /api/auth/2fa/disable
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = decodeToken(token);
    if (!email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    // Verify password (in real implementation, use bcrypt)
    if (user.password !== password) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Get user settings
    const settings =
      typeof user.settings === "string"
        ? JSON.parse(user.settings)
        : user.settings;

    // Disable 2FA and clear secrets
    await db.user.update({
      where: { id: user.id },
      data: {
        settings: JSON.stringify({
          ...settings,
          twoFactorEnabled: false,
          twoFactorSecret: undefined,
          twoFactorBackupCodes: undefined,
          twoFactorUsedBackupCodes: undefined,
        }),
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: "user.update",
      resourceType: "user",
      resourceId: user.id,
      details: "2FA disabled",
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("Failed to disable 2FA:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
