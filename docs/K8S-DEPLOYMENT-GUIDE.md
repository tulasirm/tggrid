# TGGrid Kubernetes Deployment Guide

Complete guide for deploying TGGrid to Kubernetes clusters on DigitalOcean (DOKS), Google Cloud (GKE), and AWS (EKS).

## Prerequisites

### Required Tools
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Kustomize
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
sudo mv kustomize /usr/local/bin/

# Install platform CLI
# DigitalOcean:
brew install doctl

# Google Cloud:
curl https://sdk.cloud.google.com | bash

# AWS:
brew install awscli
```

### Docker Images
You need to build and push Docker images to a registry:

```bash
# Build Docker images
docker build -t tggrid/main-app:latest .
docker build -t tggrid/browser-pool:latest ./mini-services/browser-pool
docker build -t tggrid/websocket-service:latest ./mini-services/browser-websocket

# Tag for your registry (example: Docker Hub)
docker tag tggrid/main-app:latest yourusername/tggrid/main-app:latest
docker tag tggrid/browser-pool:latest yourusername/tggrid/browser-pool:latest
docker tag tggrid/websocket-service:latest yourusername/tggrid/websocket-service:latest

# Push to registry
docker push yourusername/tggrid/main-app:latest
docker push yourusername/tggrid/browser-pool:latest
docker push yourusername/tggrid/websocket-service:latest
```

---

## DigitalOcean Kubernetes (DOKS)

### 1. Create DOKS Cluster

```bash
# Authenticate with DigitalOcean
doctl auth init

# Create a new cluster
doctl kubernetes cluster create tggrid-cluster \
  --region nyc3 \
  --count 3 \
  --size s-2vcpu-4gb \
  --wait

# Get cluster config
doctl kubernetes cluster kubeconfig save tggrid-cluster

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

### 2. Configure Container Registry

```bash
# Create DigitalOcean Container Registry
doctl registry create tggrid-registry --region nyc3

# Login to registry
doctl registry login

# Tag and push images
docker tag tggrid/main-app:latest registry.digitalocean.com/tggrid-registry/tggrid/main-app:latest
docker tag tggrid/browser-pool:latest registry.digitalocean.com/tggrid-registry/tggrid/browser-pool:latest
docker tag tggrid/websocket-service:latest registry.digitalocean.com/tggrid-registry/tggrid/websocket-service:latest

docker push registry.digitalocean.com/tggrid-registry/tggrid/main-app:latest
docker push registry.digitalocean.com/tggrid-registry/tggrid/browser-pool:latest
docker push registry.digitalocean.com/tggrid-registry/tggrid/websocket-service:latest
```

### 3. Deploy with Kustomize

```bash
# Update kustomization.yaml with your registry
sed -i 's/registry.digitalocean.com\/tggrid/registry.digitalocean.com\/YOUR_REGISTRY/g' \
  k8s/overlays/digitalocean/kustomization.yaml

# Create secrets
kubectl create secret docker-registry docker-secret \
  --docker-server=registry.digitalocean.com \
  --docker-username=YOUR_EMAIL \
  --docker-password=YOUR_TOKEN \
  -n tggrid

# Deploy
kustomize build k8s/overlays/digitalocean | kubectl apply -f -

# Verify deployment
kubectl get all -n tggrid
kubectl logs -n tggrid deployment/tggrid-app
```

### 4. Configure DNS & SSL

```bash
# Get LoadBalancer IP
kubectl get svc -n tggrid tggrid-app

# Point your domain to the LoadBalancer IP in DigitalOcean DNS

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 5. Install Ingress Controller

```bash
# Add Nginx Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install Nginx Ingress
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer

# Verify
kubectl get svc -n ingress-nginx
```

### 6. Deploy Ingress

```bash
kubectl apply -f k8s/overlays/digitalocean/ingress-patch.yaml
```

### 7. Monitor Deployment

```bash
# Watch pods
kubectl get pods -n tggrid -w

# Check ingress
kubectl get ingress -n tggrid

# View logs
kubectl logs -n tggrid -f deployment/tggrid-app
kubectl logs -n tggrid -f deployment/browser-pool
```

---

## Google Kubernetes Engine (GKE)

### 1. Create GKE Cluster

```bash
# Initialize gcloud
gcloud init

# Create cluster
gcloud container clusters create tggrid-cluster \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing \
  --workload-pool=YOUR_PROJECT_ID.svc.id.goog

