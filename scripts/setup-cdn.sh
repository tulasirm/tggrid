#!/bin/bash

echo "🌐 Setting up CDN configuration..."

CDN_PROVIDER=${1:-cloudflare}

if [ "$CDN_PROVIDER" = "cloudflare" ]; then
    echo ""
    echo "📦 Configuring Cloudflare CDN..."
    
    # Check if Cloudflare CLI is installed
    if ! command -v wrangler &> /dev/null; then
        echo "Installing Cloudflare Wrangler CLI..."
        npm install -g wrangler
    fi
    
    # Deploy Workers
    echo ""
    echo "Deploying Cloudflare Workers..."
    cd cdn/workers
    wrangler deploy static-optimizer.js --name tggrid-static-optimizer
    
    # Configure DNS
    echo ""
    echo "To complete Cloudflare setup:"
    echo "1. Go to Cloudflare Dashboard: https://dash.cloudflare.com"
    echo "2. Add your domain: tggrid.com"
    echo "3. Update nameservers at your domain registrar"
    echo "4. Enable the following settings:"
    echo "   - SSL/TLS: Full (strict)"
    echo "   - Always Use HTTPS: On"
    echo "   - Automatic HTTPS Rewrites: On"
    echo "   - Brotli: On"
    echo "   - HTTP/2: On"
    echo "   - HTTP/3 (with QUIC): On"
    echo "   - 0-RTT Connection Resumption: On"
    echo "5. Configure Page Rules from: cdn/cloudflare-config.json"
    echo "6. Set up Load Balancing with geo-routing"
    
elif [ "$CDN_PROVIDER" = "cloudfront" ]; then
    echo ""
    echo "☁️  Configuring AWS CloudFront..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo "Please install AWS CLI: https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # Create S3 bucket for logs
    echo ""
    echo "Creating S3 bucket for CloudFront logs..."
    aws s3 mb s3://tggrid-cdn-logs --region us-east-1
    
    # Deploy CloudFront distribution
    echo ""
    echo "Creating CloudFront distribution..."
    aws cloudfront create-distribution --cli-input-json file://cdn/cloudfront-config.json
    
    echo ""
    echo "To complete CloudFront setup:"
    echo "1. Update ACCOUNT_ID and CERT_ID in cdn/cloudfront-config.json"
    echo "2. Request SSL certificate in ACM (us-east-1): aws acm request-certificate"
    echo "3. Create CloudFront Functions:"
    echo "   - security-headers function"
    echo "   - url-rewrite function"
    echo "4. Configure Route53 for DNS:"
    echo "   - Create hosted zone for tggrid.com"
    echo "   - Add CNAME record pointing to CloudFront distribution"
    echo "5. Enable AWS WAF for security"
    echo "6. Set up CloudWatch alarms for monitoring"
    
else
    echo "❌ Unknown CDN provider: $CDN_PROVIDER"
    echo "Supported providers: cloudflare, cloudfront"
    exit 1
fi

echo ""
echo "✅ CDN setup instructions generated!"
echo ""
echo "Environment variables to set:"
echo "CDN_URL=https://cdn.tggrid.com"
echo "CDN_PROVIDER=$CDN_PROVIDER"
echo "ASSET_PREFIX=/_next/static"
echo ""
echo "Update next.config.ts with:"
echo "assetPrefix: process.env.CDN_URL"
