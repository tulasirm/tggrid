# TGGrid Multi-Cloud Kubernetes Deployment

Complete guide to deploy TGGrid to DigitalOcean, GKE, and AWS Kubernetes platforms.

## 📋 Quick Overview

This deployment setup enables you to:

✅ Deploy to **3 major cloud providers** (DigitalOcean, Google Cloud, AWS)
✅ Use **Kubernetes** for orchestration and scaling
✅ Automatic **CI/CD pipeline** via GitHub Actions
✅ **Infrastructure as Code** with Kustomize & Helm
✅ Production-ready with **monitoring, scaling, SSL/TLS**

---

## 🎯 What's Included

### Kubernetes Manifests
```
k8s/
├── base-deployment.yaml          # Core manifests (all platforms)
├── overlays/
│   ├── digitalocean/             # DigitalOcean-specific
│   ├── gke/                       # Google Cloud-specific
│   └── aws/                       # AWS-specific
```

### Helm Charts
```
helm/
└── tggrid/
    ├── Chart.yaml                # Helm chart definition
    ├── values.yaml               # Default values
    └── templates/                # Chart templates
```

### CI/CD Pipeline
```
.github/workflows/
└── deploy-kubernetes.yml         # Automated deployments
```

### Documentation
```
docs/
└── K8S-DEPLOYMENT-GUIDE.md       # Complete deployment guide
```

---

## 🚀 Quick Start (Choose Your Platform)

### DigitalOcean

```bash
# 1. Create cluster
doctl kubernetes cluster create tggrid-cluster --region nyc3 --count 3

# 2. Get credentials
doctl kubernetes cluster kubeconfig save tggrid-cluster

# 3. Configure registry
doctl registry create tggrid-registry
doctl registry login

# 4. Push images
docker tag tggrid/main-app:latest registry.digitalocean.com/tggrid-registry/tggrid/main-app:latest
docker push registry.digitalocean.com/tggrid-registry/tggrid/main-app:latest
# (repeat for browser-pool and websocket-service)

# 5. Update secrets
cp k8s/overlays/digitalocean/secrets.env.template k8s/overlays/digitalocean/secrets.env
# Edit secrets.env with your values

# 6. Deploy
kustomize build k8s/overlays/digitalocean | kubectl apply -f -

# 7. Monitor
kubectl get pods -n tggrid
```

### Google Kubernetes Engine (GKE)

```bash
# 1. Create cluster
gcloud container clusters create tggrid-cluster \
  --region us-central1 --num-nodes 3 --machine-type n1-standard-2

# 2. Get credentials
gcloud container clusters get-credentials tggrid-cluster --region us-central1

# 3. Configure registry
gcloud auth configure-docker

# 4. Push images
docker tag tggrid/main-app:latest gcr.io/YOUR_PROJECT_ID/tggrid/main-app:latest
docker push gcr.io/YOUR_PROJECT_ID/tggrid/main-app:latest
# (repeat for browser-pool and websocket-service)

# 5. Update secrets
cp k8s/overlays/gke/secrets.env.template k8s/overlays/gke/secrets.env
# Edit secrets.env with your values

# 6. Deploy
kustomize build k8s/overlays/gke | kubectl apply -f -

# 7. Monitor
kubectl get pods -n tggrid
```

### AWS Elastic Kubernetes Service (EKS)

```bash
# 1. Create cluster
eksctl create cluster --name tggrid-cluster --region us-east-1 --nodes 3

# 2. Get credentials
aws eks update-kubeconfig --name tggrid-cluster --region us-east-1

# 3. Configure registry
aws ecr create-repository --repository-name tggrid/main-app

# 4. Push images
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker tag tggrid/main-app:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tggrid/main-app:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/tggrid/main-app:latest
# (repeat for browser-pool and websocket-service)

# 5. Update secrets
cp k8s/overlays/aws/secrets.env.template k8s/overlays/aws/secrets.env
# Edit secrets.env with your values

# 6. Deploy
kustomize build k8s/overlays/aws | kubectl apply -f -

# 7. Monitor
kubectl get pods -n tggrid
```

