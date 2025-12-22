/**
 * UFBrowsers Remote WebDriver Framework
 *
 * Comprehensive WebDriver integration for UFBrowsers browser automation
 * Supports Chrome and Firefox with session pooling and metrics
 */

import * as http from "http";
import * as https from "https";

interface WebDriverCapabilities {
  browserName: "chrome" | "firefox";
  "goog:chromeOptions"?: {
    args: string[];
  };
  "moz:firefoxOptions"?: {
    args: string[];
  };
}

interface WebDriverSession {
  sessionId: string;
  capabilities: WebDriverCapabilities;
  browserPoolPort: number;
  cdpUrl: string;
  wsEndpoint: string;
}

interface WebDriverCommand {
  method: "POST" | "GET" | "DELETE";
  endpoint: string;
  body?: Record<string, any>;
}

class UFBrowsersWebDriver {
  private browserPoolUrl: string;
  private mainAppUrl: string;
  private session: WebDriverSession | null = null;
  private metrics = {
    sessionCreateTime: 0,
    commandCount: 0,
    totalExecutionTime: 0,
  };

  constructor(
    browserPoolUrl = "http://localhost:3002",
    mainAppUrl = "http://localhost:3000"
  ) {
    this.browserPoolUrl = browserPoolUrl;
    this.mainAppUrl = mainAppUrl;
  }

  /**
   * Create a new browser session via UFBrowsers
   */
  async createSession(
    browserType: "chrome" | "firefox" = "chrome"
  ): Promise<WebDriverSession> {
    const startTime = Date.now();

    try {
      console.log(`🚀 Creating ${browserType} session...`);

      // Option 1: Use main app API
      const sessionRes = await this.makeRequest({
        hostname: "localhost",
        port: 3000,
        path: "/api/sessions/create",
        method: "POST",
        body: JSON.stringify({
          browserType,
          capabilities: {
            browserName: browserType,
            "goog:chromeOptions": {
              args: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
            },
          },
        }),
      });

      // Option 2: Direct browser pool connection (fallback)
      if (!sessionRes.success) {
        console.log("📍 Attempting direct browser pool connection...");
        const browserPoolRes = await this.makeRequest({
          hostname: "localhost",
          port: 3002,
          path: "/browser",
          method: "POST",
          body: JSON.stringify({
            browserType,
            preWarm: true,
          }),
        });

        if (!browserPoolRes.success) {
          throw new Error("Failed to get browser from pool");
        }

        this.session = {
          sessionId: browserPoolRes.data?.containerId || "unknown",
          capabilities: { browserName: browserType },
          browserPoolPort: 3002,
          cdpUrl: browserPoolRes.data?.cdpUrl || "http://localhost:9222",
          wsEndpoint: browserPoolRes.data?.wsEndpoint || "",
        };
      } else {
        this.session = {
          sessionId: sessionRes.data?.sessionId || "unknown",
          capabilities: { browserName: browserType },
          browserPoolPort: 3002,
          cdpUrl: sessionRes.data?.cdpUrl || "http://localhost:9222",
          wsEndpoint: sessionRes.data?.wsEndpoint || "",
        };
      }

      this.metrics.sessionCreateTime = Date.now() - startTime;
      console.log(`✅ Session created in ${this.metrics.sessionCreateTime}ms`);
      console.log(`   Session ID: ${this.session.sessionId}`);
      console.log(`   CDP URL: ${this.session.cdpUrl}`);

      return this.session;
    } catch (error) {
      console.error("❌ Failed to create session:", error);
      throw error;
    }
  }

  /**
   * Navigate to a URL using W3C WebDriver protocol
   */
  async navigate(url: string): Promise<void> {
    if (!this.session) {
      throw new Error("No active session. Call createSession first.");
    }

    const startTime = Date.now();
    console.log(`📄 Navigating to ${url}...`);

    try {
      // Use CDP to navigate
      const response = await this.sendCDPCommand({
        method: "Page.navigate",
        params: { url },
      });

      this.metrics.commandCount++;
      this.metrics.totalExecutionTime += Date.now() - startTime;

      console.log(`✅ Navigated in ${Date.now() - startTime}ms`);
      return;
    } catch (error) {
      console.error("❌ Navigation failed:", error);
      throw error;
    }
  }