# Get credentials
gcloud container clusters get-credentials tggrid-cluster --region us-central1

# Verify
kubectl cluster-info
kubectl get nodes
```

### 2. Configure Container Registry

```bash
# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Configure Docker auth
gcloud auth configure-docker

# Tag and push images
docker tag tggrid/main-app:latest gcr.io/YOUR_PROJECT_ID/tggrid/main-app:latest
docker tag tggrid/browser-pool:latest gcr.io/YOUR_PROJECT_ID/tggrid/browser-pool:latest
docker tag tggrid/websocket-service:latest gcr.io/YOUR_PROJECT_ID/tggrid/websocket-service:latest

docker push gcr.io/YOUR_PROJECT_ID/tggrid/main-app:latest
docker push gcr.io/YOUR_PROJECT_ID/tggrid/browser-pool:latest
docker push gcr.io/YOUR_PROJECT_ID/tggrid/websocket-service:latest
```

### 3. Create Node Pool for Browser Pool

```bash
# Create dedicated node pool for browser pool
gcloud container node-pools create browser-pool \
  --cluster=tggrid-cluster \
  --region=us-central1 \
  --machine-type=n1-standard-4 \
  --num-nodes=3 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade
```

### 4. Deploy with Kustomize

```bash
# Update GKE config
sed -i 's/YOUR_PROJECT_ID/YOUR_ACTUAL_PROJECT_ID/g' k8s/overlays/gke/kustomization.yaml

# Deploy
kustomize build k8s/overlays/gke | kubectl apply -f -

# Verify
kubectl get all -n tggrid
```

### 5. Configure DNS & SSL

```bash
# Reserve static IP
gcloud compute addresses create tggrid-ip --global

# Get IP address
gcloud compute addresses describe tggrid-ip --global

# Point domain to the IP address

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: gce
EOF
```

### 6. Deploy Ingress

```bash
kubectl apply -f k8s/overlays/gke/ingress-patch.yaml
```

### 7. Enable Monitoring

```bash
# Enable GKE Monitoring
gcloud container clusters update tggrid-cluster \
  --enable-cloud-logging \
  --enable-cloud-monitoring \
  --region us-central1

# View metrics in GCP Console
# https://console.cloud.google.com/monitoring
```

---

## AWS Kubernetes (EKS)

### 1. Create EKS Cluster

```bash
# Configure AWS CLI
aws configure

# Create EKS cluster using eksctl
eksctl create cluster \
  --name tggrid-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed \
  --with-oidc \
  --ssh-access \
  --ssh-public-key ~/.ssh/id_rsa.pub

# Get kubeconfig
aws eks update-kubeconfig --region us-east-1 --name tggrid-cluster

# Verify
kubectl cluster-info
kubectl get nodes
```

### 2. Configure Container Registry (ECR)

```bash
# Create ECR repository
aws ecr create-repository --repository-name tggrid/main-app --region us-east-1
aws ecr create-repository --repository-name tggrid/browser-pool --region us-east-1
aws ecr create-repository --repository-name tggrid/websocket-service --region us-east-1

# Get login token and login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag and push images
docker tag tggrid/main-app:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tggrid/main-app:latest
docker tag tggrid/browser-pool:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tggrid/browser-pool:latest
docker tag tggrid/websocket-service:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tggrid/websocket-service:latest

docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tggrid/main-app:latest
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tggrid/browser-pool:latest
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tggrid/websocket-service:latest
```

### 3. Install AWS Load Balancer Controller

```bash
# Create IAM policy
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.0/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=tggrid-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::YOUR_AWS_ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# Add Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install ALB controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=tggrid-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### 4. Deploy with Kustomize

```bash
# Update AWS config
sed -i 's/YOUR_AWS_ACCOUNT_ID/YOUR_ACTUAL_ID/g' k8s/overlays/aws/kustomization.yaml

# Deploy
kustomize build k8s/overlays/aws | kubectl apply -f -

# Verify
kubectl get all -n tggrid
```

### 5. Configure DNS & SSL

```bash
# Create ACM certificate
aws acm request-certificate \
  --domain-name tggrid.example.com \
  --validation-method DNS \
  --region us-east-1

# Get certificate ARN
aws acm list-certificates --region us-east-1

# Update Ingress with certificate ARN
kubectl patch ingress tggrid-ingress -n tggrid --type='json' \
  -p='[{"op": "replace", "path": "/metadata/annotations/alb.ingress.kubernetes.io~1certificate-arn", "value":"arn:aws:acm:us-east-1:ACCOUNT:certificate/ID"}]'

# Point domain to ALB DNS name
kubectl get ingress -n tggrid
```

