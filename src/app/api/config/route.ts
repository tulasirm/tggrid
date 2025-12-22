import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function decodeToken(token: string): string | null {
  try {
    const decodedEmail = Buffer.from(token, "base64").toString().split(":")[0];
    return decodedEmail;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
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

    let config = await db.systemConfiguration.findFirst();

    if (!config) {
      config = await db.systemConfiguration.create({
        data: {
          defaultBrowser: "chrome",
          maxConcurrentSessions: 50,
          sessionTimeoutMinutes: 5,
          enableVNCByDefault: true,
        },
      });
    }

    return NextResponse.json({
      config,
      userSettings: user.settings,
    });
  } catch (error) {
    console.error("Failed to get configuration:", error);
    return NextResponse.json(
      { error: "Failed to get configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
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
    const { userSettings, systemConfig } = body;

    let config = await db.systemConfiguration.findFirst();

    if (!config) {
      config = await db.systemConfiguration.create({
        data: systemConfig || {},
      });
    } else if (systemConfig) {
      config = await db.systemConfiguration.update({
        where: { id: config.id },
        data: systemConfig,
      });
    }

    // Update user settings
    let updatedUser = user;
    if (userSettings) {
      updatedUser = await db.user.update({
        where: { id: user.id },
        data: {
          settings: { ...user.settings, ...userSettings },
        },
      });
    }

    return NextResponse.json({
      config,
      userSettings: updatedUser.settings,
    });
  } catch (error) {
    console.error("Failed to update configuration:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}