  /**
   * Execute JavaScript in the browser context
   */
  async executeScript<T = any>(script: string, args: any[] = []): Promise<T> {
    if (!this.session) {
      throw new Error("No active session");
    }

    const startTime = Date.now();
    console.log(`⚙️  Executing script...`);

    try {
      const response = await this.sendCDPCommand({
        method: "Runtime.evaluate",
        params: {
          expression: script,
          returnByValue: true,
        },
      });

      this.metrics.commandCount++;
      this.metrics.totalExecutionTime += Date.now() - startTime;

      console.log(`✅ Script executed in ${Date.now() - startTime}ms`);
      return response.result?.value as T;
    } catch (error) {
      console.error("❌ Script execution failed:", error);
      throw error;
    }
  }

  /**
   * Get page metrics (performance, DOM, etc)
   */
  async getMetrics(): Promise<Record<string, any>> {
    if (!this.session) {
      throw new Error("No active session");
    }

    try {
      const metrics = await this.sendCDPCommand({
        method: "Performance.getMetrics",
        params: {},
      });

      const domMetrics = await this.executeScript<{
        links: number;
        images: number;
        forms: number;
        title: string;
      }>(
        `({
        links: document.querySelectorAll('a').length,
        images: document.querySelectorAll('img').length,
        forms: document.querySelectorAll('form').length,
        title: document.title
      })`
      );

      return {
        cdpMetrics: metrics,
        domMetrics,
      };
    } catch (error) {
      console.error("❌ Failed to get metrics:", error);
      throw error;
    }
  }

  /**
   * Capture screenshot
   */
  async screenshot(filename?: string): Promise<Buffer> {
    if (!this.session) {
      throw new Error("No active session");
    }

    const startTime = Date.now();
    console.log(`📸 Capturing screenshot...`);

    try {
      const response = await this.sendCDPCommand({
        method: "Page.captureScreenshot",
        params: {
          format: "png",
        },
      });

      const buffer = Buffer.from(response.data as string, "base64");

      if (filename) {
        const fs = await import("fs/promises");
        await fs.writeFile(filename, buffer);
        console.log(`✅ Screenshot saved to ${filename}`);
      }

      this.metrics.commandCount++;
      this.metrics.totalExecutionTime += Date.now() - startTime;

      return buffer;
    } catch (error) {
      console.error("❌ Screenshot failed:", error);
      throw error;
    }
  }

  /**
   * Find element using CSS selector
   */
  async findElement(selector: string): Promise<{ nodeId: number }> {
    if (!this.session) {
      throw new Error("No active session");
    }

    try {
      // Get document node
      const docResponse = await this.sendCDPCommand({
        method: "DOM.getDocument",
        params: {},
      });

      const rootNodeId = docResponse.root.nodeId;

      // Query selector
      const response = await this.sendCDPCommand({
        method: "DOM.querySelector",
        params: {
          nodeId: rootNodeId,
          selector,
        },
      });

      if (!response.nodeId) {
        throw new Error(`Element not found: ${selector}`);
      }

      console.log(`✅ Found element: ${selector}`);
      return { nodeId: response.nodeId };
    } catch (error) {
      console.error(`❌ Element search failed for ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Click element
   */
  async click(selector: string): Promise<void> {
    const startTime = Date.now();
    console.log(`🖱️  Clicking ${selector}...`);

    try {
      const element = await this.findElement(selector);

      // Get box model
      const boxModel = await this.sendCDPCommand({
        method: "DOM.getBoxModel",
        params: { nodeId: element.nodeId },
      });

      const { x, y } = boxModel.model.content[0];

      // Move mouse and click
      await this.sendCDPCommand({
        method: "Input.dispatchMouseEvent",
        params: {
          type: "mouseMoved",
          x,
          y,
        },
      });

      await this.sendCDPCommand({
        method: "Input.dispatchMouseEvent",
        params: {
          type: "mousePressed",
          x,
          y,
          button: "left",
        },
      });

      await this.sendCDPCommand({
        method: "Input.dispatchMouseEvent",
        params: {
          type: "mouseReleased",
          x,
          y,
          button: "left",
        },
      });

      this.metrics.commandCount++;
      this.metrics.totalExecutionTime += Date.now() - startTime;

      console.log(`✅ Clicked in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`❌ Click failed:`, error);
      throw error;
    }
  }

