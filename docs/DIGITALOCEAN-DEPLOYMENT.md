# UFBrowsers - DigitalOcean Deployment Guide

**Status**: Ready to deploy  
**Estimated Time**: 45-60 minutes  
**Cost**: $12-48/month (DOKS) or $18-96/month (Droplets)  
**Difficulty**: Medium

---

## 📋 Prerequisites

- [ ] DigitalOcean account (you have this ✅)
- [ ] Personal Access Token created
- [ ] Domain name (optional, for HTTPS)
- [ ] Stripe account (test keys for development)
- [ ] PostgreSQL database (managed)

---

## 🎯 Deployment Options

### Option 1: DigitalOcean App Platform (Fastest - 15 minutes)
**Best for**: MVP, quick launch, minimal DevOps  
**Cost**: $12/month (1 basic app)  
**Pros**: One-click deploy, auto-scaling, managed SSL  
**Cons**: Limited customization, more expensive at scale  

### Option 2: DigitalOcean Kubernetes (DOKS) (Most Scalable - 30 minutes)
**Best for**: Production, scaling to 100k+ sessions  
**Cost**: $12/month cluster + $5-20/month per node  
**Pros**: Full K8s control, better cost at scale, auto-scaling HPA  
**Cons**: More complex, requires K8s knowledge  

### Option 3: Droplets + Docker Compose (Full Control - 45 minutes)
**Best for**: Custom setup, maximum flexibility  
**Cost**: $6-12/month per droplet  
**Pros**: Full control, simple to understand, Docker familiar  
**Cons**: Manual scaling, manual updates, more management  

---

## 🚀 Option 1: App Platform (RECOMMENDED FOR MVP)

### Step 1: Prepare Your Repository (5 minutes)

```bash
# Ensure you're in the project root
cd /Users/tsiripireddytest/Downloads/TGGrid

# Create app.yaml for DigitalOcean App Platform
cat > app.yaml << 'EOF'
name: tggrid
services:
- name: main-app
  github:
    repo: your-username/tggrid
    branch: main
  build_command: bun install && bun run build
  run_command: bun start
  http_port: 3000
  env:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    scope: RUN_AND_BUILD_TIME
  - key: NEXTAUTH_SECRET
    scope: RUN_TIME
  - key: STRIPE_SECRET_KEY
    scope: RUN_TIME
  - key: STRIPE_WEBHOOK_SECRET
    scope: RUN_TIME

databases:
- name: postgres-db
  engine: POSTGRES
  version: "15"

static_sites:
- name: public
  source_dir: public
EOF
```

### Step 2: Push to GitHub (5 minutes)

```bash
# Initialize git repo (if not already done)
git init
git add .
git commit -m "Ready for DigitalOcean deployment"

# Add remote
git remote add origin https://github.com/YOUR-USERNAME/tggrid.git
git push -u origin main

# Note: Replace YOUR-USERNAME with your actual GitHub username
```

### Step 3: Deploy via DigitalOcean Dashboard (5 minutes)

1. **Go to DigitalOcean Console**
   - Open https://cloud.digitalocean.com

2. **Create New App**
   - Click "Apps" in left sidebar
   - Click "Create App"
   - Select "GitHub"
   - Authorize GitHub
   - Select your `tggrid` repository
   - Branch: `main`

3. **Configure App**
   - Accept the auto-detected `app.yaml`
   - Review the configuration
   - Click "Next"

4. **Set Environment Variables**
   - Click "Edit" on environment variables
   - Add all required variables:
     ```
     NODE_ENV=production
     NEXTAUTH_SECRET=your-random-secret-key
     STRIPE_SECRET_KEY=sk_live_xxxxx
     STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx
     STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
     DATABASE_URL=postgresql://...
     ```
   - Click "Save"

5. **Choose Plan**
   - Basic: $12/month (sufficient for MVP)
   - Click "Create Resources"

6. **Wait for Deployment** (5-10 minutes)
   - Deployment logs shown in real-time
   - App goes live at: `https://tggrid-xxxxx.ondigitalocean.app`

### Step 4: Configure Database (5 minutes)

**Create PostgreSQL Cluster:**
1. Go to "Databases" in DigitalOcean console
2. Click "Create Database Cluster"
3. Choose:
   - Engine: PostgreSQL 15
   - Cluster Mode: Basic
   - Size: Basic ($15/month)
   - Region: Same as app
4. Copy connection string to `.env`

**Run Migrations:**
```bash
# Using DigitalOcean CLI
doctl apps create-deployment tggrid-app --format json

# Or via SSH into deployed app
# And run: bun run db:push
```

### Step 5: Configure Stripe Webhook (5 minutes)

1. **Get App URL**
   - From DigitalOcean console: `https://tggrid-xxxxx.ondigitalocean.app`

2. **Set Stripe Webhook**
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://tggrid-xxxxx.ondigitalocean.app/api/webhooks/stripe`
   - Events: Select all (or at minimum: `checkout.session.completed`, `invoice.payment_succeeded`)
   - Copy webhook secret
   - Update `STRIPE_WEBHOOK_SECRET` in DigitalOcean app settings

