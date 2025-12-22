import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Google OAuth callback
 * GET /api/auth/sso/google/callback
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

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    const userInfo = await userInfoResponse.json();

    // Find or create user
    let user = await db.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: userInfo.email,
          fullName: userInfo.name,
          name: userInfo.name,
          password: "", // SSO users don't have passwords
          ssoProvider: "google",
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
        details: JSON.stringify({ provider: "google" }),
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
      maxAge: 86400, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Google SSO callback error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
