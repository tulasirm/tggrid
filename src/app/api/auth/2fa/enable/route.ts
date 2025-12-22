import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generate2FASecret } from "@/lib/two-factor";
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
 * Enable 2FA for user
 * POST /api/auth/2fa/enable
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

    // Generate 2FA secret and QR code
    const twoFactorData = await generate2FASecret(user.email);

    // Update user settings with 2FA secret and backup codes
    const currentSettings =
      typeof user.settings === "string"
        ? JSON.parse(user.settings)
        : user.settings;

    await db.user.update({
      where: { id: user.id },
      data: {
        settings: JSON.stringify({
          ...currentSettings,
          twoFactorSecret: twoFactorData.secret,
          twoFactorBackupCodes: twoFactorData.backupCodes,
          twoFactorUsedBackupCodes: [],
          twoFactorEnabled: false, // Will be enabled after verification
        }),
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: "user.update",
      resourceType: "user",
      resourceId: user.id,
      details: "2FA setup initiated",
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      secret: twoFactorData.secret,
      qrCode: twoFactorData.qrCode,
      backupCodes: twoFactorData.backupCodes,
      message:
        "Scan QR code with your authenticator app, then verify with a code to enable 2FA",
    });
  } catch (error) {
    console.error("Failed to enable 2FA:", error);
    return NextResponse.json(
      { error: "Failed to enable 2FA" },
      { status: 500 }
    );
  }
}
