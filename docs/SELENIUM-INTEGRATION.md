# Selenium Integration Guide

Learn how to integrate TGGrid with your Selenium WebDriver tests for parallel execution at scale.

## 🎯 Overview

TGGrid provides a W3C WebDriver-compatible API that works seamlessly with Selenium. You can:
- Use existing Selenium code with minimal changes
- Run tests in parallel across multiple browser instances
- Get ultra-fast session startup times (<100ms)
- Access VNC for debugging and video recording

## 📦 Installation

### Python
```bash
pip install selenium requests
```

### Node.js
```bash
npm install selenium-webdriver axios
```

### Java
```xml
<dependency>
    <groupId>org.seleniumhq.selenium</groupId>
    <artifactId>selenium-java</artifactId>
    <version>4.15.0</version>
</dependency>
```

## 🔐 Authentication

First, authenticate to get a JWT token:

### Python
```python
import requests

def get_auth_token():
    response = requests.post(
        'http://localhost:3000/api/auth/login',
        json={'email': 'test@example.com', 'password': 'test123'}
    )
    return response.json()['token']

token = get_auth_token()
```

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

## 🚀 Creating Sessions

### Method 1: Via TGGrid API (Recommended)

#### Python
```python
import requests
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

class TGGridSelenium:
    def __init__(self, base_url='http://localhost:3000', token=None):
        self.base_url = base_url
        self.token = token
        self.session_id = None
        self.driver = None
    
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
        cdp_url = data['cdpUrl']
        
        # Connect Selenium to the browser
        options = webdriver.ChromeOptions()
        options.debugger_address = cdp_url.replace('http://', '')
        
        self.driver = webdriver.Chrome(options=options)
        return self.driver
    
    def close_session(self):
        """Close the browser session"""
        if self.driver:
            self.driver.quit()
        
        if self.session_id:
            requests.delete(
                f'{self.base_url}/api/sessions/{self.session_id}',
                headers={'Authorization': f'Bearer {self.token}'}
            )

# Usage
token = get_auth_token()
tg = TGGridSelenium(token=token)
driver = tg.create_session('chrome')

try:
    driver.get('https://www.google.com')
    print(driver.title)
finally:
    tg.close_session()
```

#### Node.js
```javascript
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');

class TGGridSelenium {
    constructor(baseUrl = 'http://localhost:3000', token) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.sessionId = null;
        this.driver = null;
    }
    
    async createSession(browser = 'chrome') {
        const response = await axios.post(
            `${this.baseUrl}/api/sessions/create`,
            {
                browser,
                vncEnabled: true,
                videoEnabled: true,
                resolution: '1920x1080'
            },
            {
                headers: { Authorization: `Bearer ${this.token}` }
            }
        );
        
        this.sessionId = response.data.session.id;
        const cdpUrl = response.data.cdpUrl;
        
        // Connect Selenium to the browser
        const options = new chrome.Options();
        options.debuggerAddress(cdpUrl.replace('http://', ''));
        
        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
        
        return this.driver;
    }
    
    async closeSession() {
        if (this.driver) {
            await this.driver.quit();
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
    const tg = new TGGridSelenium('http://localhost:3000', token);
    const driver = await tg.createSession('chrome');
    
    try {
        await driver.get('https://www.google.com');
        console.log(await driver.getTitle());
    } finally {
        await tg.closeSession();
    }
})();
```

### Method 2: Direct Browser Pool Access (Ultra-Fast)

For maximum speed, bypass the main API and connect directly to the browser pool:

#### Python
```python
import requests
from selenium import webdriver

def create_ultra_fast_session(browser='chrome'):
    # Get browser from pool
    response = requests.post(
        'http://localhost:3002/browser',
        json={'browserType': browser}
    )
    
    data = response.json()
    cdp_url = data['cdpUrl']
    
    # Connect Selenium
    options = webdriver.ChromeOptions()
    options.debugger_address = cdp_url.replace('http://', '')
    
    driver = webdriver.Chrome(options=options)
    return driver, data['containerId']

# Usage
driver, container_id = create_ultra_fast_session('chrome')
try:
    driver.get('https://www.example.com')
    print(driver.title)
finally:
    driver.quit()
    # Release browser back to pool
    requests.post(
        f'http://localhost:3002/browser/{container_id}/release'
    )
```

