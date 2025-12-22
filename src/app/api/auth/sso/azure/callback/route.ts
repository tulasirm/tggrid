import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Azure AD OAuth callback
 * GET /api/auth/sso/azure/callback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "No authorization code provided" },
        { status: 400 }
      );
    }

    const tenant = process.env.AZURE_AD_TENANT || "common";

    // Exchange code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.AZURE_AD_CLIENT_ID || "",
          client_secret: process.env.AZURE_AD_CLIENT_SECRET || "",
          redirect_uri: process.env.AZURE_AD_CALLBACK_URL || "",
          grant_type: "authorization_code",
        }),
      }
    );

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    const userInfo = await userInfoResponse.json();

    // Find or create user
    let user = await db.user.findUnique({
      where: { email: userInfo.mail || userInfo.userPrincipalName },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: userInfo.mail || userInfo.userPrincipalName,
          fullName: userInfo.displayName,
          name: userInfo.displayName,
          password: "",
          ssoProvider: "azure",
          ssoId: userInfo.id,
          settings: {
            theme: "dark",
            emailNotifications: true,
            twoFactorEnabled: false,
          },
        },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "auth.sso.login",
        resourceType: "user",
        resourceId: user.id,
        details: JSON.stringify({ provider: "azure" }),
        ipAddress: request.headers.get("x-forwarded-for") || "",
      },
    });

    // Create session token
    const token = Buffer.from(`${user.email}:${Date.now()}`).toString("base64");

    // Redirect to dashboard with token
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400,
    });

    return response;
  } catch (error) {
    console.error("Azure AD SSO callback error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
