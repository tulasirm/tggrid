# 🚀 DigitalOcean Deployment - Quick Checklist

## 📋 Before You Start

- [ ] DigitalOcean account active
- [ ] GitHub account with repo pushed
- [ ] Stripe account (test or live)
- [ ] Domain name (optional)
- [ ] 45-60 minutes available

---

## 🎯 Choose Your Path

### Path A: App Platform (Recommended for MVP - 15 min)
```
Best for: Quick launch, testing, MVP
Cost: $12/month
Setup time: 15 minutes
```

### Path B: DOKS Kubernetes (Recommended for Scale - 30 min)
```
Best for: Production, scaling, full control
Cost: $12 cluster + $6-20/node
Setup time: 30 minutes
```

### Path C: Droplets + Docker (Recommended for Control - 45 min)
```
Best for: Custom setup, maximum control
Cost: $12/month per droplet
Setup time: 45 minutes
```

---

## 📝 Step-by-Step (Choose One Path Below)

## ===============================
## PATH A: App Platform (FASTEST)
## ===============================

### A1: Push Code to GitHub (5 min)
```bash
cd /Users/tsiripireddytest/Downloads/TGGrid

# Initialize/update repo
git init
git add .
git commit -m "Deploy to DigitalOcean"
git remote add origin https://github.com/YOUR-USERNAME/tggrid.git
git branch -M main
git push -u origin main
```

**✅ Done**: Code is in GitHub

---

### A2: Create App in DigitalOcean (10 min)

1. **Go to** https://cloud.digitalocean.com/
2. **Click** "Apps" (left sidebar)
3. **Click** "Create App"
4. **Select** "GitHub" → Authorize
5. **Select** your `tggrid` repository
6. **Select** branch: `main`
7. **Accept** auto-detected settings
8. **Click** "Next"

**✅ Done**: App created

---

### A3: Set Environment Variables (5 min)

1. **In App Platform settings**, click "Environment"
2. **Add these variables**:

```
NODE_ENV=production
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
DATABASE_URL=postgresql://...
```

3. **Note**: Get `DATABASE_URL` from DigitalOcean Databases (create below)

**✅ Done**: Environment configured

---

### A4: Create Database (5 min)

1. **In DigitalOcean console**, click "Databases"
2. **Click** "Create Database Cluster"
3. **Select**:
   - Engine: PostgreSQL 15
   - Size: Basic ($15/month)
   - Region: (same as app)
4. **Create** and wait 2-3 minutes
5. **Copy** connection string from "Connection details"
6. **Paste** into `DATABASE_URL` in app settings

**✅ Done**: Database created and configured

---

### A5: Deploy (Click Button!)

1. **In App Platform**, click "Create Resources"
2. **Watch** deployment progress (takes 5-10 min)
3. **Wait** for "Live" status
4. **Get** app URL from dashboard

**✅ Done**: App is LIVE!

Example: `https://tggrid-abc123.ondigitalocean.app`

---

### A6: Configure Stripe Webhook (5 min)

1. **Go to** https://dashboard.stripe.com/webhooks
2. **Click** "+ Add endpoint"
3. **Enter URL**: `https://tggrid-abc123.ondigitalocean.app/api/webhooks/stripe`
4. **Select events**: 
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. **Copy** webhook secret
6. **Update** in DigitalOcean app settings: `STRIPE_WEBHOOK_SECRET`
7. **Redeploy** (automatic when env changes)

**✅ Done**: Webhook configured

---

### A7: Test It! (5 min)

```bash
# Test health endpoint
curl https://tggrid-abc123.ondigitalocean.app/api/health

# Should return:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "services": {...}
# }

# Open dashboard
open https://tggrid-abc123.ondigitalocean.app
```

**✅ Done**: App is working!

---

### A8: Run Database Migration (5 min)

```bash
# Via DigitalOcean App Platform SSH
doctl apps list  # Find your app ID
doctl apps logs <app-id> --follow

# Or manually via DigitalOcean Console:
# 1. Click "Console" in app settings
# 2. Run: bun run db:push
```

**✅ Done**: Database schema is ready

---

## ===============================
## PATH B: DOKS Kubernetes
## ===============================

### B1: Install doctl CLI (5 min)

```bash
# Install
brew install doctl

# Authenticate (get token from https://cloud.digitalocean.com/account/api/tokens)
doctl auth init

# Enter your Personal Access Token when prompted
```

**✅ Done**: doctl configured

---

### B2: Create Kubernetes Cluster (10 min)

```bash
# Create cluster
doctl kubernetes cluster create tggrid-prod \
  --region nyc3 \
  --version 1.28 \
  --size s-2vcpu-4gb \
  --count 3 \
  --enable-monitoring

# Wait for cluster (5-10 minutes)
doctl kubernetes cluster get tggrid-prod

# Get kubeconfig
doctl kubernetes cluster kubeconfig save tggrid-prod

# Verify connection
kubectl cluster-info
kubectl get nodes
```

**✅ Done**: K8s cluster is running

---

### B3: Create Namespace & Secrets (5 min)

```bash
# Create namespace
kubectl create namespace tggrid

# Create Stripe secrets
kubectl create secret generic stripe-keys \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxxxx \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx \
  -n tggrid

# Create database secret
kubectl create secret generic database \
  --from-literal=DATABASE_URL='postgresql://user:pass@host:5432/tggrid' \
  -n tggrid

# Create auth secret
kubectl create secret generic auth-secrets \
  --from-literal=NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -n tggrid
```

