# UFBrowsers - Deployment Checklist

## ✅ Phase 1: Implementation (COMPLETE)

**Status**: All core components created and compiled successfully

### Completed Tasks
- [x] Kubernetes client utility (`src/lib/kubernetes.ts`)
- [x] Event bus system (`src/lib/event-bus.ts`)
- [x] Resource allocator (`src/lib/resource-allocator.ts`)
- [x] Stripe webhook receiver (`src/app/api/webhooks/stripe/route.ts`)
- [x] Database schema updates (billing fields, Transaction model)
- [x] Session creation route with billing checks
- [x] Session end/cleanup route
- [x] Dependency installation (stripe, uuid, @kubernetes/client-node)
- [x] Prisma client generation
- [x] Build verification (✅ Compiled successfully in 15.0s)

---

## 🔄 Phase 2: Pre-Deployment (THIS WEEK)

### Step 1: Environment Configuration (15 minutes)

Update `.env` with production values:

```bash
# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx

# Kubernetes (for AWS EKS)
KUBERNETES_SERVICE_HOST=your-eks-cluster.eks.amazonaws.com
KUBERNETES_SERVICE_PORT=443
KUBECONFIG=/path/to/kubeconfig

# Or for local testing:
KUBERNETES_SERVICE_HOST=localhost
KUBERNETES_SERVICE_PORT=6443

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/tggrid"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Feature flags
DEBUG_EVENTS=true
ENABLE_AUTO_SCALING=true
BROWSER_POOL_SIZE=20
PRE_WARM_COUNT=10
```

### Step 2: Database Migration (10 minutes)

```bash
# Apply Prisma migrations
bun run db:push

# Or for staged environments:
bun run db:migrate --name "add-billing-schema"

# Verify schema
bun run db:generate
```

### Step 3: Local Testing (30 minutes)

```bash
# Start all services
bun run dev:all

# Or in separate terminals:
bun run dev                           # Terminal 1: Next.js app (port 3000)
cd mini-services/browser-pool && bun run dev    # Terminal 2: Browser pool (port 3002)
cd mini-services/browser-websocket && bun run dev  # Terminal 3: WebSocket (port 3001)

# Wait for all services to start (~30 seconds)
```

### Step 4: Stripe Webhook Testing (20 minutes)

```bash
# Install Stripe CLI (if not already installed)
brew install stripe/stripe-cli/stripe

# Login to Stripe account
stripe login

# Start webhook forwarding (in new terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Get webhook signing secret
stripe listen --print-secret

# Update .env with STRIPE_WEBHOOK_SECRET from above
```

### Step 5: Test Payment Flow (30 minutes)

**Test Scenario 1: Basic Payment**
1. Visit http://localhost:3000
2. Click "Subscribe Professional"
3. Use Stripe test card: `4242 4242 4242 4242` (exp: any future date, CVC: any)
4. Verify:
   - Payment processed
   - User record updated with stripeSubscriptionId
   - K8s namespace created (if cluster available)
   - Transaction logged in database

**Test Scenario 2: Session Creation with Balance**
1. After subscription, go to `/api/sessions/create`
2. Create session:
   ```bash
   curl -X POST http://localhost:3000/api/sessions/create \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"browser": "chrome"}'
   ```
3. Verify:
   - Balance debited by 1
   - Session created with CDP URL
   - Transaction logged

**Test Scenario 3: Session Completion**
1. Complete session:
   ```bash
   curl -X POST http://localhost:3000/api/sessions/{sessionId}/end
   ```
2. Verify:
   - Session marked as completed
   - Cost calculated
   - Metrics logged
   - Pod returned to warm pool

---

## 🚀 Phase 3: Deployment (WEEK 2)

### Option A: AWS EKS Deployment

#### Prerequisites
```bash
# Install AWS CLI
brew install awscli

# Install kubectl
brew install kubernetes-cli

# Install Helm
brew install helm

# Configure AWS credentials
aws configure
```

#### Create EKS Cluster
```bash
# Using eksctl (simplest)
brew install eksctl

eksctl create cluster \
  --name tggrid-prod \
  --region us-east-1 \
  --nodegroup-name standard-nodes \
  --node-type t3a.large \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --with-oidc

# Get kubeconfig
aws eks update-kubeconfig --name tggrid-prod --region us-east-1
```

#### Deploy to EKS
```bash
# Create namespace
kubectl create namespace tggrid

# Create secrets
kubectl create secret generic stripe-keys \
  --from-literal=STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY \
  --from-literal=STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET \
  -n tggrid

# Apply Helm chart
helm install tggrid helm/tggrid/ \
  --namespace tggrid \
  --set image.tag=latest \
  --set stripeSecretName=stripe-keys

# Verify deployment
kubectl get pods -n tggrid
kubectl logs -f deployment/tggrid-main -n tggrid
```

### Option B: Docker Compose (Quick Launch)

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Verify services running
docker-compose ps

# Check logs
docker-compose logs -f
```

### Option C: Heroku/Fly.io (Simplest for Bootstrap)

**Heroku:**
```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create tggrid-prod

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Deploy
git push heroku main

# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_live_xxxxx
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# View logs
heroku logs --tail
```

---

## 📋 Phase 4: Production Validation

### Pre-Launch Checklist

- [ ] All environment variables set correctly
- [ ] Database connected and migrated
- [ ] Stripe webhook configured (production API keys)
- [ ] Kubernetes cluster running (or Docker containers)
- [ ] SSL/TLS certificate configured
- [ ] Monitoring/logging configured (CloudWatch/Datadog)
- [ ] Backup strategy in place
- [ ] Rate limiting enabled
- [ ] Error handling tested
- [ ] Audit logging verified

### Monitoring Setup

```bash
# CloudWatch (AWS)
# Automatically logs to CloudWatch from EKS

# Datadog (Third-party, optional)
DD_AGENT_HOST=127.0.0.1 DD_AGENT_PORT=8125 npm start

# Prometheus (Self-hosted)
# Already configured in prometheus.yml
```

### Load Testing (Before Launch)

```bash
# Install Apache Bench
brew install httpd

# Test concurrent requests
ab -n 1000 -c 50 http://localhost:3000/

# Or use k6 for advanced testing
brew install k6

# Create load test script (load-test.js):
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  let res = http.post('http://localhost:3000/api/sessions/create', {
    browser: 'chrome',
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}

# Run test
k6 run load-test.js
```

---

## 🔐 Security Checklist

- [ ] HTTPS enabled (SSL/TLS certificate)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS protection enabled
- [ ] CSRF tokens configured
- [ ] Sensitive data encrypted (API keys, tokens)
- [ ] Audit logging enabled
- [ ] Stripe webhook signature verification working
- [ ] Environment variables not exposed in logs
- [ ] Database backups automated

---

## 📊 Post-Deployment Monitoring

### Key Metrics to Monitor

```
1. Session Creation Success Rate
   - Target: >99.5%
   - Alert if: <99%

2. Session Startup Time
   - Target: <200ms for pre-warmed
   - Target: <500ms for on-demand
   - Alert if: >1000ms

3. Kubernetes Pod Health
   - Target: >95% pods healthy
   - Alert if: <90%

4. Payment Processing
   - Target: 100% webhook delivery
   - Alert if: webhook failures

5. Database Performance
   - Target: <100ms queries
   - Alert if: >500ms

6. Error Rate
   - Target: <0.1%
   - Alert if: >1%
```

### Monitoring Tools

**CloudWatch (AWS Built-in)**
- CPU usage
- Memory usage
- Request count
- Error count
- Latency

**Prometheus + Grafana**
- Custom metrics
- Pod resource utilization
- Kubernetes cluster health

**Datadog (Third-party, Optional)**
- APM (application performance)
- Log aggregation
- Custom dashboards

---

## 🆘 Troubleshooting Guide

### Issue: Webhooks Not Received

**Solution:**
1. Verify webhook URL is publicly accessible: `curl https://your-domain.com/api/webhooks/stripe`
2. Check webhook secret in environment: `echo $STRIPE_WEBHOOK_SECRET`
3. View logs: `kubectl logs -f deployment/tggrid-main`
4. Resend webhook in Stripe dashboard: Dashboard → Developers → Webhooks → Event details → Resend

### Issue: Sessions Failing to Create

**Solution:**
1. Check subscription status: `curl http://localhost:3000/api/auth/me`
2. Verify K8s resources allocated: `kubectl get ns | grep customer`
3. Check balance: Query database `SELECT accountBalance FROM "User"`
4. Check logs for errors

### Issue: High Latency

**Solution:**
1. Check pod resources: `kubectl top pods -n tggrid`
2. Scale up pods: `kubectl scale deployment tggrid-main --replicas=5 -n tggrid`
3. Check database: `SELECT count(*) FROM "BrowserSession" WHERE status = 'active'`
4. Review application logs for slow queries

### Issue: Pod Crashes

**Solution:**
1. Check pod status: `kubectl describe pod <pod-name> -n tggrid`
2. View logs: `kubectl logs <pod-name> -n tggrid --previous`
3. Check resources: `kubectl top pods -n tggrid`
4. Increase memory/CPU limits in Helm chart

---

## 📞 Support & Escalation

**Critical Issues** (Customer-facing):
1. Page incident commander
2. Check CloudWatch/logs
3. Rollback if necessary
4. Notify customers

**Non-Critical Issues**:
1. Log in JIRA
2. Schedule fix for next sprint
3. Monitor closely

---

## ✅ Launch Readiness Checklist

Before going live to customers:

- [ ] All Phase 1-3 steps completed
- [ ] Load testing passed (>1000 requests/sec)
- [ ] Security audit passed
- [ ] Database backup working
- [ ] Monitoring alerts configured
- [ ] Runbooks documented
- [ ] Team trained on deployment
- [ ] Rollback procedure tested
- [ ] Customer communication ready
- [ ] Support team briefed

---

## 📈 Success Metrics (Week 1)

- **Uptime**: >99%
- **Session Success Rate**: >99.5%
- **Avg Response Time**: <200ms
- **Payment Processing**: 100% success
- **Error Rate**: <0.1%
- **Pod Health**: >95%

---

## Next Steps

1. **This Week**: Complete Steps 1-5 (environment, database, testing)
2. **Next Week**: Deploy to staging (Step 3 - Deployment)
3. **Week 3**: Production deployment with monitoring
4. **Week 4**: Optimization and scale testing

---

**Build Status**: ✅ **COMPLETE** (15.0s compile time)
**Dependencies**: ✅ **INSTALLED** (stripe, uuid, @kubernetes/client-node)
**Ready for**: ✅ **DEPLOYMENT**

Generated: December 22, 2025