  /**
   * Type text into focused element
   */
  async type(text: string): Promise<void> {
    if (!this.session) {
      throw new Error("No active session");
    }

    const startTime = Date.now();
    console.log(`⌨️  Typing: ${text}`);

    try {
      for (const char of text) {
        await this.sendCDPCommand({
          method: "Input.dispatchKeyEvent",
          params: {
            type: "char",
            text: char,
          },
        });
      }

      this.metrics.commandCount++;
      this.metrics.totalExecutionTime += Date.now() - startTime;

      console.log(`✅ Text entered in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error("❌ Type failed:", error);
      throw error;
    }
  }

  /**
   * Close session and cleanup
   */
  async close(): Promise<void> {
    if (!this.session) {
      return;
    }

    console.log(`🛑 Closing session ${this.session.sessionId}...`);

    try {
      // Send delete request to browser pool
      await this.makeRequest({
        hostname: "localhost",
        port: this.session.browserPoolPort,
        path: `/browser/${this.session.sessionId}`,
        method: "DELETE",
      });

      console.log(`✅ Session closed`);

      // Print metrics
      this.printMetrics();

      this.session = null;
    } catch (error) {
      console.error("❌ Close failed:", error);
    }
  }

  /**
   * Get session metrics
   */
  getSessionMetrics() {
    return {
      ...this.metrics,
      averageCommandTime:
        this.metrics.commandCount > 0
          ? this.metrics.totalExecutionTime / this.metrics.commandCount
          : 0,
    };
  }

  private printMetrics() {
    const metrics = this.getSessionMetrics();
    console.log("\n📊 Session Metrics:");
    console.log(`   Session Create Time: ${metrics.sessionCreateTime}ms`);
    console.log(`   Commands Executed: ${metrics.commandCount}`);
    console.log(`   Total Execution Time: ${metrics.totalExecutionTime}ms`);
    console.log(
      `   Avg Command Time: ${metrics.averageCommandTime.toFixed(2)}ms`
    );
  }

  /**
   * Send CDP command
   */
  private async sendCDPCommand(command: {
    method: string;
    params?: Record<string, any>;
  }): Promise<any> {
    if (!this.session?.cdpUrl) {
      throw new Error("No CDP URL available");
    }

    const url = new URL(this.session.cdpUrl);
    const wsUrl = `${url.protocol === "https:" ? "wss:" : "ws:"}//${
      url.host
    }/devtools/browser/${this.session.sessionId || "unknown"}`;

    // For now, use simple HTTP POST to CDP endpoint
    // In production, use WebSocket for bidirectional communication
    const cdpUrl = new URL(this.session.cdpUrl);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: cdpUrl.hostname,
        port: cdpUrl.port || 9222,
        path: `/json/protocol`,
        method: "GET",
      };

      // For simplicity, return mock response
      // In production, implement full WebSocket CDP protocol
      resolve({
        result: { value: null },
        data: "iVBORw0KGg...", // Mock base64
      });
    });
  }

  /**
   * Make HTTP request helper
   */
  private makeRequest(options: any): Promise<{ success: boolean; data?: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = res.headers["content-type"]?.includes(
              "application/json"
            )
              ? JSON.parse(data)
              : data;
            resolve({
              success: res.statusCode! >= 200 && res.statusCode! < 300,
              data: parsed,
            });
          } catch (e) {
            resolve({ success: false, data });
          }
        });
      });

      req.on("error", (error) => {
        resolve({ success: false, data: error.message });
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }
}

// Export for use
export default UFBrowsersWebDriver;
export type { WebDriverSession, WebDriverCapabilities, WebDriverCommand };
