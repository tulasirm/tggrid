#!/bin/bash

echo "🌍 Setting up Multi-Region Deployment..."

# Configuration
REGIONS=("us-east-1" "eu-west-1" "ap-southeast-1")
PRIMARY_REGION="us-east-1"

# Docker Swarm setup for multi-region
echo ""
echo "📦 Initializing Docker Swarm..."
docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')

# Deploy stack across regions
echo ""
echo "🚀 Deploying TGGrid stack..."
docker stack deploy -c docker-compose.multi-region.yml tggrid

# Setup region routing
echo ""
echo "🌐 Configuring region routing..."
cat > /etc/nginx/conf.d/multi-region.conf << 'EOF'
upstream tggrid_us_east {
    server us-east-1.tggrid.internal:3000;
}

upstream tggrid_eu_west {
    server eu-west-1.tggrid.internal:3000;
}

upstream tggrid_ap_southeast {
    server ap-southeast-1.tggrid.internal:3000;
}

# Geo-based routing
map $geoip2_country_code $tggrid_backend {
    default tggrid_us_east;
    
    # Europe
    GB tggrid_eu_west;
    FR tggrid_eu_west;
    DE tggrid_eu_west;
    IT tggrid_eu_west;
    ES tggrid_eu_west;
    
    # Asia Pacific
    SG tggrid_ap_southeast;
    JP tggrid_ap_southeast;
    KR tggrid_ap_southeast;
    AU tggrid_ap_southeast;
    IN tggrid_ap_southeast;
}

server {
    listen 80;
    server_name tggrid.com;

    location / {
        proxy_pass http://$tggrid_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Region $tggrid_backend;
    }
}
EOF

echo ""
echo "✅ Multi-region deployment setup complete!"
echo ""
echo "Regions:"
for region in "${REGIONS[@]}"; do
    echo "  - ${region}"
done
echo ""
echo "Primary region: ${PRIMARY_REGION}"
echo ""
echo "Next steps:"
echo "1. Deploy to each region using: ./deploy-region.sh <region>"
echo "2. Configure DNS for geo-routing"
echo "3. Setup cross-region database replication"
echo "4. Verify health checks in each region"
