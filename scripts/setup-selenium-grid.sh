#!/bin/bash

# Enterprise Selenium Box - Docker Setup Script
# This script sets up Selenium Grid with Docker containers

set -e

echo "🚀 Setting up Enterprise Selenium Box with Docker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed"
}

# Check if Docker is running
check_docker_running() {
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker service."
        exit 1
    fi
    
    print_status "Docker service is running"
}

# Create Docker network
create_network() {
    print_step "Creating Docker network..."
    
    if ! docker network inspect selenium-grid &> /dev/null; then
        docker network create selenium-grid
        print_status "Created Docker network: selenium-grid"
    else
        print_status "Docker network 'selenium-grid' already exists"
    fi
}

# Create docker-compose.yml
create_docker_compose() {
    print_step "Creating Docker Compose configuration..."
    
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  selenium-hub:
    image: selenium/hub:4.15.0
    container_name: selenium-hub
    ports:
      - "4444:4444"
      - "4442:4442"
      - "4443:4443"
    environment:
      - GRID_MAX_SESSION=50
      - GRID_BROWSER_TIMEOUT=300
      - GRID_NEW_SESSION_WAIT_TIMEOUT=30000
      - GRID_THROW_ON_CAPABILITY_NOT_PRESENT=true
      - GRID_CLEAN_UP_CYCLE=5000
    networks:
      - selenium-grid
    volumes:
      - ./logs:/opt/selenium/logs
    restart: unless-stopped

  chrome-node:
    image: selenium/standalone-chrome:4.15.0
    container_name: chrome-node-1
    depends_on:
      - selenium-hub
    environment:
      - HUB_HOST=selenium-hub
      - HUB_PORT=4444
      - NODE_MAX_SESSION=10
      - NODE_MAX_INSTANCES=5
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - VNC_NO_PASSWORD=1
      - SCREEN_WIDTH=1920
      - SCREEN_HEIGHT=1080
    ports:
      - "5900:5900"  # VNC port
      - "7900:7900"  # NoVNC web interface
    networks:
      - selenium-grid
    volumes:
      - ./downloads:/home/seluser/Downloads
      - ./logs:/opt/selenium/logs
    restart: unless-stopped

  firefox-node:
    image: selenium/standalone-firefox:4.15.0
    container_name: firefox-node-1
    depends_on:
      - selenium-hub
    environment:
      - HUB_HOST=selenium-hub
      - HUB_PORT=4444
      - NODE_MAX_SESSION=10
      - NODE_MAX_INSTANCES=5
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - VNC_NO_PASSWORD=1
      - SCREEN_WIDTH=1920
      - SCREEN_HEIGHT=1080
    ports:
      - "5901:5900"  # VNC port
      - "7901:7900"  # NoVNC web interface
    networks:
      - selenium-grid
    volumes:
      - ./downloads:/home/seluser/Downloads
      - ./logs:/opt/selenium/logs
    restart: unless-stopped

  edge-node:
    image: selenium/standalone-edge:4.15.0
    container_name: edge-node-1
    depends_on:
      - selenium-hub
    environment:
      - HUB_HOST=selenium-hub
      - HUB_PORT=4444
      - NODE_MAX_SESSION=10
      - NODE_MAX_INSTANCES=5
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - VNC_NO_PASSWORD=1
      - SCREEN_WIDTH=1920
      - SCREEN_HEIGHT=1080
    ports:
      - "5902:5900"  # VNC port
      - "7902:7900"  # NoVNC web interface
    networks:
      - selenium-grid
    volumes:
      - ./downloads:/home/seluser/Downloads
      - ./logs:/opt/selenium/logs
    restart: unless-stopped

networks:
  selenium-grid:
    driver: bridge

volumes:
  downloads:
  logs:
EOF

    print_status "Docker Compose configuration created"
}

# Create necessary directories
create_directories() {
    print_step "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p downloads
    mkdir -p db
    
    print_status "Directories created: logs, downloads, db"
}

# Pull Docker images
pull_images() {
    print_step "Pulling Docker images..."
    
    docker pull selenium/hub:4.15.0
    docker pull selenium/standalone-chrome:4.15.0
    docker pull selenium/standalone-firefox:4.15.0
    docker pull selenium/standalone-edge:4.15.0
    
    print_status "Docker images pulled successfully"
}

# Start Selenium Grid
start_selenium_grid() {
    print_step "Starting Selenium Grid..."
    
    docker-compose up -d
    
    print_status "Selenium Grid is starting up..."
    print_status "This may take a few minutes..."
    
    # Wait for hub to be ready
    print_step "Waiting for Selenium Hub to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:4444/wd/hub/status > /dev/null 2>&1; then
            print_status "Selenium Hub is ready!"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
}

# Display access information
display_info() {
    print_status "🎉 Selenium Grid is now running!"
    echo ""
    echo "📊 Access Information:"
    echo "  • Selenium Hub: http://localhost:4444"
    echo "  • Grid Console: http://localhost:4444/grid/console"
    echo "  • Chrome VNC: vnc://localhost:5900"
    echo "  • Chrome NoVNC: http://localhost:7900"
    echo "  • Firefox VNC: vnc://localhost:5901"
    echo "  • Firefox NoVNC: http://localhost:7901"
    echo "  • Edge VNC: vnc://localhost:5902"
    echo "  • Edge NoVNC: http://localhost:7902"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Stop grid: docker-compose down"
    echo "  • Restart grid: docker-compose restart"
    echo "  • Check status: curl http://localhost:4444/wd/hub/status"
    echo ""
    echo "📁 Important Files:"
    echo "  • Logs: ./logs/"
    echo "  • Downloads: ./downloads/"
    echo "  • Config: docker-compose.yml"
    echo ""
}

# Main execution
main() {
    echo "🐳 Enterprise Selenium Box Docker Setup"
    echo "=========================================="
    echo ""
    
    check_docker
    check_docker_running
    create_directories
    create_network
    create_docker_compose
    pull_images
    start_selenium_grid
    display_info
    
    echo "✅ Setup completed successfully!"
    echo ""
    echo "🚀 You can now start the Enterprise Selenium Box application:"
    echo "   bun run dev"
    echo ""
}

# Handle script interruption
trap 'print_warning "Setup interrupted"; exit 1' INT

# Run main function
main "$@"