---

## 📦 Architecture

### Multi-Cloud Setup
```
┌─────────────────────────────────────────────────────────────┐
│                  GitHub Repository                          │
│                                                              │
│  ├─ k8s/ (Kubernetes manifests)                            │
│  ├─ helm/ (Helm charts)                                    │
│  ├─ .github/workflows/ (CI/CD)                             │
│  └─ src/, mini-services/ (Application code)               │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  GitHub Actions CI/CD         │
        │                               │
        │ • Build Docker images         │
        │ • Push to registries          │
        │ • Deploy to K8s clusters      │
        └──────┬────────┬────────┬──────┘
               │        │        │
     ┌─────────▼─┐  ┌──▼──────┐ ┌─▼────────┐
     │ DigitalOcean│  │ Google Cloud
     │    DOKS    │  │   GKE      │ AWS EKS   │
     ├─────────────┤  ├─────────────┤ ├─────────────┤
     │ • 3 nodes  │  │ • 3 nodes   │ │ • 3 nodes  │
     │ • Auto-    │  │ • Auto-     │ │ • Auto-    │
     │   scaling  │  │   scaling   │ │   scaling  │
     │ • LoadLB   │  │ • LoadLB    │ │ • ALB      │
     │ • SSL/TLS  │  │ • SSL/TLS   │ │ • SSL/TLS  │
     └─────────────┘  └─────────────┘ └─────────────┘
             │              │              │
             └──────────────┼──────────────┘
                            │
              ┌─────────────────────────────┐
              │    TGGrid Application       │
              │                             │
              │ • Main App (3 replicas)    │
              │ • Browser Pool (3 replicas)│
              │ • WebSocket (2 replicas)   │
              │ • PostgreSQL (1 replica)   │
              │                             │
              │ Scaling: 3-10 replicas      │
              └─────────────────────────────┘
```

---

## 🔑 Key Features

### Kubernetes Features
- **Deployments**: Auto-scaling, rolling updates, health checks
- **Services**: LoadBalancer, ClusterIP, NodePort
- **Ingress**: HTTP/HTTPS routing with SSL/TLS
- **Storage**: PersistentVolumes for data durability
- **NetworkPolicy**: Secure pod-to-pod communication

### Platform-Specific
- **DigitalOcean**: Simple managed Kubernetes with integrated registry
- **GKE**: Advanced auto-scaling and GCP integration
- **AWS**: Enterprise-grade with ELB/ALB integration

### High Availability
- Multiple replicas for critical services
- Pod disruption budgets (PDB)
- Horizontal Pod Autoscaling (HPA)
- Node affinity rules

### Monitoring & Observability
- Health checks (liveness & readiness probes)
- Resource metrics (CPU, memory)
- Pod logs and events
- Platform-specific monitoring (CloudWatch, Cloud Monitoring, etc.)

---

## 📊 Resource Requirements

### Minimum Per Node
- **Memory**: 2GB
- **CPU**: 2 cores
- **Storage**: 20GB

### Recommended Production
- **Nodes**: 3 (high availability)
- **Node Type**: Medium (2-4 cores, 4-8GB RAM)
- **Total Memory**: 12-24GB
- **Total CPU**: 6-12 cores

### Cost Estimate (Monthly)
| Platform | 3 Nodes | Estimate |
|----------|---------|----------|
| DigitalOcean | 3 × s-2vcpu-4gb | ~$60 |
| GKE | 3 × n1-standard-2 | ~$150 |
| AWS | 3 × t3.large | ~$140 |

---

## 🔄 CI/CD Pipeline

### Automated Workflow
1. **Push to main** → Trigger pipeline
2. **Build & Test** → npm/bun test
3. **Build Docker** → Create container images
4. **Push Images** → To registry (Docker Hub, GCR, ECR)
5. **Deploy** → Apply to all 3 K8s clusters
6. **Notify** → Slack notification on success/failure

### Required GitHub Secrets
```
DOCKER_USERNAME
DOCKER_PASSWORD
DIGITALOCEAN_ACCESS_TOKEN
GCP_PROJECT_ID
GCP_SERVICE_ACCOUNT_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
SLACK_WEBHOOK_URL (optional)
```

