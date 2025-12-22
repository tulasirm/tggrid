# API Reference

Complete REST API documentation for TGGrid Enterprise Selenium Box platform.

## 🌐 Base URLs

- **Main App**: http://localhost:3000
- **Browser Pool**: http://localhost:3002
- **WebSocket**: http://localhost:3001

## 🔐 Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Get Token

**POST** `/api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

## 📋 Table of Contents

- [Authentication API](#authentication-api)
- [Session Management API](#session-management-api)
- [Browser Pool API](#browser-pool-api)
- [Health & Monitoring API](#health--monitoring-api)
- [Dashboard API](#dashboard-api)
- [Configuration API](#configuration-api)
- [WebSocket Events](#websocket-events)

---

## 🔑 Authentication API

### Register User

**POST** `/api/auth/register`

Create a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**Response** (201):
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2025-12-21T10:00:00Z"
  }
}
```

**Errors**:
- `400`: Invalid request data
- `409`: Email already exists

### Login

**POST** `/api/auth/login`

Authenticate and get JWT token.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Errors**:
- `400`: Missing credentials
- `401`: Invalid credentials

### Get Current User

**GET** `/api/auth/user`

Get authenticated user details.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "settings": {
    "theme": "dark",
    "notifications": true,
    "twoFactorEnabled": false
  },
  "createdAt": "2025-12-21T10:00:00Z"
}
```

**Errors**:
- `401`: Unauthorized (invalid/missing token)

### Update User

**PUT** `/api/auth/user`

Update user profile and settings.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "name": "New Name",
  "settings": {
    "theme": "light",
    "notifications": false
  }
}
```

**Response** (200):
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "New Name",
  "settings": {
    "theme": "light",
    "notifications": false
  }
}
```

### Delete User

**DELETE** `/api/auth/user`

Delete user account.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## 🌐 Session Management API

### Create Session

**POST** `/api/sessions/create`

Create a new browser session.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "browser": "chrome",
  "vncEnabled": true,
  "videoEnabled": true,
  "resolution": "1920x1080",
  "capabilities": {
    "browserName": "chrome",
    "goog:chromeOptions": {
      "args": ["--headless", "--no-sandbox"]
    }
  }
}
```

**Parameters**:
- `browser` (string): "chrome" or "firefox" (default: "chrome")
- `vncEnabled` (boolean): Enable VNC access (default: true)
- `videoEnabled` (boolean): Enable video recording (default: true)
- `resolution` (string): Screen resolution (default: "1920x1080")
- `capabilities` (object): WebDriver capabilities (optional)

**Response** (201):
```json
{
  "success": true,
  "session": {
    "id": "session_id",
    "browser": "chrome",
    "status": "running",
    "userId": "user_id",
    "user": "User Name",
    "vncUrl": "http://localhost:7900/?path=vnc/session_id",
    "videoUrl": "http://localhost:3000/videos/session_id.mp4",
    "resolution": "1920x1080",
    "createdAt": "2025-12-21T10:00:00Z"
  },
  "containerId": "browser-chrome-1234567890",
  "cdpUrl": "http://localhost:12345",
  "wsEndpoint": "ws://localhost:12345/devtools/browser",
  "port": 12345,
  "metrics": {
    "startupTime": 87,
    "poolHit": true
  }
}
```

**Errors**:
- `401`: Unauthorized
- `404`: User not found
- `500`: Failed to create session
- `503`: Pool exhausted

### List Sessions

**GET** `/api/sessions/list`

Get all browser sessions.

**Response** (200):
```json
[
  {
    "id": "session_id_1",
    "browser": "chrome",
    "status": "running",
    "user": "User Name",
    "createdAt": "2025-12-21T10:00:00Z",
    "vncUrl": "http://localhost:7900/?path=vnc/session_id_1",
    "metrics": [
      {
        "cpuUsage": 35.2,
        "memoryUsage": 128.5,
        "latency": 12.3,
        "timestamp": "2025-12-21T10:05:00Z"
      }
    ]
  },
  {
    "id": "session_id_2",
    "browser": "firefox",
    "status": "stopped",
    "user": "Another User",
    "createdAt": "2025-12-21T09:30:00Z"
  }
]
```

### Get Session Details

**GET** `/api/sessions/{sessionId}`

Get details of a specific session.

**Response** (200):
```json
{
  "id": "session_id",
  "browser": "chrome",
  "status": "running",
  "user": "User Name",
  "userId": "user_id",
  "vncUrl": "http://localhost:7900/?path=vnc/session_id",
  "videoUrl": "http://localhost:3000/videos/session_id.mp4",
  "resolution": "1920x1080",
  "capabilities": "{\"browserName\":\"chrome\"}",
  "createdAt": "2025-12-21T10:00:00Z",
  "updatedAt": "2025-12-21T10:05:00Z",
  "metrics": [
    {
      "id": "metric_id",
      "cpuUsage": 35.2,
      "memoryUsage": 128.5,
      "networkLatency": 12.3,
      "requestCount": 45,
      "timestamp": "2025-12-21T10:05:00Z"
    }
  ]
}
```

