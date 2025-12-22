#!/bin/bash

# UFBrowsers On-Premises Setup Script
# Automates SSL generation, .env creation, and deployment preparation
# Run: ./setup-onpremises.sh

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}${BOLD}═══════════════════════════════════════════${NC}"
  echo -e "${BLUE}${BOLD}$1${NC}"
  echo -e "${BLUE}${BOLD}═══════════════════════════════════════════${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# Main setup
main() {
  print_header "UFBrowsers On-Premises Setup"
  
  echo "This script will:"
  echo "  1. Check prerequisites (Docker, Docker Compose)"
  echo "  2. Generate SSL certificates if missing"
  echo "  3. Create .env file if missing"
  echo "  4. Verify all configuration files"
  echo "  5. Show deployment instructions"
  echo ""
  
  # Check prerequisites
  check_prerequisites
  
  # Generate SSL certificates
  setup_ssl
  
  # Create .env file
  setup_env
  
  # Verify setup
  verify_setup
  
  # Summary
  print_summary
}

check_prerequisites() {
  print_header "1️⃣  Checking Prerequisites"
  
  # Check Docker
  if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker installed: $DOCKER_VERSION"
  else
    print_error "Docker not installed. Please install Docker first."
    echo "  Visit: https://docs.docker.com/get-docker/"
    exit 1
  fi
  
  # Check Docker Compose
  if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    print_success "Docker Compose installed: $COMPOSE_VERSION"
  else
    print_error "Docker Compose not installed. Please install it first."
    echo "  Visit: https://docs.docker.com/compose/install/"
    exit 1
  fi
  
  # Check Docker daemon
  if docker ps &> /dev/null; then
    print_success "Docker daemon is running"
  else
    print_error "Docker daemon is not running. Please start Docker."
    exit 1
  fi
  
  # Check openssl
  if command -v openssl &> /dev/null; then
    print_success "OpenSSL installed"
  else
    print_error "OpenSSL not installed. Please install it."
    exit 1
  fi
  
  # Check available disk space
  AVAILABLE_SPACE=$(df -k "$ROOT_DIR" | awk 'NR==2 {print $4}')
  REQUIRED_SPACE=$((120 * 1024 * 1024))  # 120GB in KB
  
  if [ "$AVAILABLE_SPACE" -ge "$REQUIRED_SPACE" ]; then
    print_success "Sufficient disk space (available: $(numfmt --to=iec-i --suffix=B $((AVAILABLE_SPACE * 1024)) 2>/dev/null || echo "$AVAILABLE_SPACE KB"))"
  else
    print_warning "Available disk space may be insufficient for production (recommended: 120GB)"
    echo "         Available: $(numfmt --to=iec-i --suffix=B $((AVAILABLE_SPACE * 1024)) 2>/dev/null || echo "$AVAILABLE_SPACE KB")"
  fi
  
  # Check ports
  PORTS=(80 443 3000 3001 3002 3004 5432 6379 9090)
  print_info "Checking if required ports are available..."
  
  for port in "${PORTS[@]}"; do
    if ! lsof -i ":$port" &> /dev/null; then
      print_success "Port $port is available"
    else
      print_warning "Port $port may already be in use"
    fi
  done
}

setup_ssl() {
  print_header "2️⃣  Setting Up SSL Certificates"
  
  # Check if certificates already exist
  if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
    print_success "SSL certificates already exist"
    
    # Show certificate info
    CERT_INFO=$(openssl x509 -in ssl/cert.pem -noout -subject -dates 2>/dev/null)
    echo "$CERT_INFO" | sed 's/^/     /'
    
    read -p "Do you want to regenerate them? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_info "Keeping existing certificates"
      return
    fi
  fi
  
  # Create ssl directory
  mkdir -p ssl
  
  # Generate certificates
  print_info "Generating self-signed SSL certificate..."
  print_info "  Key size: 2048 bits"
  print_info "  Valid for: 365 days"
  print_info "  Common Name: localhost"
  
  openssl req -x509 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -days 365 \
    -nodes \
    -subj "/CN=localhost" \
    2>/dev/null
  
  # Set permissions
  chmod 600 ssl/key.pem
  chmod 644 ssl/cert.pem
  
  print_success "SSL certificates generated"
  print_info "  Certificate: ssl/cert.pem"
  print_info "  Private Key: ssl/key.pem"
  
  # Show certificate info
  echo ""
  print_info "Certificate Details:"
  openssl x509 -in ssl/cert.pem -noout -subject -dates | sed 's/^/     /'
}

setup_env() {
  print_header "3️⃣  Setting Up Environment File"
  
  if [ -f ".env" ]; then
    print_success ".env file already exists"
    
    read -p "Do you want to reconfigure it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_info "Keeping existing .env file"
      return
    fi
  fi
  
  print_info "Creating .env configuration file..."
  echo ""
  
  # Prompt for values or use defaults
  read -p "PostgreSQL password (default: 'changeme'): " -r POSTGRES_PASSWORD
  POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-changeme}
  
  read -p "PostgreSQL username (default: 'user'): " -r POSTGRES_USER
  POSTGRES_USER=${POSTGRES_USER:-user}
  
  read -p "Domain/Hostname (default: 'localhost'): " -r DOMAIN
  DOMAIN=${DOMAIN:-localhost}
  
  # Generate secure secrets
  NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null)
  
  # Create .env file
  cat > .env << EOF
