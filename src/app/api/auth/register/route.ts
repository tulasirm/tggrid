import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { createAuditLog, getIpFromRequest } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in database
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: fullName || email.split("@")[0],
        name: fullName || email.split("@")[0],
        settings: {
          theme: "dark",
          emailNotifications: true,
          twoFactorEnabled: false,
        },
      },
    });

    // Audit log user registration
    await createAuditLog({
      userId: user.id,
      action: "auth.register",
      resourceType: "user",
      resourceId: user.id,
      details: "New user registered",
      ipAddress: getIpFromRequest(request),
    });

    // Generate token (in production, use JWT)
    const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
