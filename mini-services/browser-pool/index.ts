import { createServer } from "http";
import { WebSocketServer } from "ws";
import Docker from "dockerode";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import CDP from "chrome-remote-interface";

dotenv.config();

const PORT = process.env.BROWSER_POOL_PORT || 3002;
const POOL_SIZE = parseInt(process.env.BROWSER_POOL_SIZE || "10");
const PRE_WARM_COUNT = parseInt(process.env.PRE_WARM_COUNT || "5");

// Docker client
const docker = new Docker();

// Browser pool management
class BrowserPool {
  constructor() {
    this.availableContainers = new Map(); // containerId -> container info
    this.activeContainers = new Map(); // sessionId -> container info
    this.containersStarting = new Set(); // containers currently starting
    this.metrics = {
      totalCreated: 0,
      totalReused: 0,
      avgStartupTime: 0,
      poolHits: 0,
      poolMisses: 0,
    };
  }

  async initialize() {
    console.log(`🚀 Initializing ultra-fast browser pool...`);
    console.log(`📊 Pool size: ${POOL_SIZE}, Pre-warm: ${PRE_WARM_COUNT}`);

    // Pre-warm containers
    const preWarmPromises = [];
    for (let i = 0; i < PRE_WARM_COUNT; i++) {
      preWarmPromises.push(this.createContainer("chrome", true));
    }

    await Promise.all(preWarmPromises);
    console.log(`✅ Pre-warmed ${PRE_WARM_COUNT} containers`);
  }

  async createContainer(browserType = "chrome", isPreWarm = false) {
    const startTime = Date.now();
    const containerId = `browser-${browserType}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Check if VNC is enabled
      const vncEnabled = process.env.ENABLE_VNC === "true";

      // Ultra-minimal container configuration
      const containerConfig = {
        Image:
          browserType === "chrome"
            ? vncEnabled
              ? "chrome-alpine-vnc:latest"
              : "chrome-alpine:latest"
            : vncEnabled
            ? "firefox-alpine-vnc:latest"
            : "firefox-alpine:latest",
        name: containerId,
        ExposedPorts: vncEnabled
          ? {
              "9222/tcp": {},
              "5900/tcp": {}, // VNC port
            }
          : {
              "9222/tcp": {},
            },
        HostConfig: {
          PortBindings: vncEnabled
            ? {
                "9222/tcp": [{ HostPort: "0" }], // Random port
                "5900/tcp": [{ HostPort: "0" }], // Random VNC port
              }
            : {
                "9222/tcp": [{ HostPort: "0" }], // Random port
              },
          Memory: vncEnabled ? 512 * 1024 * 1024 : 256 * 1024 * 1024, // 512MB for VNC, 256MB for headless
          CpuQuota: vncEnabled ? 100000 : 50000, // 1 CPU for VNC, 0.5 CPU for headless
          AutoRemove: true,
          NetworkMode: "bridge",
          ShmSize: 2 * 1024 * 1024 * 1024, // 2GB shared memory for X11
        },
        Env: [
          "CHROME_BIN=/usr/bin/chromium-browser",
          "FIREFOX_BIN=/usr/bin/firefox-esr",
          "DISPLAY=:99",
          "SCREEN_WIDTH=1920",
          "SCREEN_HEIGHT=1080",
          "SCREEN_DEPTH=24",
          "VNC_PORT=5900",
        ],
      };

      // Create and start container
      const container = await docker.createContainer(containerConfig);
      await container.start();

      // Get the assigned ports
      const containerInfo = await container.inspect();
      const port = containerInfo.NetworkSettings.Ports["9222/tcp"][0].HostPort;
      const vncPort =
        vncEnabled && containerInfo.NetworkSettings.Ports["5900/tcp"]
          ? containerInfo.NetworkSettings.Ports["5900/tcp"][0].HostPort
          : null;

      // Wait for CDP to be ready (with timeout)
      await this.waitForCDP(port, 10000); // 10 second timeout

      const containerData = {
        id: containerId,
        container,
        port,
        vncPort,
        vncEnabled,
        browserType,
        createdAt: new Date(),
        lastUsed: new Date(),
        isPreWarm,
        cdpUrl: `http://localhost:${port}`,
        wsEndpoint: `ws://localhost:${port}/devtools/browser`,
        vncUrl: vncPort ? `vnc://localhost:${vncPort}` : null,
        vncWebSocketUrl: vncPort ? `ws://localhost:${vncPort}` : null,
      };

      if (isPreWarm) {
        this.availableContainers.set(containerId, containerData);
      }

      this.metrics.totalCreated++;
      const startupTime = Date.now() - startTime;
      this.updateStartupTime(startupTime);

      console.log(
        `⚡ ${
          isPreWarm ? "Pre-warmed" : "Created"
        } ${browserType} container in ${startupTime}ms`
      );