**Errors**:
- `404`: Session not found

### Update Session

**PUT** `/api/sessions/list`

Update session status or metadata.

**Request**:
```json
{
  "id": "session_id",
  "status": "stopped"
}
```

**Response** (200):
```json
{
  "id": "session_id",
  "browser": "chrome",
  "status": "stopped",
  "updatedAt": "2025-12-21T10:10:00Z"
}
```

### Delete Session

**DELETE** `/api/sessions/list?id={sessionId}`

Terminate and delete a session.

**Response** (200):
```json
{
  "success": true
}
```

**Errors**:
- `400`: ID required
- `500`: Failed to delete session

---

## 🎯 Browser Pool API

### Get Browser from Pool

**POST** `http://localhost:3002/browser`

Get a browser instance from the pool.

**Request**:
```json
{
  "browserType": "chrome"
}
```

**Response** (200):
```json
{
  "success": true,
  "containerId": "browser-chrome-1234567890",
  "port": 12345,
  "cdpUrl": "http://localhost:12345",
  "wsEndpoint": "ws://localhost:12345/devtools/browser",
  "browserType": "chrome",
  "fromPool": true,
  "metrics": {
    "startupTime": 87,
    "poolHit": true
  }
}
```

### Release Browser

**POST** `http://localhost:3002/browser/{containerId}/release`

Return a browser to the pool for reuse.

**Response** (200):
```json
{
  "success": true,
  "containerId": "browser-chrome-1234567890",
  "returnedToPool": true
}
```

### Get Pool Metrics

**GET** `http://localhost:3002/metrics`

Get browser pool metrics.

**Response** (200):
```json
{
  "poolSize": 50,
  "activeContainers": 32,
  "availableContainers": 18,
  "totalCreated": 245,
  "totalReused": 213,
  "poolHits": 198,
  "poolMisses": 47,
  "avgStartupTime": 92.5,
  "reuseRate": 86.9,
  "metrics": {
    "created": 245,
    "reused": 213,
    "hits": 198,
    "misses": 47
  }
}
```

### Pre-Warm Pool

**POST** `http://localhost:3002/prewarm`

Pre-warm the browser pool with containers.

**Request**:
```json
{
  "count": 10,
  "browserType": "chrome"
}
```

**Response** (200):
```json
{
  "success": true,
  "warmed": 10,
  "browserType": "chrome"
}
```

---

## 🏥 Health & Monitoring API

### Health Check

**GET** `/api/health`

Check system health status.

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-21T10:00:00Z",
  "version": "2.0.1",
  "uptime": 12345.67,
  "services": {
    "mainApp": "healthy",
    "browserPool": "healthy",
    "cdpClient": "healthy",
    "database": "healthy",
    "docker": "healthy"
  },
  "performance": {
    "cpuUsage": 35.2,
    "memoryUsage": 48.1,
    "activeConnections": 42,
    "responseTime": 12.5
  },
  "configuration": {
    "nodeEnv": "production",
    "port": 3000,
    "browserPoolEnabled": true,
    "ultraFastMode": true,
    "maxSessions": 50
  }
}
```

**Status Values**:
- `healthy`: All systems operational
- `degraded`: Some services experiencing issues
- `unhealthy`: Critical services down

### Get System Metrics

**GET** `/api/metrics`

Get detailed system metrics.

**Response** (200):
```json
{
  "system": {
    "cpuUsage": 35.2,
    "memoryUsage": 48.1,
    "diskUsage": 62.3,
    "networkLatency": 12.5
  },
  "pool": {
    "totalContainers": 50,
    "activeContainers": 32,
    "availableContainers": 18,
    "poolHits": 198,
    "poolMisses": 47
  },
  "sessions": {
    "totalSessions": 245,
    "activeSessions": 32,
    "completedSessions": 213
  },
  "performance": {
    "avgSessionStartup": 92.5,
    "avgSessionDuration": 125.3,
    "requestsPerSecond": 45.2
  }
}
```

---

## 📊 Dashboard API

### Get Dashboard Data

**GET** `/api/dashboard`

Get all dashboard data including sessions, metrics, and health.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "sessions": [
    {
      "id": "session_id",
      "browser": "chrome",
      "status": "running",
      "user": "User Name"
    }
  ],
  "metrics": {
    "totalSessions": 245,
    "activeSessions": 32,
    "cpuUsage": 35.2,
    "memoryUsage": 48.1
  },
  "health": {
    "status": "healthy",
    "services": {
      "mainApp": "healthy",
      "browserPool": "healthy",
      "database": "healthy"
    }
  }
}
```

