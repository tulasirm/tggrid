#!/bin/bash

# On-Premises Deployment Verification Script
# Checks if docker-compose.yml has everything needed for on-prem solution

echo "🔍 UFBrowsers On-Premises Docker Compose Verification"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check counter
PASSED=0
FAILED=0
WARNINGS=0

# Function to check file existence
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $1 (Missing)"
    ((FAILED++))
  fi
}

# Function to check directory existence
check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1/"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $1/ (Missing)"
    ((FAILED++))
  fi
}

# Function to warn about optional files
check_optional() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1 (Optional)"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} $1 (Optional - needs to be generated)"
    ((WARNINGS++))
  fi
}

echo -e "${BLUE}📋 Core Docker Compose Setup${NC}"
echo ""
check_file "docker-compose.yml"
check_file ".env"

echo ""
echo -e "${BLUE}🔌 Application Services${NC}"
echo ""
check_file "src/app/page.tsx"
check_dir "mini-services/browser-pool"
check_dir "mini-services/browser-websocket"
check_file "postgres/init.sql"

echo ""
echo -e "${BLUE}🔒 SSL/TLS Configuration${NC}"
echo ""
check_optional "ssl/cert.pem"
check_optional "ssl/key.pem"

echo ""
echo -e "${BLUE}🌐 Nginx Reverse Proxy${NC}"
echo ""
check_file "nginx.conf"

echo ""
echo -e "${BLUE}📊 Prometheus Monitoring${NC}"
echo ""
check_file "prometheus.yml"
check_file "prometheus-rules.yml"

echo ""
echo -e "${BLUE}📈 Grafana Dashboards${NC}"
echo ""
check_dir "grafana/provisioning/datasources"
check_dir "grafana/provisioning/dashboards"
check_file "grafana/provisioning/datasources/prometheus.yml"
check_file "grafana/provisioning/dashboards/dashboard-provider.yml"
check_file "grafana/provisioning/dashboards/ufbrowsers-overview.json"

echo ""
echo -e "${BLUE}📚 Documentation${NC}"
echo ""
check_file "ONPREMISES-DEPLOYMENT.md"
check_file "docker-compose.yml"

echo ""
echo "=================================================="
echo -e "${GREEN}✓ Passed: $PASSED${NC}  ${RED}✗ Failed: $FAILED${NC}  ${YELLOW}⚠ Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All required files for on-premises deployment are present!${NC}"
  echo ""
  echo "📌 Next steps:"
  echo "1. Generate SSL certificates: openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes"
  echo "2. Create .env file: cp .env.example .env (or create manually)"
  echo "3. Update credentials in .env with secure values"
  echo "4. Start services: docker-compose up -d"
  echo "5. Monitor: docker-compose ps"
  exit 0
else
  echo -e "${RED}❌ Missing files. Check the output above.${NC}"
  echo ""
  echo "📌 Missing files must be created before deployment."
  exit 1
fi
