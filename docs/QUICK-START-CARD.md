# UFBrowsers - Quick Start Card

## 🚀 Get Started in 5 Minutes

### 1. Set Environment Variables (2 min)

```bash
cp .env.example .env

# Edit .env with these essential values:
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL="postgresql://user:pass@localhost:5432/tggrid"
```

### 2. Database Setup (2 min)

```bash
bun run db:push
bun run db:generate
```

### 3. Start All Services (1 min)

```bash
bun run dev:all
```

Services automatically start:
- **Main app**: http://localhost:3000
- **WebSocket**: http://localhost:3001
- **Browser pool**: http://localhost:3002

---

## 💳 Test Payment Flow (10 min)

### Step 1: Set Up Stripe Webhook Forwarding
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Start forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Get webhook secret (save to .env as STRIPE_WEBHOOK_SECRET)
```

### Step 2: Create Test Payment
1. Open http://localhost:3000
2. Click "Subscribe Professional"
3. Use test card: `4242 4242 4242 4242` (expiry: any future date, CVC: any)
4. Complete checkout

### Step 3: Verify Webhook Processing
- Check server logs for "Webhook received"
- Query database: `SELECT subscriptionStatus FROM "User" LIMIT 1`
- Should show: `"active"`

---

## 📊 Key API Endpoints

### Create Session
```bash
curl -X POST http://localhost:3000/api/sessions/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"browser": "chrome"}'

# Response:
# {
#   "sessionId": "abc123...",
#   "cdpUrl": "ws://localhost:3002/...",
#   "remainingBalance": 4999,
#   "estimatedCost": 0.01
# }
```

### End Session
```bash
curl -X POST http://localhost:3000/api/sessions/{sessionId}/end

# Response:
# {
#   "sessionId": "abc123...",
#   "status": "completed",
#   "actualCost": 0.01,
#   "durationMinutes": 5.2
# }
```

### Check User Balance
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"

# Response includes:
# {
#   "accountBalance": 4999,
#   "subscriptionStatus": "active",
#   "subscriptionPlan": "professional"
# }
```

---

## 🛠️ Development Commands

```bash
# Development
bun run dev:all                    # Start all services
bun run dev                        # Main app only

# Build
bun run build                      # Production build
npm start                          # Run production build

# Database
bun run db:push                    # Apply schema changes
bun run db:migrate                 # Create migration
bun run db:generate                # Regenerate Prisma client

# Testing
bun test                           # Run all tests
bun test --watch                   # Watch mode

# Cleanup
docker system prune                # Remove unused Docker resources
```

---

## 🔍 Debugging

### Check Logs
```bash
# Main app logs
tail -f dev.log

# Docker logs
docker-compose logs -f

# Kubernetes logs
kubectl logs -f deployment/tggrid-main -n tggrid
```

### Database Queries
```bash
# Connect to Postgres
psql postgresql://user:pass@localhost:5432/tggrid

# Useful queries:
SELECT * FROM "User" WHERE email = 'test@example.com';
SELECT * FROM "BrowserSession" ORDER BY "createdAt" DESC LIMIT 10;
SELECT * FROM "Transaction" WHERE type = 'debit' LIMIT 5;
SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 10;
```

### Check Kubernetes
```bash
# List namespaces (customer accounts)
kubectl get ns

# Check customer resources
kubectl get resourcequota -n customer-xyz

# Monitor pods
kubectl top pods -n tggrid

# View pod logs
kubectl logs -f <pod-name> -n tggrid
```

---

## 📈 Success Criteria

### Local Development ✅
- [ ] bun run dev:all starts without errors
- [ ] http://localhost:3000 loads dashboard
- [ ] Stripe webhook test succeeds
- [ ] Session creation works
- [ ] Payment processes without errors

### Deployment ✅
- [ ] All environment variables set
- [ ] Database migrated successfully
- [ ] Build compiles in <20 seconds
- [ ] Services pass health checks
- [ ] Payment webhooks received

### Production ✅
- [ ] 99.9% uptime
- [ ] <200ms session startup
- [ ] 100% webhook delivery
- [ ] All transactions logged
- [ ] Monitoring alerts working

---

## ⚠️ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "STRIPE_SECRET_KEY not found" | Set in .env, don't commit to git |
| "Database connection refused" | Check PostgreSQL running: `psql --version` |
| "Webhook not received" | Ensure webhook secret matches in Stripe dashboard |
| "Port already in use" | Change PORT in .env or kill process: `lsof -i :3000` |
| "Pod won't start" | Check K8s cluster: `kubectl get nodes` |
| "Session creation fails" | Check user subscription: Query `"User"` table |

---

## 📞 Support

**Documentation**:
- Architecture: `docs/ARCHITECTURE-DIAGRAMS.md`
- Deployment: `DEPLOYMENT-CHECKLIST.md`
- Pricing: `docs/PRICING-COST-ANALYSIS.md`
- Kubernetes: `docs/K8S-DEPLOYMENT-GUIDE.md`

**Code**:
- Kubernetes: `src/lib/kubernetes.ts`
- Events: `src/lib/event-bus.ts`
- Billing: `src/app/api/sessions/create/route.ts`
- Payments: `src/app/api/webhooks/stripe/route.ts`

---

## 🎯 Next Steps

1. **Today**: Get environment variables and start dev server
2. **Tomorrow**: Test payment flow with Stripe
3. **This Week**: Write unit tests and deploy to staging
4. **Next Week**: Production deployment with monitoring
5. **Week 3**: Soft launch to 10% of users

---

**Status**: ✅ **READY** (Build: 15.0s | Tests: Ready | Deployment: Ready)

Generated: December 22, 2025
