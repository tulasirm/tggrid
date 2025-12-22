# Playwright Integration Guide

Learn how to integrate TGGrid with Playwright for modern browser automation and parallel testing.

## 🎯 Overview

TGGrid's Chrome Remote Debugging Protocol (CDP) support makes it fully compatible with Playwright. You get:
- Native CDP connection for ultra-fast automation
- Full Playwright API support
- Parallel execution across multiple browsers
- VNC and video recording for debugging

## 📦 Installation

### Node.js
```bash
npm install playwright axios
```

### Python
```bash
pip install playwright requests
playwright install  # Install browser binaries (optional, using TGGrid containers)
```

## 🔐 Authentication

First, authenticate to get a JWT token:

### Node.js
```javascript
const axios = require('axios');

async function getAuthToken() {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test@example.com',
        password: 'test123'
    });
    return response.data.token;
}
```

### Python
```python
import requests

def get_auth_token():
    response = requests.post(
        'http://localhost:3000/api/auth/login',
        json={'email': 'test@example.com', 'password': 'test123'}
    )
    return response.json()['token']
```

## 🚀 Creating Sessions

### Method 1: Via TGGrid API (Recommended)

#### Node.js
```javascript
const { chromium } = require('playwright');
const axios = require('axios');

class TGGridPlaywright {
    constructor(baseUrl = 'http://localhost:3000', token) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.sessionId = null;
        this.browser = null;
        this.context = null;
    }
    
    async createSession(browserType = 'chrome') {
        // Create session via TGGrid
        const response = await axios.post(
            `${this.baseUrl}/api/sessions/create`,
            {
                browser: browserType,
                vncEnabled: true,
                videoEnabled: true,
                resolution: '1920x1080'
            },
            {
                headers: { Authorization: `Bearer ${this.token}` }
            }
        );
        
        this.sessionId = response.data.session.id;
        const wsEndpoint = response.data.wsEndpoint;
        
        // Connect Playwright to the browser
        this.browser = await chromium.connectOverCDP(wsEndpoint);
        
        // Get the default context or create a new one
        const contexts = this.browser.contexts();
        if (contexts.length > 0) {
            this.context = contexts[0];
        } else {
            this.context = await this.browser.newContext();
        }
        
        return this.context;
    }
    
    async closeSession() {
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.sessionId) {
            await axios.delete(
                `${this.baseUrl}/api/sessions/${this.sessionId}`,
                {
                    headers: { Authorization: `Bearer ${this.token}` }
                }
            );
        }
    }
}

// Usage
(async () => {
    const token = await getAuthToken();
    const tg = new TGGridPlaywright('http://localhost:3000', token);
    const context = await tg.createSession('chrome');
    
    const page = await context.newPage();
    
    try {
        await page.goto('https://www.google.com');
        console.log(await page.title());
        
        // Take screenshot
        await page.screenshot({ path: 'screenshot.png' });
    } finally {
        await tg.closeSession();
    }
})();
```

#### Python
```python
import requests
from playwright.sync_api import sync_playwright

class TGGridPlaywright:
    def __init__(self, base_url='http://localhost:3000', token=None):
        self.base_url = base_url
        self.token = token
        self.session_id = None
        self.browser = None
        self.context = None
        self.playwright = None
    
    def create_session(self, browser='chrome'):
        """Create a browser session via TGGrid"""
        response = requests.post(
            f'{self.base_url}/api/sessions/create',
            json={
                'browser': browser,
                'vncEnabled': True,
                'videoEnabled': True,
                'resolution': '1920x1080'
            },
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        data = response.json()
        self.session_id = data['session']['id']
        ws_endpoint = data['wsEndpoint']
        
        # Connect Playwright to the browser
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.connect_over_cdp(ws_endpoint)
        
        # Get the default context or create a new one
        contexts = self.browser.contexts
        if contexts:
            self.context = contexts[0]
        else:
            self.context = self.browser.new_context()
        
        return self.context
    
    def close_session(self):
        """Close the browser session"""
        if self.browser:
            self.browser.close()
        
        if self.playwright:
            self.playwright.stop()
        
        if self.session_id:
            requests.delete(
                f'{self.base_url}/api/sessions/{self.session_id}',
                headers={'Authorization': f'Bearer {self.token}'}
            )

# Usage
token = get_auth_token()
tg = TGGridPlaywright(token=token)
context = tg.create_session('chrome')

page = context.new_page()

try:
    page.goto('https://www.google.com')
    print(page.title())
    
    # Take screenshot
    page.screenshot(path='screenshot.png')
finally:
    tg.close_session()
```

### Method 2: Direct Browser Pool Access (Ultra-Fast)