3. **Redeploy App**
   - DigitalOcean will automatically redeploy when env vars change

---

## ⚙️ Option 2: DigitalOcean Kubernetes (DOKS)

### Step 1: Create Kubernetes Cluster (10 minutes)

```bash
# Install doctl CLI
brew install doctl

# Authenticate
doctl auth init

# Create DOKS cluster
doctl kubernetes cluster create tggrid-prod \
  --region nyc3 \
  --version 1.28 \
  --size s-2vcpu-4gb \
  --count 3 \
  --enable-monitoring

# Wait for cluster to be ready (5-10 minutes)
doctl kubernetes cluster get tggrid-prod

# Get kubeconfig
doctl kubernetes cluster kubeconfig save tggrid-prod

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### Step 2: Create Namespace & Secrets (5 minutes)

```bash
# Create namespace
kubectl create namespace tggrid

# Create secrets for Stripe
kubectl create secret generic stripe-keys \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxxxx \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx \
  -n tggrid

# Create secrets for database
kubectl create secret generic database \
  --from-literal=DATABASE_URL='postgresql://user:pass@host:5432/tggrid' \
  -n tggrid

# Create secrets for auth
kubectl create secret generic auth-secrets \
  --from-literal=NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -n tggrid
```

### Step 3: Create DigitalOcean Container Registry (5 minutes)

```bash
# Create registry
doctl registry create tggrid-registry

# Login to registry
doctl registry login

# Build and push image
docker build -t registry.digitalocean.com/tggrid-registry/tggrid:latest .
docker push registry.digitalocean.com/tggrid-registry/tggrid:latest

# OR use doctl
doctl compute registry-create tggrid-registry
doctl compute registry login
```

### Step 4: Create Deployment Manifest (10 minutes)

```bash
cat > k8s/digitalocean-deployment.yaml << 'EOF'
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
  - name: http
    port: 80
    targetPort: 3000
  - name: https
    port: 443
    targetPort: 3000

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tggrid-main
  namespace: tggrid
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
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database
              key: DATABASE_URL
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: NEXTAUTH_SECRET
        - name: STRIPE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: stripe-keys
              key: STRIPE_SECRET_KEY
        - name: STRIPE_WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: stripe-keys
              key: STRIPE_WEBHOOK_SECRET
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

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
EOF
```

### Step 5: Deploy to DOKS (5 minutes)

```bash
# Apply manifest
kubectl apply -f k8s/digitalocean-deployment.yaml

# Wait for deployment
kubectl rollout status deployment/tggrid-main -n tggrid

# Get LoadBalancer IP
kubectl get service tggrid-service -n tggrid

# Note the EXTERNAL-IP - this is your app URL
```

### Step 6: Configure DNS (Optional, 5 minutes)

```bash
# Point your domain to DigitalOcean
# In your domain registrar, set:
# A Record: @ → (LoadBalancer IP from step 5)
# CNAME: www → @ (your domain)

# Create SSL certificate
kubectl create secret tls tls-secret \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n tggrid

# Update service to use TLS
# (Add TLS config to k8s/digitalocean-deployment.yaml)
```

---

## 🐳 Option 3: Droplets + Docker Compose

### Step 1: Create Droplet (5 minutes)

```bash
# Via CLI
doctl compute droplet create tggrid-prod \
  --region nyc3 \
  --image ubuntu-23-10-x64 \
  --size s-2vcpu-4gb \
  --enable-monitoring

# Via Dashboard
# DigitalOcean Console → Droplets → Create Droplet
# - Image: Ubuntu 23.10
# - Size: $12/month (2vCPU, 4GB RAM)
# - Region: New York 3
# - Authentication: SSH key (recommended)
```

### Step 2: SSH into Droplet & Install Dependencies (10 minutes)

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install -y docker-compose

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installations
docker --version
docker-compose --version
bun --version
```

### Step 3: Clone Repository (5 minutes)

```bash
# On droplet
cd /root

# Clone repo
git clone https://github.com/YOUR-USERNAME/tggrid.git
cd tggrid

# Create .env
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/tggrid
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx
NEXTAUTH_SECRET=$(openssl rand -base64 32)
KUBERNETES_SERVICE_HOST=localhost
BROWSER_POOL_URL=http://localhost:3002
WEBSOCKET_URL=http://localhost:3001
EOF
```

### Step 4: Set Up PostgreSQL (5 minutes)

```bash
# Option A: Use DigitalOcean Managed Database
# Create in console, then update DATABASE_URL in .env

# Option B: Docker container
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=tggrid \
  -v postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15

# Wait for container to start
sleep 10

# Run migrations
docker exec postgres psql -U postgres -d tggrid -c "CREATE SCHEMA IF NOT EXISTS public;"
```

### Step 5: Build & Run Docker Compose (10 minutes)

