# VNC Live Viewing

Real-time browser session viewing with VNC (Virtual Network Computing).

## Overview

VNC support allows you to watch browser sessions in real-time, making it perfect for:
- **Debugging test scripts** - See exactly what the browser is doing
- **UI inspection** - Visual verification of page rendering
- **Demo purposes** - Show live test execution to stakeholders
- **Training** - Watch automation scripts in action

## Quick Start

### 1. Build VNC-Enabled Containers

```bash
# Build both Chrome and Firefox with VNC support
./scripts/build-vnc-containers.sh
```

This creates two new Docker images:
- `chrome-alpine-vnc:latest` - Chrome + VNC + X11
- `firefox-alpine-vnc:latest` - Firefox + VNC + X11

### 2. Enable VNC in Configuration

Add to your `.env` file:

```bash
# Enable VNC support
ENABLE_VNC=true

# Optional: Configure screen resolution
SCREEN_WIDTH=1920
SCREEN_HEIGHT=1080
SCREEN_DEPTH=24
```

### 3. Restart Browser Pool Service

```bash
cd mini-services/browser-pool
bun run dev
```

### 4. Create Session with VNC

```bash
curl -X POST http://localhost:3000/api/sessions/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "browserType": "chrome",
    "capabilities": {
      "resolution": "1920x1080"
    }
  }'
```

Response includes VNC connection info:

```json
{
  "sessionId": "session-123",
  "cdpUrl": "http://localhost:9222",
  "vncUrl": "vnc://localhost:5900",
  "vncWebSocketUrl": "ws://localhost:5900"
}
```

## Using VNC

### Web-Based Viewer (Recommended)

Access the TGGrid dashboard and open a session:

```typescript
import { VncViewer } from '@/components/vnc-viewer';

<VncViewer 
  sessionId="session-123" 
  vncUrl="vnc://localhost:5900"
/>
```

### Desktop VNC Clients

#### TigerVNC (Linux/Mac/Windows)

```bash
# Install TigerVNC
# Ubuntu/Debian
sudo apt-get install tigervnc-viewer

# macOS (with Homebrew)
brew install tiger-vnc

# Connect to session
vncviewer localhost:5900
```

#### RealVNC

1. Download from https://www.realvnc.com/
2. Connect to `localhost:5900`
3. No password required (development mode)

#### macOS Screen Sharing

```bash
# Use built-in Screen Sharing app
open vnc://localhost:5900
```

### noVNC (Web Browser)

noVNC provides a browser-based VNC client:

```bash
# Install noVNC
git clone https://github.com/novnc/noVNC.git
cd noVNC

# Start noVNC proxy
./utils/novnc_proxy --vnc localhost:5900
```

Then open: http://localhost:6080/vnc.html

## Architecture

### Container Setup

VNC-enabled containers include:

1. **Xvfb** - Virtual X11 display server
2. **x11vnc** - VNC server for X11 display
3. **Fluxbox** - Lightweight window manager
4. **Browser** - Chrome or Firefox with GUI mode

```
┌─────────────────────────────────┐
│  Docker Container               │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Browser (Chrome/Firefox) │   │
│  └────────┬─────────────────┘   │
│           │                      │
│  ┌────────▼─────────────────┐   │
│  │ Fluxbox Window Manager   │   │
│  └────────┬─────────────────┘   │
│           │                      │
│  ┌────────▼─────────────────┐   │
│  │ Xvfb (Virtual Display)   │   │
│  └────────┬─────────────────┘   │
│           │                      │
│  ┌────────▼─────────────────┐   │
│  │ x11vnc (VNC Server)      │   │
│  │ Port: 5900               │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
         │
         │ VNC Protocol
         ▼
   ┌──────────┐
   │ VNC      │
   │ Client   │
   └──────────┘
```

### Port Mapping

| Port | Purpose | Protocol |
|------|---------|----------|
| 9222 | Chrome DevTools Protocol (CDP) | HTTP/WebSocket |
| 5900 | VNC Server | RFB Protocol |

Both ports are dynamically mapped to random host ports by Docker.

## Resource Requirements

VNC-enabled containers require more resources than headless:

| Mode | Memory | CPU | Disk |
|------|--------|-----|------|
| Headless | 256MB | 0.5 | ~200MB |
| VNC | 512MB | 1.0 | ~400MB |

Pool size recommendations:
- Development: 5-10 VNC containers
- Production: Use headless for scale, VNC for debugging specific sessions

## API Integration

### Check VNC Status

```bash
GET /api/sessions/{sessionId}/vnc

Response:
{
  "success": true,
  "sessionId": "session-123",
  "vncEnabled": true,
  "vncUrl": "vnc://localhost:5900",
  "wsUrl": "/api/sessions/session-123/vnc/ws"
}
```

