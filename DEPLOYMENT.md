# DeviceStress - Deployment Guide

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Set `FLASK_ENV=production`
- [ ] Set `FLASK_DEBUG=false`
- [ ] Update all dependencies
- [ ] Configure domain name
- [ ] Prepare SSL certificates (if HTTPS)
- [ ] Test locally first
- [ ] Review logs configuration
- [ ] Set up monitoring
- [ ] Backup important data

---

## 🐳 Docker Deployment

### 1. Prepare Server

```bash
# Update system
sudo apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Deploy Application

```bash
# Clone repository
git clone <repository-url>
cd device-stress-tester

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Generate secure secret key
python3 -c "import secrets; print(secrets.token_hex(32))"
# Copy output to SECRET_KEY in .env

# Start application
docker-compose up -d

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f
```

### 3. Configure Reverse Proxy (Nginx)

```bash
# Create nginx configuration
cat > /etc/nginx/sites-available/devicestress <<EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable configuration
sudo ln -s /etc/nginx/sites-available/devicestress /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Setup HTTPS (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d yourdomain.com

# Update nginx configuration
sudo certbot renew --dry-run

# Auto-renewal verification
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 5. Monitoring and Logging

```bash
# View logs
docker-compose logs -f devicestress

# Monitor resources
docker stats devicestress-app

# Set up log rotation
cat > /etc/logrotate.d/devicestress <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    delaycompress
    copytruncate
}
EOF

# Test log rotation
sudo logrotate -f /etc/logrotate.d/devicestress
```

---

## ☸️ Kubernetes Deployment

### 1. Create Deployment

```yaml
# devicestress-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devicestress
  labels:
    app: devicestress
spec:
  replicas: 2
  selector:
    matchLabels:
      app: devicestress
  template:
    metadata:
      labels:
        app: devicestress
    spec:
      containers:
      - name: devicestress
        image: devicestress:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 5000
        env:
        - name: FLASK_ENV
          value: "production"
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: devicestress-secrets
              key: secret-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. Create Service

```yaml
# devicestress-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: devicestress
  labels:
    app: devicestress
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 5000
    protocol: TCP
  selector:
    app: devicestress
```

### 3. Deploy to Kubernetes

```bash
# Create secret
kubectl create secret generic devicestress-secrets \
  --from-literal=secret-key=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Deploy
kubectl apply -f devicestress-deployment.yaml
kubectl apply -f devicestress-service.yaml

# Check status
kubectl get deployments
kubectl get pods
kubectl get svc

# View logs
kubectl logs -f deployment/devicestress

# Port forward (for testing)
kubectl port-forward svc/devicestress 5000:80
```

---

## 📊 AWS Deployment

### 1. Create ECR Repository

```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Create repository
aws ecr create-repository --repository-name devicestress --region us-east-1

# Build and push image
docker build -t devicestress:latest .
docker tag devicestress:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/devicestress:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/devicestress:latest
```

### 2. Deploy with ECS

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name devicestress-cluster

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster devicestress-cluster \
  --service-name devicestress-service \
  --task-definition devicestress \
  --desired-count 2 \
  --load-balancers targetGroupArn=<arn>,containerName=devicestress,containerPort=5000
```

### 3. Configure RDS (Optional)

```bash
# Create RDS instance for future data storage
aws rds create-db-instance \
  --db-instance-identifier devicestress-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password <password>
```

---

## 🔒 Security Hardening

### 1. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw default deny incoming
sudo ufw enable

# Verify rules
sudo ufw status
```

### 2. SSL/TLS Configuration

```bash
# Generate strong SSL configuration
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048

# Update nginx with security headers
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

### 3. Application Hardening

```bash
# Set proper file permissions
chmod 600 .env
chmod 644 *.py
chmod -R 755 templates/ static/

# Create dedicated user
sudo useradd -r -s /bin/bash devicestress

# Disable root access
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## 📈 Performance Tuning

### 1. Docker Configuration

```yaml
# docker-compose.yml - Performance tuning
services:
  devicestress:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 2. Nginx Optimization

```nginx
# nginx.conf
worker_processes auto;
worker_connections 2048;

# Buffering
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;

# Caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=devicestress:10m;
proxy_cache devicestress;
proxy_cache_valid 200 10m;
```

### 3. Flask Optimization

```python
# app.py
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

# Use production WSGI server
# Already using gunicorn in Dockerfile
```

---

## 📊 Monitoring & Alerting

### 1. Setup Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'devicestress'
    static_configs:
      - targets: ['localhost:5000']
```

### 2. Docker Compose with Monitoring

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### 3. Alert Rules

```yaml
# alerts.yml
groups:
  - name: devicestress
    rules:
      - alert: HighCPU
        expr: node_cpu_usage > 0.8
        for: 5m
        annotations:
          summary: "High CPU usage detected"
```

---

## 🔄 Backup & Recovery

### 1. Automated Backups

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/devicestress"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm \
  -v devicestress-data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/devicestress-$DATE.tar.gz /data

# Backup configuration
tar czf $BACKUP_DIR/config-$DATE.tar.gz .env docker-compose.yml

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/devicestress-$DATE.tar.gz"
```

### 2. Restore from Backup

```bash
# Stop application
docker-compose down

# Restore Docker volume
docker run --rm \
  -v devicestress-data:/data \
  -v /backups/devicestress:/backup \
  alpine tar xzf /backup/devicestress-latest.tar.gz -C /

# Start application
docker-compose up -d
```

---

## 🚨 Troubleshooting Deployment

### Connection Issues

```bash
# Check if container is running
docker ps

# View detailed logs
docker logs -f devicestress-app

# Test connectivity
curl http://localhost:5000

# Check network
docker network ls
docker network inspect bridge
```

### Permission Issues

```bash
# Fix file permissions
sudo chown -R appuser:appuser /app

# Fix volume permissions
docker run --rm -v devicestress-data:/data alpine chown -R 1000:1000 /data
```

### Resource Issues

```bash
# Monitor resource usage
docker stats

# Check system resources
free -h
df -h

# Increase Docker memory limit
# Edit /etc/docker/daemon.json
{
    "memory": 2147483648
}
```

---

**Deployment Version**: 1.0
**Last Updated**: January 2024
