import { NextRequest, NextResponse } from "next/server";
import passport from "passport";
import { initializeGoogleSSO } from "@/lib/sso";

// Initialize Google SSO strategy
initializeGoogleSSO({
  provider: "google",
  enabled: true,
  clientID: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  callbackURL:
    process.env.GOOGLE_CALLBACK_URL || "/api/auth/sso/google/callback",
});

/**
 * Initiate Google OAuth login
 * GET /api/auth/sso/google
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const authenticateUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${
    process.env.GOOGLE_CLIENT_ID
  }&redirect_uri=${encodeURIComponent(
    process.env.GOOGLE_CALLBACK_URL || ""
  )}&response_type=code&scope=email profile`;

  return NextResponse.redirect(authenticateUrl);
}
