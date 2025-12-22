# TGGrid Deployment Guide

## Quick Start for Testing

### Prerequisites
- Bun or Node.js installed
- PostgreSQL 16+ running with database `tggrid`
- Port 3000 available

### Development Setup
```bash
cd /Users/tsiripireddytest/Downloads/TGGrid

# Install dependencies
bun install

# Push database schema
bun run db:push

# Start development server
bun run dev
```

Server will be available at: `http://localhost:3000`

## Production Deployment

### Build for Production
```bash
bun run build
```

### Run Production Build Locally
```bash
bun start
```

## Docker Deployment

### Build Docker Image
```bash
docker build -t tggrid:latest .
```

### Run with Docker Compose
```bash
# Create docker-compose.yml with PostgreSQL
docker-compose up -d
```

### Environment Variables Required
```env
DATABASE_URL="postgresql://postgres:password@postgres:5432/tggrid"
NODE_ENV="production"
```

## Cloud Deployment Options

### AWS Deployment
1. Build standalone: `bun run build`
2. Upload `.next/standalone` to AWS Lambda or ECS
3. Connect to AWS RDS PostgreSQL instance
4. Set DATABASE_URL environment variable

### Google Cloud Run
```bash
# Build Docker image
docker build -t gcr.io/project-id/tggrid:latest .

# Push to Google Container Registry
docker push gcr.io/project-id/tggrid:latest

# Deploy to Cloud Run
gcloud run deploy tggrid \
  --image gcr.io/project-id/tggrid:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL="postgresql://..."
```

### Azure Deployment
1. Create Azure Container Registry
2. Build and push Docker image
3. Create Azure App Service (Linux)
4. Create Azure Database for PostgreSQL
5. Deploy container to App Service

## Database Initialization

### Reset Database (Development Only)
```bash
bun run db:reset
```

### Create Database Backup
```bash
pg_dump -h localhost -U postgres -d tggrid > backup.sql
```

### Restore Database
```bash
psql -h localhost -U postgres -d tggrid < backup.sql
```

## Verification Checklist

Before deploying to production:

- [ ] `bun run build` completes successfully
- [ ] `bun start` runs without errors
- [ ] All API endpoints respond to requests
- [ ] Authentication endpoints working (login/register)
- [ ] PostgreSQL database connected and healthy
- [ ] Environment variables correctly set
- [ ] HTTPS/TLS certificates configured (if using HTTPS)

## Performance Considerations

### Optimize for Production
- Enable gzip compression
- Use CDN for static assets
- Configure connection pooling for PostgreSQL
- Monitor resource usage
- Set up auto-scaling (if using cloud)

### Database Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_browserSession_userId ON "browserSession"(userId);
CREATE INDEX idx_systemMetric_userId ON "systemMetric"(userId);
CREATE INDEX idx_systemMetric_timestamp ON "systemMetric"(timestamp);
```

## Monitoring

### Health Check Endpoint
```bash
curl http://localhost:3000/api/health
```

### View Application Logs
```bash
# In development
tail -f dev.log

# In production with systemd
journalctl -u tggrid -f
```

## Troubleshooting

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL status
psql -h localhost -U postgres -c "SELECT 1"

# Verify DATABASE_URL environment variable
echo $DATABASE_URL
```

### Build Fails
```bash
# Clean build
rm -rf .next node_modules
bun install
bun run build
```

## Support

For issues, check:
1. Application logs (`dev.log`)
2. PostgreSQL logs
3. Network connectivity to database
4. Environment variables configuration
5. Port availability

---

**Production Status**: ✅ Ready for Deployment