#### Node.js
```javascript
const { chromium } = require('playwright');
const axios = require('axios');

async function createUltraFastSession(browserType = 'chrome') {
    // Get browser from pool
    const response = await axios.post('http://localhost:3002/browser', {
        browserType
    });
    
    const { wsEndpoint, containerId } = response.data;
    
    // Connect Playwright
    const browser = await chromium.connectOverCDP(wsEndpoint);
    const context = browser.contexts()[0] || await browser.newContext();
    
    return { browser, context, containerId };
}

async function releaseSession(containerId) {
    await axios.post(`http://localhost:3002/browser/${containerId}/release`);
}

// Usage
(async () => {
    const { browser, context, containerId } = await createUltraFastSession('chrome');
    const page = await context.newPage();
    
    try {
        await page.goto('https://www.example.com');
        console.log(await page.title());
    } finally {
        await browser.close();
        await releaseSession(containerId);
    }
})();
```

## 🔄 Parallel Execution

### Node.js - Promise.all

```javascript
async function runTest(testId, token) {
    const tg = new TGGridPlaywright('http://localhost:3000', token);
    const context = await tg.createSession('chrome');
    const page = await context.newPage();
    
    try {
        await page.goto(`https://www.example.com/page-${testId}`);
        
        // Your test logic here
        const title = await page.title();
        console.log(`Test ${testId}: ${title}`);
        
        // Take screenshot
        await page.screenshot({ path: `test-${testId}.png` });
        
        return { testId, status: 'passed', title };
    } catch (error) {
        console.error(`Test ${testId} failed:`, error);
        
        // Screenshot on failure
        try {
            await page.screenshot({ path: `test-${testId}-error.png` });
        } catch {}
        
        return { testId, status: 'failed', error: error.message };
    } finally {
        await tg.closeSession();
    }
}

async function runParallelTests(numTests = 10) {
    const token = await getAuthToken();
    
    // Create array of promises
    const promises = [];
    for (let i = 0; i < numTests; i++) {
        promises.push(runTest(i, token));
    }
    
    // Run all tests in parallel
    const results = await Promise.all(promises);
    return results;
}

