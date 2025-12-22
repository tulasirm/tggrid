# DigitalOcean Configuration Files

## 1. app.yaml (For App Platform)

```yaml
name: tggrid
services:
- name: main-app
  github:
    repo: YOUR-USERNAME/tggrid
    branch: main
  build_command: bun install && bun run build
  run_command: bun start
  http_port: 3000
  source_dir: .
  
  env:
  - key: NODE_ENV
    value: production
    scope: RUN_AND_BUILD_TIME
  - key: PORT
    value: "3000"
    scope: RUN_TIME
  - key: DATABASE_URL
    scope: RUN_AND_BUILD_TIME
  - key: NEXTAUTH_SECRET
    scope: RUN_TIME
  - key: NEXTAUTH_URL
    scope: RUN_TIME
  - key: STRIPE_SECRET_KEY
    scope: RUN_TIME
  - key: STRIPE_WEBHOOK_SECRET
    scope: RUN_TIME
  - key: STRIPE_PUBLISHABLE_KEY
    scope: RUN_TIME
  - key: DEBUG_EVENTS
    value: "false"
    scope: RUN_TIME

  health_check:
    http:
      path: /api/health

  http_routes:
  - path: /
    preserve_path_prefix: true

databases:
- name: tggrid-db
  engine: POSTGRES
  version: "15"
  production: true

static_sites:
- name: static-files
  source_dir: public
  github:
    repo: YOUR-USERNAME/tggrid
    branch: main
  http_routes:
  - path: /public
    preserve_path_prefix: true
```

## 2. docker-compose.yml (For Droplets)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: tggrid-postgres
    environment:
      POSTGRES_DB: tggrid
      POSTGRES_USER: tggrid
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tggrid"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  main-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tggrid-main
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: ${DATABASE_URL:-postgresql://tggrid:changeme@postgres:5432/tggrid}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost:3000}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./src:/app/src
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  browser-pool:
    image: tggrid/browser-pool:latest
    container_name: tggrid-pool
    ports:
      - "3002:3002"
    environment:
      NODE_ENV: production
      PORT: 3002
      BROWSER_POOL_SIZE: 20
      PRE_WARM_COUNT: 5
    restart: unless-stopped
    depends_on:
      - main-app

  browser-websocket:
    image: tggrid/browser-websocket:latest
    container_name: tggrid-websocket
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
    restart: unless-stopped
    depends_on:
      - main-app

volumes:
  postgres_data:
    driver: local

networks:
  default:
    name: tggrid-network
```

## 3. Dockerfile (For Docker builds)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install bun
RUN npm install -g bun

# Copy source
COPY . .

# Build
RUN bun run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Run
CMD ["bun", "start"]
```

## 4. .env.digitalocean (Template)

```bash
# Environment
NODE_ENV=production

# Server
PORT=3000
NEXTAUTH_URL=https://your-domain.com

# Database (from DigitalOcean Databases)
DATABASE_URL=postgresql://doadmin:password@db-xxxxx.ondigitalocean.com:25060/tggrid?sslmode=require

# Authentication
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>

# Stripe (from stripe.com/dashboard)
STRIPE_SECRET_KEY=sk_live_51234567890
STRIPE_WEBHOOK_SECRET=whsec_1234567890
STRIPE_PUBLISHABLE_KEY=pk_live_1234567890

# Features
DEBUG_EVENTS=false
ENABLE_AUTO_SCALING=true

# Browser Pool
BROWSER_POOL_SIZE=20
PRE_WARM_COUNT=5
BROWSER_POOL_URL=http://localhost:3002
WEBSOCKET_URL=http://localhost:3001

# Kubernetes (if using DOKS)
KUBERNETES_SERVICE_HOST=<cluster-endpoint>
KUBERNETES_SERVICE_PORT=443
```

## 5. deployment.yaml (For DOKS)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tggrid

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: tggrid-config
  namespace: tggrid
data:
  NODE_ENV: "production"
  PORT: "3000"
  DEBUG_EVENTS: "false"
  BROWSER_POOL_SIZE: "20"
  PRE_WARM_COUNT: "5"

---
apiVersion: v1
kind: Secret
metadata:
  name: tggrid-secrets
  namespace: tggrid
type: Opaque
data:
  DATABASE_URL: <base64-encoded-connection-string>
  NEXTAUTH_SECRET: <base64-encoded-secret>
  STRIPE_SECRET_KEY: <base64-encoded-key>
  STRIPE_WEBHOOK_SECRET: <base64-encoded-secret>
  STRIPE_PUBLISHABLE_KEY: <base64-encoded-key>

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tggrid-main
  namespace: tggrid
  labels:
    app: tggrid
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tggrid
  template:
    metadata:
      labels:
        app: tggrid
    spec:
      containers:
      - name: main
        image: registry.digitalocean.com/tggrid-registry/tggrid:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: tggrid-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: tggrid-config
              key: PORT
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: tggrid-secrets
              key: DATABASE_URL
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: tggrid-secrets
              key: NEXTAUTH_SECRET
        - name: STRIPE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: tggrid-secrets
              key: STRIPE_SECRET_KEY
        - name: STRIPE_WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: tggrid-secrets
              key: STRIPE_WEBHOOK_SECRET
        - name: STRIPE_PUBLISHABLE_KEY
          valueFrom:
            secretKeyRef:
              name: tggrid-secrets
              key: STRIPE_PUBLISHABLE_KEY

        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi

        livenessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          httpGet:
            path: /api/health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

---
apiVersion: v1
kind: Service
metadata:
  name: tggrid-service
  namespace: tggrid
spec:
  type: LoadBalancer
  selector:
    app: tggrid
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: tggrid-hpa
  namespace: tggrid
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: tggrid-main
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 6. nginx.conf (For Droplets with custom domain)

```nginx
upstream tggrid {
    server localhost:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://tggrid;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Stripe webhook (don't cache)
    location /api/webhooks/stripe {
        proxy_pass http://tggrid;
        proxy_http_version 1.1;
        proxy_buffering off;
    }

    # Health check endpoint (fast response)
    location /api/health {
        proxy_pass http://tggrid;
        access_log off;
    }
}

# Redirect HTTP to HTTPS (after SSL setup)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://tggrid;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## How to Use These Files

### App Platform
1. Copy `app.yaml` contents
2. In DigitalOcean console → Apps → Create → paste app.yaml
3. Set environment variables in console

### DOKS
```bash
# Create secrets
kubectl create secret generic tggrid-secrets -n tggrid \
  --from-literal=DATABASE_URL=<url> \
  --from-literal=STRIPE_SECRET_KEY=<key>
  # ... add other secrets

# Apply deployment
kubectl apply -f deployment.yaml

# Watch
kubectl rollout status deployment/tggrid-main -n tggrid
```

### Droplets
```bash
# Create .env file with values from .env.digitalocean
cp .env.digitalocean .env
# Edit with actual values

# Run Docker Compose
docker-compose up -d

# For Nginx, copy nginx.conf to:
# /etc/nginx/sites-available/tggrid
# and enable it
```

---

Generated: December 22, 2025
