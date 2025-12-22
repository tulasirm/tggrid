import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data (for fresh seed)
  console.log("Clearing existing data...");
  await prisma.sessionMetric.deleteMany({});
  await prisma.browserSession.deleteMany({});
  await prisma.systemMetric.deleteMany({});
  await prisma.loadBalancerNode.deleteMany({});
  await prisma.loadBalancerConfig.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.systemConfiguration.deleteMany({});
  console.log("✓ Cleared existing data");

  // Create system configuration
  console.log("Creating system configuration...");
  const config = await prisma.systemConfiguration.create({
    data: {
      defaultBrowser: "chrome",
      maxConcurrentSessions: 50,
      sessionTimeoutMinutes: 5,
      enableVNCByDefault: true,
      environment: "production",
      logLevel: "info",
      metricsCollectionEnabled: true,
      autoScalingEnabled: false,
      poolPrewarmSize: 15,
      maxPoolSize: 50,
      containerMemoryMB: 512,
      enableMetrics: true,
      enableLogging: true,
      logRetentionDays: 7,
    },
  });
  console.log("✓ System configuration created:", config.id);

  // Create test users
  console.log("Creating test users...");
  const hashedPassword1 = await bcrypt.hash("password123", 10);
  const hashedPassword2 = await bcrypt.hash("password456", 10);
  const hashedPassword3 = await bcrypt.hash("demo123", 10);

  const user1 = await prisma.user.create({
    data: {
      email: "alice@example.com",
      password: hashedPassword1,
      fullName: "Alice Johnson",
      name: "Alice",
      settings: {
        theme: "dark",
        emailNotifications: true,
        twoFactorEnabled: false,
        autoRefresh: true,
        refreshInterval: 5000,
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "bob@example.com",
      password: hashedPassword2,
      fullName: "Bob Smith",
      name: "Bob",
      settings: {
        theme: "light",
        emailNotifications: false,
        twoFactorEnabled: false,
        autoRefresh: false,
        refreshInterval: 10000,
      },
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@example.com",
      password: hashedPassword3,
      fullName: "Demo User",
      name: "Demo",
      settings: {
        theme: "dark",
        emailNotifications: true,
        twoFactorEnabled: false,
        autoRefresh: true,
        refreshInterval: 5000,
      },
    },
  });

  console.log("✓ Users created:");
  console.log(`  - ${user1.fullName} (${user1.email})`);
  console.log(`  - ${user2.fullName} (${user2.email})`);
  console.log(`  - ${demoUser.fullName} (${demoUser.email})`);

  // Create browser sessions for user1
  console.log("Creating browser sessions for Alice...");
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const session1 = await prisma.browserSession.create({
    data: {
      userId: user1.id,
      browser: "chrome",
      status: "running",
      vncEnabled: true,
      videoEnabled: true,
      resolution: "1920x1080",
      capabilities: JSON.stringify({
        browserName: "chrome",
        platformName: "linux",
        acceptInsecureCerts: false,
        pageLoadStrategy: "normal",
      }),
      startTime: twoHoursAgo,
      duration: 7200,
      cpuUsage: 45.2,
      memoryUsage: 62.5,
      networkLatency: 12.3,
    },
  });

  const session2 = await prisma.browserSession.create({
    data: {
      userId: user1.id,
      browser: "firefox",
      status: "running",
      vncEnabled: true,
      videoEnabled: false,
      resolution: "1366x768",
      capabilities: JSON.stringify({
        browserName: "firefox",
        platformName: "linux",
        acceptInsecureCerts: false,
        pageLoadStrategy: "eager",
      }),
      startTime: oneHourAgo,
      duration: 3600,
      cpuUsage: 38.1,
      memoryUsage: 55.7,
      networkLatency: 15.8,
    },
  });

  const session3 = await prisma.browserSession.create({
    data: {
      userId: user1.id,
      browser: "chrome",
      status: "idle",
      vncEnabled: false,
      videoEnabled: false,
      resolution: "1920x1080",
      capabilities: JSON.stringify({
        browserName: "chrome",
        platformName: "linux",
        acceptInsecureCerts: false,
      }),
      startTime: new Date(now.getTime() - 30 * 60 * 1000),
      endTime: now,
      duration: 1800,
      cpuUsage: 12.5,
      memoryUsage: 28.3,
      networkLatency: 8.2,
    },
  });

  console.log("✓ Sessions created:");
  console.log(`  - Chrome (${session1.status})`);
  console.log(`  - Firefox (${session2.status})`);
  console.log(`  - Chrome (${session3.status})`);

  // Create metrics for sessions
  console.log("Creating session metrics...");
  for (let i = 0; i < 5; i++) {
    await prisma.sessionMetric.create({
      data: {
        sessionId: session1.id,
        cpuUsage: 40 + Math.random() * 20,
        memoryUsage: 55 + Math.random() * 25,
        networkLatency: 10 + Math.random() * 15,
        timestamp: new Date(twoHoursAgo.getTime() + i * 15 * 60 * 1000),
      },
    });
  }

  for (let i = 0; i < 4; i++) {
    await prisma.sessionMetric.create({
      data: {
        sessionId: session2.id,
        cpuUsage: 35 + Math.random() * 15,
        memoryUsage: 50 + Math.random() * 20,
        networkLatency: 12 + Math.random() * 12,
        timestamp: new Date(oneHourAgo.getTime() + i * 15 * 60 * 1000),
      },
    });
  }

  console.log("✓ Session metrics created");

  // Create system metrics
  console.log("Creating system metrics...");
  for (let i = 0; i < 6; i++) {
    const timestamp = new Date(now.getTime() - (5 - i) * 2 * 60 * 60 * 1000);
    await prisma.systemMetric.create({
      data: {
        totalSessions: 10 + i * 5,
        activeSessions: 3 + Math.floor(i * 1.5),
        cpuUsage: 20 + i * 10,
        memoryUsage: 25 + i * 12,
        networkLatency: 10 + i * 2,
        uptime: 86400 * 7, // 7 days
        timestamp,
      },
    });
  }
  console.log("✓ System metrics created");

  // Create load balancer configuration
  console.log("Creating load balancer configuration...");
  const lbConfig = await prisma.loadBalancerConfig.create({
    data: {
      userId: user1.id,
      algorithm: "round-robin",
      healthCheckInterval: 30,
      nodes: {
        create: [
          {
            nodeId: "node-1",
            host: "worker-1.example.com",
            port: 4444,
            healthy: true,
            weight: 1,
            capacity: 100,
            currentLoad: 45,
          },
          {
            nodeId: "node-2",
            host: "worker-2.example.com",
            port: 4444,
            healthy: true,
            weight: 1,
            capacity: 100,
            currentLoad: 38,
          },
          {
            nodeId: "node-3",
            host: "worker-3.example.com",
            port: 4444,
            healthy: false,
            weight: 1,
            capacity: 100,
            currentLoad: 0,
          },
        ],
      },
    },
    include: { nodes: true },
  });
  console.log("✓ Load balancer configuration created with 3 nodes");

  // Create browser sessions for user2
  console.log("Creating browser sessions for Bob...");
  const session4 = await prisma.browserSession.create({
    data: {
      userId: user2.id,
      browser: "chrome",
      status: "running",
      vncEnabled: true,
      videoEnabled: true,
      resolution: "1920x1080",
      capabilities: JSON.stringify({
        browserName: "chrome",
        platformName: "windows",
        acceptInsecureCerts: true,
      }),
      startTime: new Date(now.getTime() - 45 * 60 * 1000),
      duration: 2700,
      cpuUsage: 55.8,
      memoryUsage: 72.3,
      networkLatency: 18.5,
    },
  });

  console.log("✓ Session created for Bob");

  // Create audit logs
  console.log("Creating audit logs...");
  await prisma.auditLog.create({
    data: {
      userId: user1.id,
      action: "LOGIN",
      resourceType: "auth",
      ipAddress: "192.168.1.100",
      details: JSON.stringify({
        email: user1.email,
        timestamp: new Date(),
      }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user1.id,
      action: "CREATE_SESSION",
      resourceType: "session",
      resourceId: session1.id,
      details: JSON.stringify({
        sessionId: session1.id,
        browser: "chrome",
      }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user2.id,
      action: "LOGIN",
      resourceType: "auth",
      ipAddress: "192.168.1.101",
      details: JSON.stringify({
        email: user2.email,
        timestamp: new Date(),
      }),
    },
  });

  console.log("✓ Audit logs created");

  // Summary
  console.log("\n✅ Database seeding completed successfully!");
  console.log("\n📊 Seeded Data Summary:");
  console.log(
    `  Users: 3 (alice@example.com, bob@example.com, demo@example.com)`
  );
  console.log(`  Sessions: 4 (3 for Alice, 1 for Bob)`);
  console.log(`  Session Metrics: 9`);
  console.log(`  System Metrics: 6`);
  console.log(`  Audit Logs: 3`);
  console.log("\n🔐 Test Credentials:");
  console.log(`  Email: alice@example.com | Password: password123`);
  console.log(`  Email: bob@example.com | Password: password456`);
  console.log(`  Email: demo@example.com | Password: demo123`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