**✅ Done**: Secrets configured

---

### B4: Build & Push Docker Image (10 min)

```bash
# Create registry
doctl registry create tggrid-registry

# Login
doctl registry login

# Build image
docker build -t registry.digitalocean.com/tggrid-registry/tggrid:latest .

# Push to registry
docker push registry.digitalocean.com/tggrid-registry/tggrid:latest

# Verify
doctl registry repository list-manifests tggrid-registry tggrid
```

**✅ Done**: Image in registry

---

### B5: Deploy to Kubernetes (10 min)

```bash
# Apply deployment manifest
kubectl apply -f k8s/digitalocean-deployment.yaml

# Watch deployment
kubectl rollout status deployment/tggrid-main -n tggrid

# Check pods
kubectl get pods -n tggrid

# Get LoadBalancer IP
kubectl get service tggrid-service -n tggrid

# Wait for EXTERNAL-IP to appear (might take 2-3 minutes)
```

**✅ Done**: App deployed to K8s!

---

### B6: Get Your URL

```bash
# Get the external IP
EXTERNAL_IP=$(kubectl get service tggrid-service -n tggrid -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Your app is at: http://$EXTERNAL_IP"

# Or set domain name
# Point your domain A record to: $EXTERNAL_IP
```

**✅ Done**: App accessible!

---

### B7: Configure SSL/TLS (Optional, 10 min)

```bash
# If using domain:
# 1. Point domain to LoadBalancer IP
# 2. Create Kubernetes Ingress with cert
# 3. Or use cert-manager for auto-renewal

# For now, use HTTP:
# Test: curl http://$EXTERNAL_IP/api/health
```

**✅ Done**: Ready for production

---

## ===============================
## PATH C: Droplets + Docker
## ===============================

### C1: Create Droplet (5 min)

```bash
# Via CLI
doctl compute droplet create tggrid-prod \
  --region nyc3 \
  --image ubuntu-23-10-x64 \
  --size s-2vcpu-4gb \
  --enable-monitoring

# Or use DigitalOcean Dashboard:
# Droplets → Create Droplet → Ubuntu 23.10 → s-2vcpu-4gb
```

**✅ Done**: Droplet created

---

### C2: SSH & Install Dependencies (10 min)

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

# Verify
docker --version
docker-compose --version
```

**✅ Done**: Dependencies installed

---

### C3: Clone Code & Configure (5 min)

```bash
# Clone repo
cd /root
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
EOF
```

**✅ Done**: Code configured

---

### C4: Start Services (10 min)

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Verify
docker-compose ps

# Check logs
docker-compose logs -f
```

**✅ Done**: Services running!

---

### C5: Configure Nginx (5 min)

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
    }
}
EOF

# Enable & start
ln -s /etc/nginx/sites-available/tggrid /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
```

**✅ Done**: Reverse proxy configured

---

### C6: Get Your IP

```bash
# Your app is at:
echo "http://your-droplet-ip"

# Or set custom domain:
# Point domain A record to: your-droplet-ip
```

**✅ Done**: App accessible!

---

## ✅ Post-Deployment (All Paths)

### Verify App is Working

```bash
# Health check
curl https://your-app-url/api/health

# Should show:
# {
#   "status": "healthy",
#   "services": {...}
# }
```

### Test Payment Flow

1. **Go to dashboard**: `https://your-app-url`
2. **Sign up** with test email
3. **Click** "Subscribe Professional"
4. **Use Stripe test card**: `4242 4242 4242 4242`
5. **Complete** checkout
6. **Verify** in dashboard:
   - Subscription shows "active"
   - Balance shows 5000 sessions
   - User can create sessions

### Database Migration

```bash
# Check if needed:
bun run db:migrate --status

# Or push schema:
bun run db:push
```

---

## 🎯 Which Path to Choose?

| Path | Time | Cost | Best For |
|------|------|------|----------|
| **A: App Platform** | 15 min | $12/mo | MVP, testing, fast launch |
| **B: DOKS** | 30 min | $18-40/mo | Production, scaling, K8s control |
| **C: Droplets** | 45 min | $12-24/mo | Full control, custom setup |

---

## 📊 Expected Outcomes

After completing your chosen path:

- ✅ App accessible at public URL
- ✅ Database connected and migrated
- ✅ Stripe webhook receiving events
- ✅ Users can subscribe and create sessions
- ✅ Billing auto-debits work
- ✅ Logs accessible for debugging
- ✅ Ready for production traffic

---

## ⚠️ If Something Goes Wrong

**App won't start:**
```bash
# Check logs
# App Platform: View build logs in console
# DOKS: kubectl logs <pod-name> -n tggrid
# Droplets: docker-compose logs main

# Common issue: Missing environment variable
# Add to .env and redeploy
```

**Webhook not received:**
```bash
# Verify endpoint URL is public and working:
curl https://your-app-url/api/webhooks/stripe
# Should return: 400 (missing Stripe signature - that's OK)

# If error: Check app logs
```

**Database connection failed:**
```bash
# Verify connection string:
echo $DATABASE_URL

# Check database is accessible:
psql $DATABASE_URL -c "SELECT 1"

# If fails: Create new DigitalOcean database and update URL
```

---

## 🎉 You're Ready!

Pick your path (A, B, or C) and follow the steps. Should take 15-45 minutes depending on which path.

**Recommendation**: Start with **Path A** (App Platform) for fastest MVP launch!

---

Generated: December 22, 2025
Ready to deploy! 🚀
