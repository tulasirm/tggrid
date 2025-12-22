# On-Premises Deployment Quick Start

## 🚀 One-Command Setup

```bash
./setup-onpremises.sh
```

This single script automates the entire setup process:

- ✅ Checks all prerequisites (Docker, Docker Compose, OpenSSL)
- ✅ Generates SSL certificates automatically
- ✅ Creates `.env` configuration file
- ✅ Validates all configuration files
- ✅ Shows deployment instructions

## 📝 What It Does

### 1. Prerequisites Check
Verifies:
- Docker is installed and running
- Docker Compose is available
- OpenSSL is installed
- Sufficient disk space
- Required ports are available

### 2. SSL Certificate Generation
- Creates self-signed certificates for HTTPS
- Valid for 365 days
- Securely stores private key (chmod 600)
- Reuses existing certificates if present

### 3. Environment Configuration
- Prompts for PostgreSQL password
- Prompts for domain/hostname
- Generates secure NextAuth secret
- Creates properly formatted `.env` file

### 4. Configuration Verification
- Checks all required files exist
- Validates Docker Compose setup
- Confirms monitoring stack
- Lists any missing files

### 5. Deployment Guidance
- Shows how to start services
- Lists access URLs
- Provides security reminders
- Links to detailed documentation

## 🎯 Usage

### Interactive Mode (Recommended)
```bash
./setup-onpremises.sh
# Prompts for passwords and configuration
```

### Non-Interactive Mode
```bash
# Decline all prompts (use defaults/existing files)
./setup-onpremises.sh <<< $'n\nn\nn\n'
```

## 📚 After Setup

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Access applications:**
   - UFBrowsers: https://localhost
   - Grafana: http://localhost:3004 (admin/admin)
   - Prometheus: http://localhost:9090

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Verify health:**
   ```bash
   curl -k https://localhost/health
   ```

## 🔐 Security Notes

The script generates self-signed certificates suitable for development and testing. For production:

1. Use proper certificates from Let's Encrypt or your CA
2. Update `.env` with strong passwords
3. Configure firewall rules
4. Setup regular backups
5. Enable monitoring and alerts

## ✅ What You Get

After running the setup script:

```
UFBrowsers/
├── ssl/
│   ├── cert.pem          ✅ Generated
│   └── key.pem           ✅ Generated
├── .env                  ✅ Created
├── docker-compose.yml    ✅ Ready
├── nginx.conf            ✅ Ready
├── prometheus.yml        ✅ Ready
└── grafana/              ✅ Ready
```

Ready to deploy with: `docker-compose up -d`

## 📖 Full Documentation

- [Complete Deployment Guide](ONPREMISES-DEPLOYMENT.md)
- [Quick Reference](ONPREMISES-READY.md)
- [Verification Script](verify-onpremises.sh)

---

**Status**: Production Ready ✅