// Run 20 tests in parallel
(async () => {
    const startTime = Date.now();
    const results = await runParallelTests(20);
    const duration = (Date.now() - startTime) / 1000;
    
    const passed = results.filter(r => r.status === 'passed').length;
    console.log(`\n=== Test Summary ===`);
    console.log(`Total: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${results.length - passed}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
})();
```

### Python - ThreadPoolExecutor

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from playwright.sync_api import sync_playwright

def run_test(test_id, token):
    """Run a single test"""
    tg = TGGridPlaywright(token=token)
    context = tg.create_session('chrome')
    page = context.new_page()
    
    try:
        page.goto(f'https://www.example.com/page-{test_id}')
        
        # Your test logic here
        title = page.title()
        print(f'Test {test_id}: {title}')
        
        # Take screenshot
        page.screenshot(path=f'test-{test_id}.png')
        
        return {'test_id': test_id, 'status': 'passed', 'title': title}
    except Exception as e:
        print(f'Test {test_id} failed: {e}')
        
        # Screenshot on failure
        try:
            page.screenshot(path=f'test-{test_id}-error.png')
        except:
            pass
        
        return {'test_id': test_id, 'status': 'failed', 'error': str(e)}
    finally:
        tg.close_session()

def run_parallel_tests(num_tests=10, max_workers=5):
    """Run multiple tests in parallel"""
    token = get_auth_token()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(run_test, i, token): i 
            for i in range(num_tests)
        }
        
        results = []
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
        
        return results

# Run 20 tests with 10 parallel workers
import time
start_time = time.time()
results = run_parallel_tests(num_tests=20, max_workers=10)
duration = time.time() - start_time

passed = sum(1 for r in results if r['status'] == 'passed')
print(f'\n=== Test Summary ===')
print(f'Total: {len(results)}')
print(f'Passed: {passed}')
print(f'Failed: {len(results) - passed}')
print(f'Duration: {duration:.2f}s')
```

### Python Async - asyncio

```python
import asyncio
import requests
from playwright.async_api import async_playwright

class AsyncTGGridPlaywright:
    def __init__(self, base_url='http://localhost:3000', token=None):
        self.base_url = base_url
        self.token = token
        self.session_id = None
        self.browser = None
        self.context = None
        self.playwright = None
    
    async def create_session(self, browser='chrome'):
        """Create a browser session via TGGrid"""
        # Use sync requests for API call
        response = requests.post(
            f'{self.base_url}/api/sessions/create',
            json={
                'browser': browser,
                'vncEnabled': True,
                'videoEnabled': True
            },
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        data = response.json()
        self.session_id = data['session']['id']
        ws_endpoint = data['wsEndpoint']
        
        # Connect Playwright
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.connect_over_cdp(ws_endpoint)
        
        contexts = self.browser.contexts
        if contexts:
            self.context = contexts[0]
        else:
            self.context = await self.browser.new_context()
        
        return self.context
    
    async def close_session(self):
        """Close the browser session"""
        if self.browser:
            await self.browser.close()
        
        if self.playwright:
            await self.playwright.stop()
        
        if self.session_id:
            requests.delete(
                f'{self.base_url}/api/sessions/{self.session_id}',
                headers={'Authorization': f'Bearer {self.token}'}
            )

async def run_test_async(test_id, token):
    """Run a single test asynchronously"""
    tg = AsyncTGGridPlaywright(token=token)
    context = await tg.create_session('chrome')
    page = await context.new_page()
    
    try:
        await page.goto(f'https://www.example.com/page-{test_id}')
        title = await page.title()
        print(f'Test {test_id}: {title}')
        
        await page.screenshot(path=f'test-{test_id}.png')
        
        return {'test_id': test_id, 'status': 'passed', 'title': title}
    except Exception as e:
        print(f'Test {test_id} failed: {e}')
        return {'test_id': test_id, 'status': 'failed', 'error': str(e)}
    finally:
        await tg.close_session()

async def run_parallel_tests_async(num_tests=10):
    """Run multiple tests in parallel using asyncio"""
    token = get_auth_token()
    
    tasks = [run_test_async(i, token) for i in range(num_tests)]
    results = await asyncio.gather(*tasks)
    
    return results

# Run tests
results = asyncio.run(run_parallel_tests_async(20))
```

## 🎯 Advanced Playwright Features

### Auto-waiting and Assertions

```javascript
const { expect } = require('@playwright/test');

async function testWithAssertions(token) {
    const tg = new TGGridPlaywright('http://localhost:3000', token);
    const context = await tg.createSession('chrome');
    const page = await context.newPage();
    
    try {
        await page.goto('https://www.example.com');
        
        // Auto-wait for element
        const heading = await page.locator('h1').textContent();
        console.log('Heading:', heading);
        
        // Click button with auto-wait
        await page.click('button[type="submit"]');
        
        // Wait for navigation
        await page.waitForURL('**/success');
        
        // Assert using Playwright's expect
        await expect(page.locator('.success-message')).toBeVisible();
        
        return { status: 'passed' };
    } finally {
        await tg.closeSession();
    }
}
```

### Network Interception

```javascript
async function testWithNetworkInterception(token) {
    const tg = new TGGridPlaywright('http://localhost:3000', token);
    const context = await tg.createSession('chrome');
    const page = await context.newPage();
    
    try {
        // Intercept API calls
        await page.route('**/api/**', route => {
            console.log('API call:', route.request().url());
            route.continue();
        });
        
        // Block images
        await page.route('**/*.{png,jpg,jpeg}', route => route.abort());
        
        await page.goto('https://www.example.com');
        
        return { status: 'passed' };
    } finally {
        await tg.closeSession();
    }
}
```

### Browser Context Configuration

```javascript
async function testWithCustomContext(token) {
    const tg = new TGGridPlaywright('http://localhost:3000', token);
    
    // First connect to get browser
    const response = await axios.post(
        'http://localhost:3000/api/sessions/create',
        {
            browser: 'chrome',
            vncEnabled: true
        },
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    
    tg.sessionId = response.data.session.id;
    const wsEndpoint = response.data.wsEndpoint;
    
    const { chromium } = require('playwright');
    const browser = await chromium.connectOverCDP(wsEndpoint);
    
    // Create custom context
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Custom User Agent',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation'],
        geolocation: { latitude: 40.7128, longitude: -74.0060 },
        colorScheme: 'dark'
    });
    
    const page = await context.newPage();
    
    try {
        await page.goto('https://www.example.com');
        return { status: 'passed' };
    } finally {
        await browser.close();
        await tg.closeSession();
    }
}
```

## 📊 Best Practices

### 1. Connection Reuse
Reuse authentication token:

```javascript
const AUTH_TOKEN = await getAuthToken();

async function runTest(testId) {
    const tg = new TGGridPlaywright('http://localhost:3000', AUTH_TOKEN);
    // ... test logic
}
```

### 2. Error Handling
Always close sessions:

```javascript
try {
    const context = await tg.createSession('chrome');
    // ... test logic
} finally {
    await tg.closeSession();  // Always cleanup
}
```

### 3. Screenshots on Failure
Capture evidence:

```javascript
try {
    // test logic
} catch (error) {
    await page.screenshot({ path: `error-${Date.now()}.png`, fullPage: true });
    throw error;
}
```

### 4. Parallel Workers
Match pool size:

```javascript
// If BROWSER_POOL_SIZE=20, use 15-18 concurrent tests
const results = await runParallelTests(100, 15);
```

### 5. Timeouts
Configure appropriate timeouts:

```javascript
page.setDefaultTimeout(30000);  // 30 seconds
page.setDefaultNavigationTimeout(60000);  // 60 seconds
```

## 🔍 Debugging

### Playwright Inspector
Enable debugging:

```javascript
const { chromium } = require('playwright');

// Set environment variable
process.env.PWDEBUG = '1';

// Your test code
const tg = new TGGridPlaywright('http://localhost:3000', token);
const context = await tg.createSession('chrome');
```

### Trace Viewer
Record traces:

```javascript
const context = await tg.createSession('chrome');

// Start tracing
await context.tracing.start({ screenshots: true, snapshots: true });

try {
    const page = await context.newPage();
    await page.goto('https://www.example.com');
    // ... test actions
} finally {
    // Stop tracing and save
    await context.tracing.stop({ path: 'trace.zip' });
    await tg.closeSession();
}

// View trace: npx playwright show-trace trace.zip
```

## 🎬 Complete Example

```javascript
const { chromium } = require('playwright');
const axios = require('axios');

class TGGridPlaywright {
    constructor(baseUrl = 'http://localhost:3000', token) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.sessionId = null;
        this.browser = null;
        this.context = null;
    }
    
    async createSession(browserType = 'chrome') {
        const response = await axios.post(
            `${this.baseUrl}/api/sessions/create`,
            {
                browser: browserType,
                vncEnabled: true,
                videoEnabled: true
            },
            {
                headers: { Authorization: `Bearer ${this.token}` }
            }
        );
        
        this.sessionId = response.data.session.id;
        const wsEndpoint = response.data.wsEndpoint;
        
        this.browser = await chromium.connectOverCDP(wsEndpoint);
        const contexts = this.browser.contexts();
        this.context = contexts[0] || await this.browser.newContext();
        
        return this.context;
    }
    
    async closeSession() {
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.sessionId) {
            await axios.delete(
                `${this.baseUrl}/api/sessions/${this.sessionId}`,
                {
                    headers: { Authorization: `Bearer ${this.token}` }
                }
            );
        }
    }
}

