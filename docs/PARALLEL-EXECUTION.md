# Parallel Execution Guide

Master parallel test execution with TGGrid for maximum throughput and efficiency.

## 🎯 Overview

TGGrid is designed for massive parallel execution with:
- **Ultra-fast startup**: <100ms session creation
- **Pre-warmed pool**: Containers ready before request
- **Efficient reuse**: Sub-second container recycling
- **Resource optimization**: 256MB per container, 0.5 CPU
- **Auto-scaling**: Dynamic pool size adjustment

## 📊 Performance Characteristics

### Throughput Metrics
- **Pool hits**: ~50ms session startup
- **Pool misses**: ~2-5s container creation
- **Concurrent limit**: 100+ sessions (hardware dependent)
- **Pool efficiency**: 90%+ reuse rate at steady state

### Resource Requirements
Per browser instance:
- **Memory**: 256MB (configurable)
- **CPU**: 0.5 core (configurable)
- **Disk**: Minimal (ephemeral containers)
- **Network**: <1Mbps per session

## ⚙️ Configuration

### Environment Variables

```bash
# Browser Pool Configuration
BROWSER_POOL_SIZE=50              # Maximum concurrent browsers
PRE_WARM_COUNT=25                 # Pre-warmed containers
CONTAINER_STARTUP_TIMEOUT=5000    # Milliseconds
MAX_MEMORY_PER_CONTAINER=256      # MB
MAX_CPU_PER_CONTAINER=0.5         # CPU quota

# Load Balancer
ENABLE_LOAD_BALANCER=true
LOAD_BALANCER_ALGORITHM=resource-based  # round-robin, least-connections, resource-based
```

### Optimal Settings by Scale

#### Small Scale (1-10 concurrent tests)
```bash
BROWSER_POOL_SIZE=15
PRE_WARM_COUNT=5
MAX_MEMORY_PER_CONTAINER=512
MAX_CPU_PER_CONTAINER=1.0
```

#### Medium Scale (10-50 concurrent tests)
```bash
BROWSER_POOL_SIZE=60
PRE_WARM_COUNT=20
MAX_MEMORY_PER_CONTAINER=256
MAX_CPU_PER_CONTAINER=0.5
```

#### Large Scale (50-100+ concurrent tests)
```bash
BROWSER_POOL_SIZE=120
PRE_WARM_COUNT=40
MAX_MEMORY_PER_CONTAINER=128
MAX_CPU_PER_CONTAINER=0.25
```

## 🚀 Parallel Execution Patterns

### 1. Fixed Concurrency

Control exact number of parallel workers:

#### Python - ThreadPoolExecutor
```python
from concurrent.futures import ThreadPoolExecutor
import requests

def run_test(test_id, token):
    # Test implementation
    pass

def run_with_fixed_concurrency(tests, max_workers=10):
    token = get_auth_token()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(run_test, test, token) for test in tests]
        results = [future.result() for future in futures]
    
    return results

# Run 100 tests with 10 concurrent workers
tests = list(range(100))
results = run_with_fixed_concurrency(tests, max_workers=10)
```

#### Node.js - p-limit
```bash
npm install p-limit
```

```javascript
const pLimit = require('p-limit');

async function runTest(testId, token) {
    // Test implementation
}

async function runWithFixedConcurrency(tests, concurrency = 10) {
    const token = await getAuthToken();
    const limit = pLimit(concurrency);
    
    const promises = tests.map(test => 
        limit(() => runTest(test, token))
    );
    
    return await Promise.all(promises);
}

// Run 100 tests with 10 concurrent workers
const tests = Array.from({ length: 100 }, (_, i) => i);
const results = await runWithFixedConcurrency(tests, 10);
```

### 2. Dynamic Concurrency

Adjust concurrency based on pool availability:

#### Python
```python
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def get_pool_metrics():
    response = requests.get('http://localhost:3002/metrics')
    return response.json()

def calculate_optimal_workers():
    metrics = get_pool_metrics()
    available = metrics['poolSize'] - metrics['activeContainers']
    # Use 80% of available capacity
    return max(1, int(available * 0.8))

def run_adaptive_parallel_tests(tests):
    token = get_auth_token()
    results = []
    remaining_tests = list(tests)
    
    while remaining_tests:
        # Calculate current optimal concurrency
        optimal_workers = calculate_optimal_workers()
        print(f"Running with {optimal_workers} workers")
        
        # Take batch of tests
        batch = remaining_tests[:optimal_workers * 2]
        remaining_tests = remaining_tests[optimal_workers * 2:]
        
        # Run batch
        with ThreadPoolExecutor(max_workers=optimal_workers) as executor:
            futures = [executor.submit(run_test, test, token) for test in batch]
            batch_results = [future.result() for future in as_completed(futures)]
        
        results.extend(batch_results)
        
        # Brief pause between batches
        if remaining_tests:
            time.sleep(1)
    
    return results

# Run 200 tests with adaptive concurrency
tests = list(range(200))
results = run_adaptive_parallel_tests(tests)
```

### 3. Queue-Based Execution

Use queues for controlled throughput:

#### Python - Queue
```python
import queue
import threading
import requests

def worker(test_queue, result_queue, token):
    """Worker thread that processes tests from queue"""
    while True:
        test = test_queue.get()
        if test is None:  # Poison pill
            break
        
        try:
            result = run_test(test, token)
            result_queue.put(result)
        except Exception as e:
            result_queue.put({'test': test, 'error': str(e)})
        finally:
            test_queue.task_done()

def run_queue_based_tests(tests, num_workers=10):
    token = get_auth_token()
    
    test_queue = queue.Queue()
    result_queue = queue.Queue()
    
    # Start workers
    workers = []
    for _ in range(num_workers):
        t = threading.Thread(target=worker, args=(test_queue, result_queue, token))
        t.start()
        workers.append(t)
    
    # Add tests to queue
    for test in tests:
        test_queue.put(test)
    
    # Wait for completion
    test_queue.join()
    
    # Stop workers
    for _ in range(num_workers):
        test_queue.put(None)
    for t in workers:
        t.join()
    
    # Collect results
    results = []
    while not result_queue.empty():
        results.append(result_queue.get())
    
    return results

# Run 150 tests with 15 workers
tests = list(range(150))
results = run_queue_based_tests(tests, num_workers=15)
```

#### Node.js - Bull Queue
```bash
npm install bull redis
```

```javascript
const Queue = require('bull');
const Redis = require('ioredis');

// Create queue
const testQueue = new Queue('browser-tests', {
    redis: {
        host: 'localhost',
        port: 6379
    }
});

// Process jobs
testQueue.process(10, async (job) => {  // 10 concurrent workers
    const { testId, token } = job.data;
    
    const tg = new TGGridPlaywright('http://localhost:3000', token);
    const context = await tg.createSession('chrome');
    const page = await context.newPage();
    
    try {
        await page.goto(`https://www.example.com/test-${testId}`);
        const result = await page.title();
        
        return { testId, status: 'passed', title: result };
    } finally {
        await tg.closeSession();
    }
});

// Add tests to queue
async function queueTests(numTests) {
    const token = await getAuthToken();
    
    for (let i = 0; i < numTests; i++) {
        await testQueue.add({ testId: i, token });
    }
}

// Monitor progress
testQueue.on('completed', (job, result) => {
    console.log(`Test ${result.testId} completed:`, result.status);
});

testQueue.on('failed', (job, err) => {
    console.error(`Test ${job.data.testId} failed:`, err.message);
});

// Add 200 tests
await queueTests(200);
```

### 4. Batch Processing

Process tests in batches:

#### Python
```python
def run_batch(batch, token):
    """Run a batch of tests in parallel"""
    with ThreadPoolExecutor(max_workers=len(batch)) as executor:
        futures = [executor.submit(run_test, test, token) for test in batch]
        return [future.result() for future in futures]

def run_batched_tests(tests, batch_size=10):
    """Process tests in batches"""
    token = get_auth_token()
    results = []
    
    for i in range(0, len(tests), batch_size):
        batch = tests[i:i + batch_size]
        print(f"Processing batch {i // batch_size + 1} ({len(batch)} tests)")
        
        batch_results = run_batch(batch, token)
        results.extend(batch_results)
        
        # Optional: brief pause between batches
        time.sleep(0.5)
    
    return results