### Session Creation with VNC

When `ENABLE_VNC=true`, all sessions automatically get VNC support:

```javascript
const response = await fetch('http://localhost:3000/api/sessions/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    browserType: 'chrome',
    capabilities: {
      resolution: '1920x1080'
    }
  })
});

const session = await response.json();
console.log('VNC URL:', session.vncUrl);
```

## Security Considerations

### Development Mode

Current implementation has **no password** for ease of development:
- ✅ Fast setup
- ✅ No credential management
- ⚠️ Not production-ready

### Production Hardening

For production deployments:

```dockerfile
# Add VNC password
RUN x11vnc -storepasswd yourpassword /home/chrome/.vnc/passwd

# Update startup script
x11vnc -display ${DISPLAY} -forever -shared -rfbport ${VNC_PORT} -rfbauth /home/chrome/.vnc/passwd
```

Environment variable approach:

```bash
VNC_PASSWORD=your-secure-password
```

### Network Isolation

Restrict VNC access:

```yaml
# docker-compose.yml
services:
  browser:
    ports:
      - "127.0.0.1:5900:5900"  # Only localhost access
```

Firewall rules:

```bash
# Allow VNC only from specific IPs
iptables -A INPUT -p tcp --dport 5900 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 5900 -j DROP
```

## Troubleshooting

### Container Won't Start

Check Docker logs:

```bash
docker logs <container-id>
```

Common issues:
- Missing X11 dependencies → Rebuild with `./scripts/build-vnc-containers.sh`
- Insufficient memory → Increase container memory limit
- Port conflict → Check if port 5900 is already in use

### VNC Connection Refused

1. Verify container is running:
```bash
docker ps | grep vnc
```

2. Check VNC port mapping:
```bash
docker port <container-id> 5900
```

3. Test VNC connectivity:
```bash
nc -zv localhost 5900
```

### Black Screen in VNC

X11 display not ready. Check:

```bash
# Inside container
docker exec -it <container-id> sh
echo $DISPLAY
ps aux | grep Xvfb
```

Restart X server:

```bash
docker restart <container-id>
```

### Performance Issues

VNC adds ~20-30% overhead. Optimize:

1. **Reduce resolution**:
```bash
SCREEN_WIDTH=1280
SCREEN_HEIGHT=720
```

2. **Lower color depth**:
```bash
SCREEN_DEPTH=16  # Instead of 24
```

3. **Use compression**:
```bash
vncviewer -PreferredEncoding=Tight localhost:5900
```

## Examples

### Python with VNC Monitoring

```python
import requests
import time

# Create session
response = requests.post('http://localhost:3000/api/sessions/create', 
    headers={'Authorization': 'Bearer YOUR_TOKEN'},
    json={'browserType': 'chrome'})

session = response.json()
print(f"VNC URL: {session['vncUrl']}")
print(f"Connect with: vncviewer {session['vncUrl'].replace('vnc://', '')}")

# Run your test
driver = webdriver.Remote(
    command_executor=session['cdpUrl'],
    options=webdriver.ChromeOptions()
)

driver.get('https://example.com')
time.sleep(5)  # Watch in VNC viewer

driver.quit()
```

### Node.js with VNC Viewer Component

```typescript
import { VncViewer } from '@/components/vnc-viewer';

function SessionViewer({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => setSession(data));
  }, [sessionId]);

  if (!session) return <div>Loading...</div>;

  return (
    <div>
      <h1>Session: {sessionId}</h1>
      <VncViewer 
        sessionId={sessionId}
        vncUrl={session.vncUrl}
        onClose={() => window.location.href = '/dashboard'}
      />
    </div>
  );
}
```

## Performance Benchmarks

| Metric | Headless | VNC |
|--------|----------|-----|
| Container Startup | ~100ms | ~2s |
| Memory Usage | 200MB | 450MB |
| CPU Usage (idle) | 5% | 15% |
| CPU Usage (active) | 30% | 50% |
| Network (VNC stream) | 0 | 1-5 Mbps |

## Best Practices

1. **Use VNC selectively** - Enable only for debugging sessions
2. **Headless for scale** - Production tests should use headless mode
3. **Monitor resources** - VNC containers consume 2x resources
4. **Limit concurrent VNC** - Cap VNC pool size separately
5. **Screen recording** - Consider video recording for evidence instead

## Next Steps

- [Video Recording](VIDEO-RECORDING.md) - Record sessions for later review
- [Session Management](../SELENIUM-INTEGRATION.md) - WebDriver integration
- [API Reference](../API-REFERENCE.md) - Complete API documentation
