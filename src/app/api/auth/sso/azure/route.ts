import { NextRequest, NextResponse } from "next/server";

/**
 * Initiate Azure AD OAuth login
 * GET /api/auth/sso/azure
 */
export async function GET(request: NextRequest) {
  const tenant = process.env.AZURE_AD_TENANT || "common";
  const authenticateUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${
    process.env.AZURE_AD_CLIENT_ID
  }&redirect_uri=${encodeURIComponent(
    process.env.AZURE_AD_CALLBACK_URL || ""
  )}&response_type=code&scope=openid profile email`;

  return NextResponse.redirect(authenticateUrl);
}