## 🔄 Parallel Execution

### Python - ThreadPoolExecutor

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from selenium import webdriver

def run_test(test_id, token):
    """Run a single test"""
    tg = TGGridSelenium(token=token)
    driver = tg.create_session('chrome')
    
    try:
        driver.get(f'https://www.example.com/page-{test_id}')
        
        # Your test logic here
        title = driver.title
        print(f'Test {test_id}: {title}')
        
        return {'test_id': test_id, 'status': 'passed', 'title': title}
    except Exception as e:
        print(f'Test {test_id} failed: {e}')
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
results = run_parallel_tests(num_tests=20, max_workers=10)
print(f'Completed {len(results)} tests')
```

### Node.js - Promise.all

```javascript
const { promisify } = require('util');

async function runTest(testId, token) {
    const tg = new TGGridSelenium('http://localhost:3000', token);
    const driver = await tg.createSession('chrome');
    
    try {
        await driver.get(`https://www.example.com/page-${testId}`);
        
        // Your test logic here
        const title = await driver.getTitle();
        console.log(`Test ${testId}: ${title}`);
        
        return { testId, status: 'passed', title };
    } catch (error) {
        console.error(`Test ${testId} failed:`, error);
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
    const results = await runParallelTests(20);
    console.log(`Completed ${results.length} tests`);
    console.log(results);
})();
```

### Java - ExecutorService

```java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import java.util.concurrent.*;
import java.util.*;

public class TGGridParallelTests {
    
    private static String getAuthToken() {
        // Implement authentication
        return "your-token";
    }
    
    static class TestTask implements Callable<Map<String, Object>> {
        private final int testId;
        private final String token;
        
        TestTask(int testId, String token) {
            this.testId = testId;
            this.token = token;
        }
        
        @Override
        public Map<String, Object> call() {
            TGGridSelenium tg = new TGGridSelenium(token);
            WebDriver driver = null;
            
            try {
                driver = tg.createSession("chrome");
                driver.get("https://www.example.com/page-" + testId);
                
                String title = driver.getTitle();
                System.out.println("Test " + testId + ": " + title);
                
                Map<String, Object> result = new HashMap<>();
                result.put("testId", testId);
                result.put("status", "passed");
                result.put("title", title);
                return result;
                
            } catch (Exception e) {
                System.err.println("Test " + testId + " failed: " + e.getMessage());
                Map<String, Object> result = new HashMap<>();
                result.put("testId", testId);
                result.put("status", "failed");
                result.put("error", e.getMessage());
                return result;
                
            } finally {
                if (tg != null) {
                    tg.closeSession();
                }
            }
        }
    }
    
    public static void main(String[] args) throws Exception {
        String token = getAuthToken();
        int numTests = 20;
        int numThreads = 10;
        
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        List<Future<Map<String, Object>>> futures = new ArrayList<>();
        
        // Submit all tests
        for (int i = 0; i < numTests; i++) {
            futures.add(executor.submit(new TestTask(i, token)));
        }
        
        // Wait for all tests to complete
        List<Map<String, Object>> results = new ArrayList<>();
        for (Future<Map<String, Object>> future : futures) {
            results.add(future.get());
        }
        
        executor.shutdown();
        System.out.println("Completed " + results.size() + " tests");
    }
}
```

## 📊 Best Practices

### 1. Connection Pooling
Reuse authentication tokens across multiple tests:

```python
# Global token - authenticate once
AUTH_TOKEN = get_auth_token()

def run_test(test_id):
    tg = TGGridSelenium(token=AUTH_TOKEN)
    # ... rest of test
```

### 2. Error Handling
Always close sessions even on failure:

```python
try:
    driver = tg.create_session('chrome')
    # ... test logic
finally:
    tg.close_session()  # Always cleanup