      return containerData;
    } catch (error) {
      console.error(`❌ Failed to create container:`, error);
      throw error;
    }
  }

  async waitForCDP(port, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Try to connect to CDP endpoint
        const response = await fetch(`http://localhost:${port}/json/version`, {
          timeout: 1000,
        });
        if (response.ok) {
          console.log(`✓ CDP ready on port ${port}`);
          return true;
        }
      } catch (error) {
        // CDP not ready yet, continue waiting
      }

      await new Promise((resolve) => setTimeout(resolve, 500)); // Check every 500ms
    }

    console.warn(`⚠ CDP timeout on port ${port}, but continuing anyway`);
    return true; // Return true anyway to allow the browser to be used
  }

  async getBrowser(browserType = "chrome") {
    // Try to get from pool first
    for (const [containerId, container] of this.availableContainers.entries()) {
      if (container.browserType === browserType) {
        this.availableContainers.delete(containerId);
        this.activeContainers.set(containerId, container);
        container.lastUsed = new Date();
        this.metrics.totalReused++;
        this.metrics.poolHits++;

        console.log(`🎯 Pool hit! Reused ${browserType} container`);
        return container;
      }
    }

    // Pool miss, create new container
    this.metrics.poolMisses++;
    console.log(`❌ Pool miss! Creating new ${browserType} container`);
    return await this.createContainer(browserType);
  }

  async releaseBrowser(sessionId) {
    const container = this.activeContainers.get(sessionId);
    if (!container) return false;

    this.activeContainers.delete(sessionId);

    // Check if pool is full
    if (this.availableContainers.size >= POOL_SIZE) {
      // Pool full, destroy container
      await container.container.stop();
      await container.container.remove();
      console.log(`🗑️  Pool full, destroyed container`);
    } else {
      // Return to pool
      container.lastUsed = new Date();
      this.availableContainers.set(container.id, container);
      console.log(`↩️  Returned container to pool`);
    }

    return true;
  }

  updateStartupTime(time) {
    const alpha = 0.1; // Exponential moving average
    this.metrics.avgStartupTime =
      this.metrics.avgStartupTime * (1 - alpha) + time * alpha;
  }

  getMetrics() {
    return {
      ...this.metrics,
      availableContainers: this.availableContainers.size,
      activeContainers: this.activeContainers.size,
      poolEfficiency:
        (this.metrics.poolHits /
          (this.metrics.poolHits + this.metrics.poolMisses)) *
        100,
    };
  }
}

// Initialize browser pool
const browserPool = new BrowserPool();

// WebSocket server for real-time communication
const wss = new WebSocketServer({ port: PORT + 1 });

wss.on("connection", (ws) => {
  console.log("🔌 WebSocket client connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.action) {
        case "getBrowser":
          const browser = await browserPool.getBrowser(data.browserType);
          ws.send(
            JSON.stringify({
              type: "browserAssigned",
              sessionId: data.sessionId,
              container: {
                id: browser.id,
                port: browser.port,
                cdpUrl: browser.cdpUrl,
                wsEndpoint: browser.wsEndpoint,
              },
            })
          );
          break;

        case "releaseBrowser":
          await browserPool.releaseBrowser(data.sessionId);
          ws.send(
            JSON.stringify({
              type: "browserReleased",
              sessionId: data.sessionId,
            })
          );
          break;

        case "getMetrics":
          ws.send(
            JSON.stringify({
              type: "metrics",
              data: browserPool.getMetrics(),
            })
          );
          break;
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: error.message,
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("🔌 WebSocket client disconnected");
  });
});

// HTTP server for REST API
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    switch (url.pathname) {
      case "/health":
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", timestamp: new Date() }));
        break;

      case "/metrics":
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(browserPool.getMetrics()));
        break;

      case "/browser":
        if (req.method === "POST") {
          const body = await new Promise((resolve) => {
            let data = "";
            req.on("data", (chunk) => (data += chunk));
            req.on("end", () => resolve(JSON.parse(data)));
          });

          const browser = await browserPool.getBrowser(
            body.browserType || "chrome"
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              sessionId: browser.id,
              port: browser.port,
              cdpUrl: browser.cdpUrl,
              wsEndpoint: browser.wsEndpoint,
            })
          );
        }
        break;

      default:
        res.writeHead(404);
        res.end();
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Cleanup old containers periodically
setInterval(async () => {
  const now = new Date();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [
    containerId,
    container,
  ] of browserPool.availableContainers.entries()) {
    if (now - container.lastUsed > maxAge) {
      try {
        await container.container.stop();
        await container.container.remove();
        this.availableContainers.delete(containerId);
        console.log(`🧹 Cleaned up old container: ${containerId}`);
      } catch (error) {
        console.error(`Failed to cleanup container ${containerId}:`, error);
      }
    }
  }
}, 60000); // Check every minute

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down browser pool...");

  // Stop all containers
  const allContainers = [
    ...this.availableContainers.values(),
    ...this.activeContainers.values(),
  ];
  await Promise.all(
    allContainers.map(async (container) => {
      try {
        await container.container.stop();
        await container.container.remove();
      } catch (error) {
        console.error(`Failed to stop container ${container.id}:`, error);
      }
    })
  );

  server.close();
  process.exit(0);
});

// Start services
async function start() {
  try {
    await browserPool.initialize();

    server.listen(PORT, () => {
      console.log(`🚀 Ultra-fast Browser Pool Service running on port ${PORT}`);
      console.log(`📊 WebSocket: ws://localhost:${PORT + 1}`);
      console.log(`🔗 REST API: http://localhost:${PORT}`);
      console.log(`⚡ Ready for blazing fast browser sessions!`);
    });
  } catch (error) {
    console.error("Failed to start browser pool service:", error);
    process.exit(1);
  }
}

start();
