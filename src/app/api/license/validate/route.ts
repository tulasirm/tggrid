/**
 * License validation endpoint
 * POST /api/license/validate
 */

import { NextRequest, NextResponse } from "next/server";
import { LicenseValidator } from "@/lib/licensing/validator";
import { LicenseKey } from "@/lib/licensing/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return NextResponse.json(
        {
          error: "License key is required",
          code: "MISSING_LICENSE_KEY",
        },
        { status: 400 }
      );
    }

    // In production, fetch from database
    // For demo, create a mock license object
    const mockLicense: LicenseKey = {
      id: "demo-1",
      key: licenseKey,
      tier: "professional",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      organizationId: "org-1",
      organizationName: "Demo Organization",
      maxUsers: 50,
      maxSessions: 10000,
    };

    const result = LicenseValidator.validateLicense(mockLicense);

    return NextResponse.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("License validation error:", error);
    return NextResponse.json(
      {
        error: "License validation failed",
        code: "VALIDATION_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const licenseKey = request.nextUrl.searchParams.get("key");

    if (!licenseKey) {
      return NextResponse.json(
        {
          error: "License key is required",
          code: "MISSING_LICENSE_KEY",
        },
        { status: 400 }
      );
    }

    // Mock validation
    const mockLicense: LicenseKey = {
      id: "demo-1",
      key: licenseKey,
      tier: "professional",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      organizationId: "org-1",
      organizationName: "Demo Organization",
    };

    const result = LicenseValidator.validateLicense(mockLicense);

    return NextResponse.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("License check error:", error);
    return NextResponse.json(
      {
        error: "License check failed",
        code: "CHECK_ERROR",
      },
      { status: 500 }
    );
  }
}
