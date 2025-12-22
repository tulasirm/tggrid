# TGGrid Documentation

Welcome to TGGrid - Enterprise Selenium Box browser automation platform for parallel execution at scale.

## 📚 Documentation Index

### Getting Started
- **[Quick Start Guide](GETTING-STARTED.md)** - Get TGGrid up and running in minutes
- **[Features Overview](FEATURES.md)** - Comprehensive list of all features
- **[Implementation Progress](IMPLEMENTATION-PROGRESS.md)** - 🆕 Current feature implementation status

### Integration Guides
- **[Selenium Integration](SELENIUM-INTEGRATION.md)** - Use TGGrid with Selenium scripts
- **[Playwright Integration](PLAYWRIGHT-INTEGRATION.md)** - Use TGGrid with Playwright scripts
- **[Parallel Execution](PARALLEL-EXECUTION.md)** - Run tests in parallel at scale

### Additional Resources
- **[API Documentation](API-REFERENCE.md)** - Complete REST API reference
- **[VNC Live Viewing](VNC-LIVE-VIEWING.md)** - 🆕 Watch browser sessions in real-time
- **[Architecture](ARCHITECTURE-DIAGRAMS.md)** - System architecture and design
- **[Deployment Guide](DEPLOYMENT-GUIDE.md)** - Production deployment instructions
- **[Ultra-Fast Performance](ULTRA-FAST-PERFORMANCE.md)** - Performance optimization guide

## ✅ Recently Implemented Features (100% Complete!)

### Real Health Checks (COMPLETE)
System health endpoint now returns actual metrics from services, database, and Docker.
```bash
curl http://localhost:3000/api/health
```

### Audit Logging System (COMPLETE)
Complete audit trail for compliance and security monitoring.
```bash
curl http://localhost:3000/api/audit-logs -H "Authorization: Bearer TOKEN"
```

### Two-Factor Authentication (COMPLETE)
TOTP-based 2FA with QR codes and backup codes.
```bash
curl -X POST http://localhost:3000/api/auth/2fa/enable -H "Authorization: Bearer TOKEN"
```

### VNC Live Viewing (COMPLETE)
Watch browser sessions in real-time with VNC protocol support.
```bash
./scripts/build-vnc-containers.sh
echo "ENABLE_VNC=true" >> .env
vncviewer localhost:5900
```

### Video Recording (COMPLETE)
Record browser sessions with FFmpeg for test evidence.
```bash
echo "ENABLE_RECORDING=true" >> .env
# Videos saved to /recordings/session-{id}.mp4
```

### Active Load Balancing (COMPLETE)
Distribute sessions across browser pool nodes with 3 algorithms.
```bash
# Round-robin, least-connections, or resource-based
```

### Auto-Scaling (COMPLETE)
Dynamic pool sizing based on utilization thresholds.
```bash
# Scales up at 80%, down at 30%
```

### CI/CD Templates (COMPLETE)
Production-ready pipelines for GitHub Actions, GitLab CI, and Jenkins.
```bash
# See .github/workflows/, .gitlab-ci.yml, Jenkinsfile
```

See [Implementation Progress](IMPLEMENTATION-PROGRESS.md) for full details.

## 🚀 Quick Links

### Start Services
```bash
./start-all-services.sh
```

### API Endpoints
- **Main App**: http://localhost:3000
- **Browser Pool**: http://localhost:3002
- **WebSocket**: http://localhost:3001

### Dashboard
Access the real-time monitoring dashboard at http://localhost:3000

## 💡 Common Use Cases

1. **Parallel Selenium Tests**: Run hundreds of Selenium tests concurrently
2. **Web Scraping at Scale**: Scrape data with multiple browser instances
3. **Load Testing**: Simulate user behavior with real browsers
4. **CI/CD Integration**: Automated testing in build pipelines
5. **Cross-Browser Testing**: Test on Chrome and Firefox simultaneously

## 🆘 Need Help?

- Check the [API Reference](API-REFERENCE.md) for endpoint details
- Review [Parallel Execution](PARALLEL-EXECUTION.md) for scaling tips
- See [Getting Started](GETTING-STARTED.md) for setup issues

## 📝 License

Enterprise Selenium Box Platform - All rights reserved.