```

### 3. Parallel Workers
Match worker count to available browser pool size:

```python
# If BROWSER_POOL_SIZE=20, use max_workers=15-18
# Leave headroom for burst capacity
run_parallel_tests(num_tests=100, max_workers=15)
```

### 4. Timeout Configuration
Set appropriate timeouts:

```python
driver.set_page_load_timeout(30)
driver.set_script_timeout(30)
driver.implicitly_wait(10)
```

### 5. Session Cleanup
Monitor and cleanup stale sessions:

```python
def cleanup_stale_sessions(token):
    response = requests.get(
        'http://localhost:3000/api/sessions/list',
        headers={'Authorization': f'Bearer {token}'}
    )
    
    sessions = response.json()
    for session in sessions:
        # Close sessions older than 1 hour
        if session['status'] == 'running' and is_old(session['createdAt']):
            requests.delete(
                f'http://localhost:3000/api/sessions/{session["id"]}',
                headers={'Authorization': f'Bearer {token}'}
            )
```

## 🔍 Debugging

### Access VNC
When `vncEnabled: true`, get VNC URL:

```python
response = requests.post(
    'http://localhost:3000/api/sessions/create',
    json={'browser': 'chrome', 'vncEnabled': True},
    headers={'Authorization': f'Bearer {token}'}
)

vnc_url = response.json()['vncUrl']
print(f'View browser at: {vnc_url}')
```

### Get Session Metrics
```python
session_id = 'your-session-id'
response = requests.get(
    f'http://localhost:3000/api/sessions/{session_id}',
    headers={'Authorization': f'Bearer {token}'}
)

metrics = response.json()['metrics']
print(f"CPU: {metrics['cpuUsage']}%")
print(f"Memory: {metrics['memoryUsage']}MB")
print(f"Latency: {metrics['latency']}ms")
```

## 🎬 Complete Example

Here's a complete test suite example:

```python
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from concurrent.futures import ThreadPoolExecutor
import time

# Setup
BASE_URL = 'http://localhost:3000'
AUTH_TOKEN = None

def setup():
    global AUTH_TOKEN
    response = requests.post(
        f'{BASE_URL}/api/auth/login',
        json={'email': 'test@example.com', 'password': 'test123'}
    )
    AUTH_TOKEN = response.json()['token']

def test_google_search(query):
    tg = TGGridSelenium(BASE_URL, AUTH_TOKEN)
    driver = tg.create_session('chrome')
    
    try:
        driver.get('https://www.google.com')
        
        # Find search box
        search_box = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, 'q'))
        )
        
        # Type query
        search_box.send_keys(query)
        search_box.submit()
        
        # Wait for results
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, 'search'))
        )
        
        results = driver.find_elements(By.CSS_SELECTOR, 'h3')
        print(f'Query "{query}": Found {len(results)} results')
        
        return {'query': query, 'results': len(results), 'status': 'passed'}
        
    except Exception as e:
        print(f'Query "{query}" failed: {e}')
        return {'query': query, 'status': 'failed', 'error': str(e)}
        
    finally:
        tg.close_session()

def main():
    setup()
    
    queries = [
        'selenium automation',
        'web scraping',
        'python testing',
        'browser automation',
        'parallel testing'
    ]
    
    # Run tests in parallel
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(test_google_search, queries))
    
    duration = time.time() - start_time
    
    # Summary
    passed = sum(1 for r in results if r['status'] == 'passed')
    print(f'\n=== Test Summary ===')
    print(f'Total: {len(results)}')
    print(f'Passed: {passed}')
    print(f'Failed: {len(results) - passed}')
    print(f'Duration: {duration:.2f}s')

if __name__ == '__main__':
    main()
```

## 📚 Next Steps

- **[Parallel Execution](PARALLEL-EXECUTION.md)** - Advanced parallel execution patterns
- **[Playwright Integration](PLAYWRIGHT-INTEGRATION.md)** - Alternative to Selenium
- **[API Reference](API-REFERENCE.md)** - Complete API documentation

## 🆘 Troubleshooting

### "Connection refused"
- Ensure all services are running: `./start-all-services.sh`
- Check service health: `curl http://localhost:3000/api/health`

### "Session creation timeout"
- Increase `CONTAINER_STARTUP_TIMEOUT` in `.env`
- Check Docker has sufficient resources
- Verify browser images are built

### "Token expired"
- Re-authenticate to get a new token
- Check token expiry in response

### "Pool exhausted"
- Increase `BROWSER_POOL_SIZE` in `.env`
- Reduce parallel worker count
- Implement queueing for burst traffic
