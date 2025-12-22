import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let policy = await db.securityPolicy.findFirst();

    if (!policy) {
      policy = await db.securityPolicy.create({
        data: {
          authenticationEnabled: true,
          mfaEnabled: false,
          encryptionEnabled: true,
          sslRequired: true,
          ipWhitelist: "[]",
          sessionTimeout: 1800,
        },
      });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Failed to get security policy:", error);
    return NextResponse.json(
      { error: "Failed to get security policy" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    let policy = await db.securityPolicy.findFirst();

    if (!policy) {
      policy = await db.securityPolicy.create({
        data: body,
      });
    } else {
      policy = await db.securityPolicy.update({
        where: { id: policy.id },
        data: body,
      });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Failed to update security policy:", error);
    return NextResponse.json(
      { error: "Failed to update security policy" },
      { status: 500 }
    );
  }
}