# Run 100 tests in batches of 10
tests = list(range(100))
results = run_batched_tests(tests, batch_size=10)
```

## 📈 Monitoring & Metrics

### Real-Time Pool Monitoring

```python
import requests
import time

def monitor_pool(interval=5):
    """Monitor pool metrics in real-time"""
    while True:
        response = requests.get('http://localhost:3002/metrics')
        metrics = response.json()
        
        print(f"\n=== Pool Metrics ===")
        print(f"Pool Size: {metrics['poolSize']}")
        print(f"Active: {metrics['activeContainers']}")
        print(f"Available: {metrics['poolSize'] - metrics['activeContainers']}")
        print(f"Total Created: {metrics['totalCreated']}")
        print(f"Total Reused: {metrics['totalReused']}")
        print(f"Pool Hits: {metrics['poolHits']}")
        print(f"Pool Misses: {metrics['poolMisses']}")
        print(f"Avg Startup: {metrics['avgStartupTime']}ms")
        print(f"Reuse Rate: {metrics['totalReused'] / max(1, metrics['totalCreated']) * 100:.1f}%")
        
        time.sleep(interval)

# Run in separate thread
import threading
monitor_thread = threading.Thread(target=monitor_pool, daemon=True)
monitor_thread.start()
```

### Test Execution Metrics

```python
import time
from dataclasses import dataclass
from typing import List

@dataclass
class ExecutionMetrics:
    total_tests: int
    passed: int
    failed: int
    duration: float
    avg_test_time: float
    tests_per_second: float
    
    def print_summary(self):
        print("\n=== Execution Summary ===")
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed} ({self.passed / self.total_tests * 100:.1f}%)")
        print(f"Failed: {self.failed} ({self.failed / self.total_tests * 100:.1f}%)")
        print(f"Duration: {self.duration:.2f}s")
        print(f"Avg Test Time: {self.avg_test_time:.2f}s")
        print(f"Throughput: {self.tests_per_second:.2f} tests/sec")

def run_with_metrics(tests, max_workers=10):
    """Run tests and collect metrics"""
    start_time = time.time()
    test_times = []
    
    def run_test_timed(test, token):
        test_start = time.time()
        result = run_test(test, token)
        test_time = time.time() - test_start
        test_times.append(test_time)
        return result
    
    token = get_auth_token()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(run_test_timed, test, token) for test in tests]
        results = [future.result() for future in futures]
    
    duration = time.time() - start_time
    passed = sum(1 for r in results if r.get('status') == 'passed')
    failed = len(results) - passed
    
    metrics = ExecutionMetrics(
        total_tests=len(tests),
        passed=passed,
        failed=failed,
        duration=duration,
        avg_test_time=sum(test_times) / len(test_times),
        tests_per_second=len(tests) / duration
    )
    
    metrics.print_summary()
    return results, metrics
```

## 🎯 Optimization Strategies

### 1. Pre-Warming Strategy

Warm up pool before test runs:

```python
def pre_warm_pool(count=10):
    """Pre-warm browser pool"""
    print(f"Pre-warming {count} containers...")
    
    response = requests.post(
        'http://localhost:3002/prewarm',
        json={'count': count, 'browserType': 'chrome'}
    )
    
    print(f"Pre-warmed {response.json()['warmed']} containers")

# Pre-warm before test execution
pre_warm_pool(20)
time.sleep(5)  # Allow containers to fully initialize

# Run tests
results = run_parallel_tests(tests, max_workers=15)
```

### 2. Smart Worker Allocation

```python
def calculate_workers(pool_size, pool_pre_warm, total_tests):
    """Calculate optimal worker count"""
    # Use 80% of pre-warmed containers
    initial_workers = int(pool_pre_warm * 0.8)
    
    # Scale up if more tests than workers
    if total_tests > initial_workers * 5:
        return min(pool_size - 5, initial_workers * 2)
    
    return initial_workers

# Auto-calculate workers
POOL_SIZE = 50
PRE_WARM = 20
tests = list(range(200))

workers = calculate_workers(POOL_SIZE, PRE_WARM, len(tests))
print(f"Using {workers} workers for {len(tests)} tests")