async function testGoogleSearch(query, token) {
    const tg = new TGGridPlaywright('http://localhost:3000', token);
    const context = await tg.createSession('chrome');
    const page = await context.newPage();
    
    try {
        await page.goto('https://www.google.com');
        
        // Search
        await page.fill('input[name="q"]', query);
        await page.press('input[name="q"]', 'Enter');
        
        // Wait for results
        await page.waitForSelector('#search');
        
        // Count results
        const results = await page.locator('h3').count();
        console.log(`Query "${query}": Found ${results} results`);
        
        // Screenshot
        await page.screenshot({ path: `search-${query}.png` });
        
        return { query, results, status: 'passed' };
    } catch (error) {
        console.error(`Query "${query}" failed:`, error);
        await page.screenshot({ path: `error-${query}.png` });
        return { query, status: 'failed', error: error.message };
    } finally {
        await tg.closeSession();
    }
}

async function main() {
    // Authenticate
    const authResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test@example.com',
        password: 'test123'
    });
    const token = authResponse.data.token;
    
    // Run parallel tests
    const queries = [
        'playwright automation',
        'web scraping',
        'browser testing',
        'parallel execution',
        'CI/CD testing'
    ];
    
    const startTime = Date.now();
    const results = await Promise.all(
        queries.map(query => testGoogleSearch(query, token))
    );
    const duration = (Date.now() - startTime) / 1000;
    
    // Summary
    const passed = results.filter(r => r.status === 'passed').length;
    console.log('\n=== Test Summary ===');
    console.log(`Total: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${results.length - passed}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
}

main().catch(console.error);
```

## 📚 Next Steps

- **[Parallel Execution](PARALLEL-EXECUTION.md)** - Advanced parallel patterns
- **[Selenium Integration](SELENIUM-INTEGRATION.md)** - Alternative automation tool
- **[API Reference](API-REFERENCE.md)** - Complete API documentation

## 🆘 Troubleshooting

### "Protocol error: Connection closed"
- Ensure services are running
- Check browser pool has capacity
- Verify WebSocket endpoint is accessible

### "Timeout exceeded"
- Increase page timeouts
- Check network connectivity
- Verify target website is accessible

### "CDP session closed"
- Session may have been terminated
- Check session still exists in dashboard
- Ensure cleanup is not premature

### "Cannot connect to CDP"
- Verify `wsEndpoint` is correct
- Check container is still running: `docker ps`
- Ensure port is accessible
