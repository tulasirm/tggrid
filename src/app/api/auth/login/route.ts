import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { verify2FAToken, verifyBackupCode } from "@/lib/two-factor";
import { createAuditLog, getIpFromRequest } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, twoFactorCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    const settings =
      typeof user.settings === "string"
        ? JSON.parse(user.settings)
        : user.settings;

    if (settings?.twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json(
          {
            error: "Two-factor authentication code required",
            requiresTwoFactor: true,
          },
          { status: 403 }
        );
      }

      // Verify 2FA token or backup code
      const isTokenValid = verify2FAToken(
        settings.twoFactorSecret,
        twoFactorCode
      );

      if (!isTokenValid) {
        // Try backup code
        const backupCodeResult = verifyBackupCode(
          twoFactorCode,
          settings.twoFactorBackupCodes || [],
          settings.twoFactorUsedBackupCodes || []
        );

        if (!backupCodeResult.valid) {
          await createAuditLog({
            userId: user.id,
            action: "auth.login.failed",
            resourceType: "user",
            resourceId: user.id,
            details: "Invalid 2FA code",
            ipAddress: getIpFromRequest(request),
          });

          return NextResponse.json(
            { error: "Invalid two-factor authentication code" },
            { status: 401 }
          );
        }

        // Update used backup codes
        await db.user.update({
          where: { id: user.id },
          data: {
            settings: JSON.stringify({
              ...settings,
              twoFactorUsedBackupCodes: backupCodeResult.usedCodes,
            }),
          },
        });
      }
    }

    // Generate token (in production, use JWT with expiration)
    const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

    // Audit log successful login
    await createAuditLog({
      userId: user.id,
      action: "auth.login",
      resourceType: "user",
      resourceId: user.id,
      details: "User logged in successfully",
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        twoFactorEnabled: settings?.twoFactorEnabled || false,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