results = run_parallel_tests(tests, max_workers=workers)
```

### 3. Test Grouping

Group similar tests to optimize resource usage:

```python
def group_tests_by_type(tests):
    """Group tests by characteristics"""
    groups = {
        'fast': [],     # <5s tests
        'medium': [],   # 5-15s tests
        'slow': []      # >15s tests
    }
    
    for test in tests:
        if test.estimated_time < 5:
            groups['fast'].append(test)
        elif test.estimated_time < 15:
            groups['medium'].append(test)
        else:
            groups['slow'].append(test)
    
    return groups

def run_grouped_tests(tests):
    """Run tests in groups with optimal concurrency"""
    groups = group_tests_by_type(tests)
    results = []
    
    # Run fast tests with high concurrency
    if groups['fast']:
        print(f"Running {len(groups['fast'])} fast tests...")
        results.extend(run_parallel_tests(groups['fast'], max_workers=20))
    
    # Run medium tests with moderate concurrency
    if groups['medium']:
        print(f"Running {len(groups['medium'])} medium tests...")
        results.extend(run_parallel_tests(groups['medium'], max_workers=10))
    
    # Run slow tests with low concurrency
    if groups['slow']:
        print(f"Running {len(groups['slow'])} slow tests...")
        results.extend(run_parallel_tests(groups['slow'], max_workers=5))
    
    return results
```

### 4. Retry Strategy

Implement smart retries for failed tests:

```python
def run_with_retry(test, token, max_retries=3):
    """Run test with retry logic"""
    for attempt in range(max_retries):
        try:
            result = run_test(test, token)
            if result['status'] == 'passed':
                return result
        except Exception as e:
            if attempt == max_retries - 1:
                return {'test': test, 'status': 'failed', 'error': str(e)}
            
            # Exponential backoff
            time.sleep(2 ** attempt)
    
    return {'test': test, 'status': 'failed', 'error': 'Max retries exceeded'}

def run_with_retries(tests, max_workers=10):
    """Run tests with automatic retry"""
    token = get_auth_token()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(run_with_retry, test, token) for test in tests]
        results = [future.result() for future in futures]
    
    return results
```

## 🏗️ Production Patterns

### Complete Production Example

```python
#!/usr/bin/env python3
"""
TGGrid Parallel Test Executor
Production-ready parallel test execution with monitoring and reporting
"""

import requests
import time
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from typing import List, Dict, Any

@dataclass
class TestResult:
    test_id: int
    status: str
    duration: float
    error: str = None
    retries: int = 0