---

## ⚙️ Configuration API

### Get Configuration

**GET** `/api/config`

Get system configuration.

**Response** (200):
```json
{
  "id": "config_id",
  "poolSize": 50,
  "preWarmCount": 20,
  "maxSessionDuration": 3600,
  "containerStartupTimeout": 5000,
  "enableLogging": true,
  "enableMetrics": true,
  "autoScalingEnabled": true,
  "createdAt": "2025-12-21T10:00:00Z",
  "updatedAt": "2025-12-21T10:00:00Z"
}
```

### Update Configuration

**PUT** `/api/config`

Update system configuration.

**Request**:
```json
{
  "poolSize": 60,
  "preWarmCount": 25,
  "autoScalingEnabled": true
}
```

**Response** (200):
```json
{
  "id": "config_id",
  "poolSize": 60,
  "preWarmCount": 25,
  "autoScalingEnabled": true,
  "updatedAt": "2025-12-21T10:05:00Z"
}
```

### Get Load Balancer Configuration

**GET** `/api/loadbalancer`

Get load balancer configuration.

**Response** (200):
```json
{
  "id": "lb_config_id",
  "algorithm": "resource-based",
  "healthCheckInterval": 30,
  "healthCheckTimeout": 5,
  "maxFailures": 3,
  "sessionAffinity": true,
  "nodes": [
    {
      "id": "node_1",
      "url": "http://localhost:3002",
      "weight": 100,
      "enabled": true
    }
  ]
}
```

### Update Load Balancer Configuration

**PUT** `/api/loadbalancer`

Update load balancer settings.

**Request**:
```json
{
  "algorithm": "least-connections",
  "healthCheckInterval": 60
}
```

**Response** (200):
```json
{
  "id": "lb_config_id",
  "algorithm": "least-connections",
  "healthCheckInterval": 60,
  "updatedAt": "2025-12-21T10:05:00Z"
}
```

---

## 🔌 WebSocket Events

Connect to WebSocket server at `ws://localhost:3001`

### Client → Server Events

#### Connect
```javascript
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});
```

#### Subscribe to Session Updates
```javascript
socket.emit('session:subscribe', { sessionId: 'session_id' });
```

### Server → Client Events

#### Session Created
```javascript
socket.on('session:create', (data) => {
  console.log('New session created:', data);
  // data: { sessionId, browser, status, user }
});
```

#### Session Updated
```javascript
socket.on('session:update', (data) => {
  console.log('Session updated:', data);
  // data: { sessionId, status, metrics }
});
```

#### Session Terminated
```javascript
socket.on('session:terminate', (data) => {
  console.log('Session terminated:', data);
  // data: { sessionId, reason }
});
```

#### Metrics Update
```javascript
socket.on('metrics:update', (data) => {
  console.log('Metrics updated:', data);
  // data: { sessionId, cpuUsage, memoryUsage, latency }
});
```

---

## 🚦 HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Service temporarily unavailable

---

## 📝 Rate Limits

Currently no rate limits enforced. Production deployments should implement rate limiting.

---

## 🔒 Security

### Authentication
All authenticated endpoints require JWT token in Authorization header.

### Token Expiry
Tokens expire after 24 hours. Re-authenticate to get a new token.

### CORS
CORS is enabled for localhost development. Configure for production.

---

## 📚 Examples

### Complete Session Lifecycle

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123","name":"User"}'

# 2. Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}' \
  | jq -r '.token')

# 3. Create Session
SESSION=$(curl -X POST http://localhost:3000/api/sessions/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"browser":"chrome","vncEnabled":true}' \
  | jq -r '.session.id')

# 4. Get Session Details
curl http://localhost:3000/api/sessions/$SESSION

# 5. Delete Session
curl -X DELETE "http://localhost:3000/api/sessions/list?id=$SESSION"
```

### Using with JavaScript

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let token;

async function authenticate() {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: 'user@example.com',
    password: 'pass123'
  });
  token = response.data.token;
}

async function createSession() {
  const response = await axios.post(
    `${BASE_URL}/api/sessions/create`,
    {
      browser: 'chrome',
      vncEnabled: true,
      videoEnabled: true
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
}

async function main() {
  await authenticate();
  const session = await createSession();
  console.log('Session created:', session.session.id);
}

main();
```

---

## 📖 Additional Resources

- **[Getting Started](GETTING-STARTED.md)** - Setup guide
- **[Selenium Integration](SELENIUM-INTEGRATION.md)** - Selenium examples
- **[Playwright Integration](PLAYWRIGHT-INTEGRATION.md)** - Playwright examples
- **[Parallel Execution](PARALLEL-EXECUTION.md)** - Parallel testing guide