### 6. Enable Monitoring (CloudWatch)

```bash
# Install CloudWatch Container Insights
curl https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluentd-quickstart.yaml | \
  sed "s/{{cluster_name}}/tggrid-cluster/;s/{{region_name}}/us-east-1/" | \
  kubectl apply -f -

# View metrics in CloudWatch Console
# https://console.aws.amazon.com/cloudwatch/
```

---

## Helm Deployment (All Platforms)

### 1. Using Helm Chart

```bash
# Add Helm repo
helm repo add tggrid https://charts.example.com
helm repo update

# Install release
helm install tggrid tggrid/tggrid \
  --namespace tggrid \
  --create-namespace \
  --values helm/values-prod.yaml

# Verify
helm list -n tggrid
helm get values tggrid -n tggrid
```

### 2. Upgrade Release

```bash
helm upgrade tggrid tggrid/tggrid \
  --namespace tggrid \
  --values helm/values-prod.yaml
```

### 3. Rollback if Needed

```bash
helm rollback tggrid -n tggrid
```

---

## Post-Deployment Verification

### 1. Check All Services

```bash
# Check pods
kubectl get pods -n tggrid

# Check services
kubectl get svc -n tggrid

# Check ingress
kubectl get ingress -n tggrid

# Check PVCs
kubectl get pvc -n tggrid
```

### 2. Test Application

```bash
# Port-forward to app
kubectl port-forward -n tggrid svc/tggrid-app 3000:3000

# Test health endpoint
curl http://localhost:3000/api/health

# Test browser pool
curl http://localhost:3002/metrics
```

### 3. Check Logs

```bash
# Main app logs
kubectl logs -n tggrid -f deployment/tggrid-app

# Browser pool logs
kubectl logs -n tggrid -f deployment/browser-pool

# WebSocket logs
kubectl logs -n tggrid -f deployment/websocket-service
```

### 4. Monitor Resources

```bash
# Watch resource usage
kubectl top nodes
kubectl top pods -n tggrid

# Monitor HPA
kubectl get hpa -n tggrid -w
```

---

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod -n tggrid <pod-name>

# Check events
kubectl get events -n tggrid --sort-by='.lastTimestamp'

# Check logs
kubectl logs -n tggrid <pod-name>
```

### PVC Issues

```bash
# Check PVC status
kubectl get pvc -n tggrid

# Check PV
kubectl get pv

# Describe PVC
kubectl describe pvc -n tggrid postgres-data
```

### Network Issues

```bash
# Check DNS
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup postgres.tggrid.svc.cluster.local

# Check connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://tggrid-app:3000/api/health
```

### Image Pull Errors

```bash
# Check secret
kubectl get secret -n tggrid

# Recreate secret
kubectl delete secret docker-secret -n tggrid
kubectl create secret docker-registry docker-secret \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n tggrid
```

---

## Performance Tuning

### Adjust Resource Limits

```yaml
# Edit deployment
kubectl edit deployment -n tggrid tggrid-app

# Modify resources section:
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Adjust HPA Settings

```bash
# Edit HPA
kubectl edit hpa -n tggrid tggrid-app-hpa

# Modify metrics and thresholds
```

### Scale Replicas

```bash
# Manual scaling
kubectl scale deployment -n tggrid tggrid-app --replicas=5
```

---

## Cost Optimization

### DigitalOcean
- Use smaller node types for non-browser-pool workloads
- Enable cluster autoscaling
- Remove unused resources regularly

### GKE
- Use Autopilot (fully managed)
- Enable cost optimization features
- Use preemptible nodes for non-critical workloads

### AWS
- Use spot instances for non-critical workloads
- Enable EC2 instance auto-scaling
- Use Reserved Instances for production

---

## Next Steps

1. Customize `values.yaml` for your environment
2. Set up monitoring and alerting
3. Configure backup strategy
4. Implement CI/CD pipeline for deployments
5. Set up log aggregation (ELK, CloudWatch, etc.)

---

**Status**: Ready for Production Deployment ✅
**Version**: 1.0
**Last Updated**: December 2025
