# TGGrid - Enterprise Selenium Box

🚀 **TGGrid** is an Enterprise Selenium Box browser automation platform built on Next.js 15, designed for parallel test execution at scale with ultra-fast performance.

## ✨ Key Features

- **🚀 Ultra-Fast Browser Pool** - <100ms session startup with pre-warmed containers
- **⚡ Parallel Execution** - Run 100+ concurrent browser sessions
- **🐳 Docker Containerization** - Isolated Chrome & Firefox instances
- **📊 Real-Time Dashboard** - Live monitoring with WebSocket updates
- **🔌 WebDriver Compatible** - Works with Selenium & Playwright
- **🎯 CDP Support** - Chrome Remote Debugging Protocol integration
- **📹 VNC & Recording** - Remote viewing and video recording
- **🔐 Enterprise Security** - JWT authentication & audit logging

## 🚀 Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Setup environment
cp .env.example .env

# 3. Initialize database
bun run db:push

# 4. Build browser images
cd containers/chrome-alpine && docker build -t chrome-alpine:latest .
cd ../firefox-alpine && docker build -t firefox-alpine:latest .

# 5. Start all services
./start-all-services.sh
```

Access the dashboard at http://localhost:3000

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](docs/GETTING-STARTED.md)** - Complete setup instructions
- **[Features Overview](docs/FEATURES.md)** - All 30+ features explained

### Integration Guides
- **[Selenium Integration](docs/SELENIUM-INTEGRATION.md)** - Use with Selenium WebDriver
- **[Playwright Integration](docs/PLAYWRIGHT-INTEGRATION.md)** - Use with Playwright
- **[Parallel Execution](docs/PARALLEL-EXECUTION.md)** - Scale to 100+ concurrent tests

### Additional Resources
- **[API Reference](docs/API-REFERENCE.md)** - Complete REST API documentation
- **[Architecture](docs/ARCHITECTURE-DIAGRAMS.md)** - System architecture
- **[Deployment Guide](docs/DEPLOYMENT-GUIDE.md)** - Production deployment
- **[Performance Guide](docs/ULTRA-FAST-PERFORMANCE.md)** - Performance optimization

## 🎯 Use Cases

1. **Parallel Test Execution** - Run hundreds of Selenium/Playwright tests concurrently
2. **Web Scraping at Scale** - Extract data with multiple browser instances
3. **Load Testing** - Simulate realistic user behavior with real browsers
4. **CI/CD Integration** - Automated testing in build pipelines
5. **Cross-Browser Testing** - Test on Chrome and Firefox simultaneously

## 🏗️ Architecture

- **Main App** (Port 3000) - Next.js UI + REST API
- **Browser Pool** (Port 3002) - Docker container management
- **WebSocket Server** (Port 3001) - Real-time updates
- **PostgreSQL** - Session and metrics storage
- **Docker** - Browser container orchestration

## 💻 Tech Stack

### Core
- Next.js 15 + TypeScript 5
- Prisma ORM + PostgreSQL
- Docker + Dockerode

### UI
- shadcn/ui components
- Tailwind CSS 4
- Real-time WebSocket dashboard

### Automation
- Chrome Remote Debugging Protocol
- W3C WebDriver API
- Selenium & Playwright compatible
## 📦 Example: Selenium Test

```python
import requests
from selenium import webdriver

# Authenticate
response = requests.post('http://localhost:3000/api/auth/login',
    json={'email': 'test@example.com', 'password': 'test123'})
token = response.json()['token']

# Create session
response = requests.post('http://localhost:3000/api/sessions/create',
    json={'browser': 'chrome', 'vncEnabled': True},
    headers={'Authorization': f'Bearer {token}'})

session = response.json()
cdp_url = session['cdpUrl']

# Connect Selenium
options = webdriver.ChromeOptions()
options.debugger_address = cdp_url.replace('http://', '')
driver = webdriver.Chrome(options=options)

# Run test
driver.get('https://www.google.com')
print(driver.title)

# Cleanup
driver.quit()
```

## 📦 Example: Parallel Execution

```python
from concurrent.futures import ThreadPoolExecutor

def run_test(test_id, token):
    # Create session, run test, cleanup
    pass

# Run 50 tests with 10 workers
token = get_auth_token()
with ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(lambda i: run_test(i, token), range(50)))

print(f"Completed {len(results)} tests")
```

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/tggrid"

# Service Ports
PORT=3000
BROWSER_POOL_PORT=3002
WEBSOCKET_PORT=3001

# Browser Pool
BROWSER_POOL_SIZE=50
PRE_WARM_COUNT=20
MAX_MEMORY_PER_CONTAINER=256
MAX_CPU_PER_CONTAINER=0.5

# Docker
CHROME_IMAGE=chrome-alpine:latest
FIREFOX_IMAGE=firefox-alpine:latest
```

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get JWT token

### Sessions
- `POST /api/sessions/create` - Create browser session
- `GET /api/sessions/list` - List all sessions
- `GET /api/sessions/{id}` - Get session details
- `DELETE /api/sessions/list?id={id}` - Terminate session

### Monitoring
- `GET /api/health` - Service health status
- `GET /api/metrics` - System metrics

### Browser Pool
- `POST http://localhost:3002/browser` - Get browser from pool
- `GET http://localhost:3002/metrics` - Pool metrics

## 📊 Performance

- **Session Startup**: <100ms (pool hit)
- **Container Creation**: 2-5s (pool miss)
- **Concurrent Capacity**: 100+ sessions
- **Resource per Browser**: 256MB RAM, 0.5 CPU
- **Pool Efficiency**: 90%+ reuse rate

## 🆘 Troubleshooting

### Docker not running
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

### Port already in use
```bash
lsof -i :3000
kill -9 <PID>
```

### Database connection failed
```bash
# Create database
createdb tggrid

# Update .env
DATABASE_URL="postgresql://user:pass@localhost:5432/tggrid"
```

## 🤝 Contributing

Issues and pull requests welcome!

## 📄 License

Enterprise Selenium Box Platform - All rights reserved.

---

**Built with Next.js 15 + Docker + PostgreSQL**

Start running parallel browser tests at scale today!