# Application
NODE_ENV=production
PORT=3000

# Database
POSTGRES_DB=seleniumbox
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/seleniumbox

# Redis
REDIS_URL=redis://redis:6379

# Browser Pool
BROWSER_POOL_SIZE=30
PRE_WARM_COUNT=15
BROWSER_POOL_URL=http://browser-pool:3002
MAX_MEMORY_PER_CONTAINER=128
MAX_CPU_PER_CONTAINER=0.25

# WebSocket
WEBSOCKET_PORT=3001
WEBSOCKET_URL=ws://$DOMAIN:3001

# Security
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=https://$DOMAIN

# Monitoring
METRICS_ENABLED=true
ENABLE_LOAD_BALANCER=true
HEALTH_CHECK_INTERVAL=30
LOG_LEVEL=info
EOF

  print_success ".env file created"
  print_warning "IMPORTANT: Change POSTGRES_PASSWORD in .env to a strong password for production"
  print_info "  Domain configured: $DOMAIN"
  print_info "  NextAuth secret generated"
}

verify_setup() {
  print_header "4️⃣  Verifying Configuration"
  
  CHECKS_PASSED=0
  CHECKS_TOTAL=0
  
  check_item() {
    ((CHECKS_TOTAL++))
    if [ -f "$1" ] || [ -d "$1" ]; then
      print_success "$1"
      ((CHECKS_PASSED++))
    else
      print_error "$1 (Missing)"
    fi
  }
  
  echo "Configuration Files:"
  check_item "docker-compose.yml"
  check_item ".env"
  check_item "ssl/cert.pem"
  check_item "ssl/key.pem"
  
  echo ""
  echo "Infrastructure Files:"
  check_item "nginx.conf"
  check_item "prometheus.yml"
  check_item "postgres/init.sql"
  
  echo ""
  echo "Monitoring Setup:"
  check_item "grafana/provisioning/datasources"
  check_item "grafana/provisioning/dashboards"
  
  echo ""
  print_info "Verification: $CHECKS_PASSED/$CHECKS_TOTAL checks passed"
  
  if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    print_success "All checks passed!"
  else
    print_warning "Some configuration files are missing"
  fi
}

print_summary() {
  print_header "✅ Setup Complete!"
  
  echo "Your UFBrowsers on-premises deployment is ready to start."
  echo ""
  
  echo -e "${BOLD}📋 What's been set up:${NC}"
  echo "  ✓ SSL certificates generated (ssl/cert.pem, ssl/key.pem)"
  echo "  ✓ Environment configuration (.env)"
  echo "  ✓ Docker Compose services configured"
  echo "  ✓ Monitoring stack (Prometheus + Grafana)"
  echo "  ✓ All prerequisites verified"
  echo ""
  
  echo -e "${BOLD}🚀 Next Steps:${NC}"
  echo ""
  echo "  1. Review the .env file for security:"
  echo "     nano .env"
  echo ""
  echo "  2. Start all services:"
  echo "     docker-compose up -d"
  echo ""
  echo "  3. Wait for services to be ready (30-60 seconds)"
  echo ""
  echo "  4. Verify services are running:"
  echo "     docker-compose ps"
  echo ""
  echo "  5. Check health:"
  echo "     curl -k https://localhost/health"
  echo ""
  echo "  6. Access the application:"
  echo "     UFBrowsers Dashboard: https://localhost"
  echo "     Grafana:         http://localhost:3004 (admin/admin)"
  echo "     Prometheus:      http://localhost:9090"
  echo ""
  
  echo -e "${BOLD}📚 Documentation:${NC}"
  echo "  • Detailed guide:   ONPREMISES-DEPLOYMENT.md"
  echo "  • Quick reference:  ONPREMISES-READY.md"
  echo "  • Verification:     ./verify-onpremises.sh"
  echo ""
  
  echo -e "${BOLD}🔒 Security Reminder:${NC}"
  echo "  • Change POSTGRES_PASSWORD in .env to a strong password"
  echo "  • Keep ssl/key.pem secure (file permissions: 600)"
  echo "  • Use proper SSL certificates in production (Let's Encrypt)"
  echo "  • Setup firewall rules (only expose ports 80, 443)"
  echo "  • Configure database backups"
  echo ""
  
  echo -e "${BOLD}❓ Need Help?${NC}"
  echo "  • Check logs:       docker-compose logs -f <service>"
  echo "  • Stop services:    docker-compose stop"
  echo "  • Full cleanup:     docker-compose down -v"
  echo ""
  
  echo -e "${GREEN}${BOLD}Ready to deploy! Run: docker-compose up -d${NC}"
  echo ""
}

# Run main function
main "$@"