```bash
# On droplet, in /root/tggrid

# Build images
docker-compose -f docker-compose.yml build

# Start services
docker-compose up -d

# Verify all services running
docker-compose ps

# Check logs
docker-compose logs -f main
```

### Step 6: Configure Firewall (5 minutes)

```bash
# Allow HTTP, HTTPS, SSH
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Verify
ufw status
```

### Step 7: Set Up Reverse Proxy (Nginx) (10 minutes)

```bash
# Install nginx
apt install -y nginx

# Create config
cat > /etc/nginx/sites-available/tggrid << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/tggrid /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test & restart
nginx -t
systemctl restart nginx
```

### Step 8: Set Up SSL with Let's Encrypt (5 minutes)

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

# Verify certificate
certbot certificates
```

---

## ✅ Post-Deployment Checklist

### For All Options

- [ ] App/service is running
- [ ] Database migration completed: `bun run db:push`
- [ ] Health check endpoint works: `curl https://your-domain/api/health`
- [ ] Can access dashboard: Open in browser
- [ ] Stripe webhook configured and receiving events
- [ ] Logs accessible and clean (no errors)

### Testing Payment Flow

```bash
# 1. Create test user account
# Go to dashboard, sign up with test email

# 2. Create Stripe test subscription
# Use test card: 4242 4242 4242 4242

# 3. Verify webhook received
# Check logs for webhook success message

# 4. Verify K8s resources (DOKS only)
kubectl get ns | grep customer

# 5. Create test session
curl -X POST https://your-domain/api/sessions/create \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json" \
  -d '{"browser": "chrome"}'
```

---

## 📊 Cost Comparison

| Option | Setup | Monthly | Startup | Scaling |
|--------|-------|---------|---------|---------|
| **App Platform** | 15 min | $12-60 | Fastest | Automatic |
| **DOKS** | 30 min | $12-40 | Medium | HPA + manual |
| **Droplets** | 45 min | $12-24 | Manual | Manual scaling |

---

## 🔧 Troubleshooting

### App Platform: Deployment Failed
```
Solution:
1. Check build logs in Dashboard
2. Verify app.yaml syntax
3. Ensure .env variables are set
4. Rebuild and redeploy
```

### DOKS: Pod Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n tggrid

# Check logs
kubectl logs <pod-name> -n tggrid

# Check image pull
kubectl get events -n tggrid

# Solution:
# 1. Verify image exists in registry
# 2. Check image pull secrets
# 3. Verify sufficient cluster resources
```

### Droplets: Connection Refused
```bash
# Check service running
docker-compose ps

# Check port binding
netstat -tuln | grep 3000

# Check logs
docker-compose logs main

# Solution:
# 1. Rebuild container
# 2. Check .env variables
# 3. Verify database connection
```

### Stripe Webhook Not Received
```
Solution:
1. Verify webhook endpoint URL is public
2. Check webhook secret matches exactly
3. View webhook attempts in Stripe dashboard
4. Check app logs for webhook errors
5. Resend webhook from Stripe dashboard
```

---

## 🚀 Next Steps After Deployment

### Week 1
- [ ] Monitor app performance
- [ ] Test payment flow with real Stripe keys
- [ ] Check database for schema correctness
- [ ] Verify webhook delivery
- [ ] Monitor resource usage

### Week 2
- [ ] Enable monitoring (DigitalOcean Monitor)
- [ ] Set up alerts for CPU/memory/disk
- [ ] Configure automated backups
- [ ] Scale app as needed
- [ ] Optimize performance

### Week 3
- [ ] Load test the application
- [ ] Fine-tune resource allocation
- [ ] Document runbooks
- [ ] Prepare for production users

---

## 📞 DigitalOcean Resources

**Official Documentation**:
- App Platform: https://docs.digitalocean.com/products/app-platform/
- DOKS: https://docs.digitalocean.com/products/kubernetes/
- Droplets: https://docs.digitalocean.com/products/droplets/

**CLI Documentation**:
```bash
# Get help
doctl help

# List all commands
doctl compute droplet list
doctl apps list
doctl kubernetes cluster list
```

---

## ✨ Recommended Path for You

**Given your DigitalOcean account**, I recommend:

### **Option 1: App Platform (If you want to launch FAST)**
✅ **Pros**: 
- Easiest deployment (15 minutes)
- Managed everything (no DevOps work)
- Perfect for MVP/testing
- Cost: Only $12/month

❌ **Cons**:
- Less flexible for custom scaling
- More expensive at large scale
- Limited to single region

### **Option 2: DOKS (If you want to scale properly)**
✅ **Pros**:
- Full Kubernetes control
- HPA auto-scaling (we already configured it!)
- Better cost at scale
- Future-proof architecture

❌ **Cons**:
- 30 minutes setup
- Requires K8s knowledge
- More management

### **My Recommendation**: Start with **Option 1 (App Platform)** for MVP, migrate to **Option 2 (DOKS)** when you have paying customers.

---

**Which option would you like to proceed with?**

Generated: December 22, 2025