### Manual Deployment
```bash
# If not using CI/CD, deploy manually:
kustomize build k8s/overlays/digitalocean | kubectl apply -f -
kustomize build k8s/overlays/gke | kubectl apply -f -
kustomize build k8s/overlays/aws | kubectl apply -f -
```

---

## 🛠️ Customization

### Change Replicas
```bash
# Edit kustomization.yaml in each overlay:
replicas:
  - name: tggrid-app
    count: 5
```

### Change Resource Limits
```bash
# Edit base-deployment.yaml:
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Change Ingress Domain
```bash
# Update all ingress files:
hosts:
  - host: yourdomain.com
    paths:
      - path: /
        pathType: Prefix
```

### Configure SSL Certificate
```bash
# Update ingress with certificate:
tls:
  - secretName: tggrid-tls
    hosts:
      - yourdomain.com
```

---

## ✅ Deployment Checklist

- [ ] Choose your cloud provider
- [ ] Create Kubernetes cluster
- [ ] Create container registry
- [ ] Build and push Docker images
- [ ] Copy and customize secrets file
- [ ] Update image tags in kustomization.yaml
- [ ] Update domain names in ingress configs
- [ ] Deploy with Kustomize: `kustomize build k8s/overlays/PLATFORM | kubectl apply -f -`
- [ ] Verify pods are running: `kubectl get pods -n tggrid`
- [ ] Check LoadBalancer IP: `kubectl get svc -n tggrid`
- [ ] Point domain to LoadBalancer IP
- [ ] Test health endpoint: `curl https://yourdomain.com/api/health`
- [ ] Monitor logs: `kubectl logs -f deployment/tggrid-app -n tggrid`

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `k8s/base-deployment.yaml` | Core Kubernetes manifests |
| `k8s/overlays/digitalocean/*` | DigitalOcean-specific config |
| `k8s/overlays/gke/*` | GKE-specific config |
| `k8s/overlays/aws/*` | AWS-specific config |
| `helm/tggrid/Chart.yaml` | Helm chart metadata |
| `helm/tggrid/values.yaml` | Helm default values |
| `.github/workflows/deploy-kubernetes.yml` | CI/CD pipeline |
| `docs/K8S-DEPLOYMENT-GUIDE.md` | Detailed deployment guide |

---

## 🔧 Troubleshooting

### Pods not starting
```bash
kubectl describe pod -n tggrid <pod-name>
kubectl logs -n tggrid <pod-name>
```

### LoadBalancer pending
```bash
kubectl get svc -n tggrid
# Wait for external IP to be assigned
```

### Image pull errors
```bash
# Check secret
kubectl get secret -n tggrid docker-secret
# Recreate if needed:
kubectl create secret docker-registry docker-secret \
  --docker-server=YOUR_REGISTRY \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_PASSWORD \
  -n tggrid
```

### Database connection failed
```bash
# Check PostgreSQL pod
kubectl get pod -n tggrid postgres-xxx
# Check logs
kubectl logs -n tggrid postgres-xxx
```

---

## 📖 Next Steps

1. **Read Full Guide**: See `docs/K8S-DEPLOYMENT-GUIDE.md` for detailed instructions
2. **Set Up CI/CD**: Configure GitHub secrets for automated deployments
3. **Monitor**: Set up monitoring dashboards in each platform
4. **Backup**: Configure database backups
5. **Scale**: Adjust HPA settings based on load

---

## 🎯 Summary

You now have:

✅ **Kubernetes manifests** for 3 cloud platforms
✅ **Helm charts** for flexible deployments
✅ **Kustomize overlays** for platform customization
✅ **CI/CD pipeline** for automated deployments
✅ **Complete documentation** with step-by-step guides
✅ **Production-ready** configurations with HA, scaling, monitoring

**Ready to deploy? Choose your platform and follow the quick start above!** 🚀

---

**Status**: Production Ready ✅
**Version**: 1.0
**Last Updated**: December 2025