class ParallelTestExecutor:
    def __init__(self, base_url='http://localhost:3000', max_workers=10):
        self.base_url = base_url
        self.max_workers = max_workers
        self.token = None
        self.results = []
        self.start_time = None
    
    def authenticate(self, email, password):
        """Authenticate and get token"""
        response = requests.post(
            f'{self.base_url}/api/auth/login',
            json={'email': email, 'password': password}
        )
        self.token = response.json()['token']
    
    def get_pool_metrics(self):
        """Get current pool metrics"""
        response = requests.get('http://localhost:3002/metrics')
        return response.json()
    
    def run_test(self, test_id, max_retries=3):
        """Run a single test with retries"""
        for attempt in range(max_retries):
            test_start = time.time()
            
            try:
                # Create session
                response = requests.post(
                    f'{self.base_url}/api/sessions/create',
                    json={'browser': 'chrome', 'vncEnabled': True},
                    headers={'Authorization': f'Bearer {self.token}'}
                )
                
                session_data = response.json()
                session_id = session_data['session']['id']
                
                # Your test logic here
                # For example, using Selenium or Playwright
                result = self.execute_test_logic(test_id, session_data)
                
                # Cleanup
                requests.delete(
                    f'{self.base_url}/api/sessions/{session_id}',
                    headers={'Authorization': f'Bearer {self.token}'}
                )
                
                duration = time.time() - test_start
                
                return TestResult(
                    test_id=test_id,
                    status='passed',
                    duration=duration,
                    retries=attempt
                )
                
            except Exception as e:
                if attempt == max_retries - 1:
                    duration = time.time() - test_start
                    return TestResult(
                        test_id=test_id,
                        status='failed',
                        duration=duration,
                        error=str(e),
                        retries=attempt
                    )
                
                # Exponential backoff
                time.sleep(2 ** attempt)
    
    def execute_test_logic(self, test_id, session_data):
        """Your actual test logic goes here"""
        # Placeholder - implement your test
        time.sleep(2)  # Simulate test execution
        return {'status': 'passed'}
    
    def run_parallel(self, test_ids):
        """Run tests in parallel"""
        self.start_time = time.time()
        self.results = []
        
        print(f"Starting {len(test_ids)} tests with {self.max_workers} workers...")
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(self.run_test, test_id): test_id 
                for test_id in test_ids
            }
            
            completed = 0
            for future in as_completed(futures):
                result = future.result()
                self.results.append(result)
                completed += 1
                
                # Progress update
                if completed % 10 == 0:
                    progress = completed / len(test_ids) * 100
                    print(f"Progress: {completed}/{len(test_ids)} ({progress:.1f}%)")
        
        return self.results
    
    def print_summary(self):
        """Print execution summary"""
        duration = time.time() - self.start_time
        passed = sum(1 for r in self.results if r.status == 'passed')
        failed = len(self.results) - passed
        avg_duration = sum(r.duration for r in self.results) / len(self.results)
        
        print("\n" + "=" * 50)
        print("EXECUTION SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {len(self.results)}")
        print(f"Passed: {passed} ({passed / len(self.results) * 100:.1f}%)")
        print(f"Failed: {failed} ({failed / len(self.results) * 100:.1f}%)")
        print(f"Total Duration: {duration:.2f}s")
        print(f"Avg Test Time: {avg_duration:.2f}s")
        print(f"Throughput: {len(self.results) / duration:.2f} tests/sec")
        print("=" * 50)
    
    def save_report(self, filename='test-report.json'):
        """Save results to JSON file"""
        report = {
            'summary': {
                'total': len(self.results),
                'passed': sum(1 for r in self.results if r.status == 'passed'),
                'failed': sum(1 for r in self.results if r.status == 'failed'),
                'duration': time.time() - self.start_time
            },
            'results': [asdict(r) for r in self.results]
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"Report saved to {filename}")

def main():
    # Configuration
    executor = ParallelTestExecutor(
        base_url='http://localhost:3000',
        max_workers=15
    )
    
    # Authenticate
    executor.authenticate('test@example.com', 'test123')
    
    # Generate test IDs
    test_ids = list(range(100))
    
    # Run tests
    results = executor.run_parallel(test_ids)
    
    # Print summary
    executor.print_summary()
    
    # Save report
    executor.save_report()
    
    # Exit with appropriate code
    failed = sum(1 for r in results if r.status == 'failed')
    sys.exit(0 if failed == 0 else 1)

if __name__ == '__main__':
    main()
```

## 📚 Next Steps

- **[Selenium Integration](SELENIUM-INTEGRATION.md)** - Selenium examples
- **[Playwright Integration](PLAYWRIGHT-INTEGRATION.md)** - Playwright examples
- **[API Reference](API-REFERENCE.md)** - Complete API documentation

## 🆘 Troubleshooting

### Pool Exhausted
**Symptom**: Tests timeout waiting for browsers

**Solutions**:
1. Increase `BROWSER_POOL_SIZE`
2. Reduce parallel workers
3. Implement queuing
4. Check for session leaks

### High Memory Usage
**Symptom**: System runs out of memory

**Solutions**:
1. Reduce `BROWSER_POOL_SIZE`
2. Decrease `MAX_MEMORY_PER_CONTAINER`
3. Ensure proper session cleanup
4. Monitor with `docker stats`

### Slow Startup Times
**Symptom**: Tests take long to start

**Solutions**:
1. Increase `PRE_WARM_COUNT`
2. Check Docker daemon resources
3. Optimize container images
4. Use SSD for Docker storage

### Inconsistent Results
**Symptom**: Same test passes/fails randomly

**Solutions**:
1. Add explicit waits
2. Implement retry logic
3. Check for race conditions
4. Verify resource limits
