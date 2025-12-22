import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verify2FAToken } from "@/lib/two-factor";
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
 * Verify 2FA token and complete setup
 * POST /api/auth/2fa/verify
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
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Verification code required" },
        { status: 400 }
      );
    }

    // Get user settings
    const settings =
      typeof user.settings === "string"
        ? JSON.parse(user.settings)
        : user.settings;

    if (!settings.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
    }

    // Verify the token
    const isValid = verify2FAToken(settings.twoFactorSecret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Enable 2FA
    await db.user.update({
      where: { id: user.id },
      data: {
        settings: JSON.stringify({
          ...settings,
          twoFactorEnabled: true,
        }),
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: "user.update",
      resourceType: "user",
      resourceId: user.id,
      details: "2FA enabled successfully",
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      message: "2FA enabled successfully",
    });
  } catch (error) {
    console.error("Failed to verify 2FA:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 }
    );
  }
}
