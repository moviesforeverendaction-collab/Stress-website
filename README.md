# DeviceStress - Professional System Stress Testing Platform

A comprehensive, enterprise-grade system stress testing platform with real-time monitoring, beautiful dashboard, and complete Docker deployment support.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Docker Deployment](#docker-deployment)
- [API Documentation](#api-documentation)
- [System Requirements](#system-requirements)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### 🎯 Core Capabilities
- **Real-time System Monitoring** - Live CPU, Memory, Temperature, and GPU metrics
- **Multiple Stress Tests** - CPU Burn, Memory Stress, I/O Operations
- **Beautiful Dashboard** - Modern cyberpunk UI with glassmorphism design
- **WebSocket Communication** - Instant metric updates
- **Multi-platform Support** - Works on Linux, macOS, Windows, and Docker
- **Responsive Design** - Desktop and mobile optimized
- **Data Export** - JSON export of test results
- **Performance Analytics** - Historical data and peak metrics tracking

### 🔧 Technical Features
- **Separated Architecture** - HTML, CSS, JavaScript, Python backend
- **Docker Ready** - Dockerfile and Docker Compose included
- **Real System Integration** - Uses psutil for actual system metrics
- **WebSocket for Real-time Data** - Socket.IO for instant updates
- **Modular Design** - Easy to extend and customize
- **Security Hardened** - CORS enabled, environment-based config
- **Logging** - Comprehensive logging for debugging

---

## 📁 Project Structure

```
device-stress-tester/
├── app.py                      # Flask backend application
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container image definition
├── docker-compose.yml          # Multi-container orchestration
├── .env                        # Environment configuration
├── .env.example               # Example environment file
│
├── templates/
│   └── index.html             # Main HTML template
│
├── static/
│   ├── css/
│   │   └── styles.css         # Professional CSS styling
│   └── js/
│       └── script.js          # Frontend JavaScript
│
├── nginx.conf                 # Nginx reverse proxy config
├── README.md                  # This file
└── LICENSE
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone or download the project
cd device-stress-tester

# Build and run with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:5000
# or
open http://localhost (if using nginx)
```

### Option 2: Local Python Installation

```bash
# Install Python 3.11+
python3 --version

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_ENV=production
export SECRET_KEY=your-secret-key

# Run the application
python app.py
```

### Option 3: Using Docker Build

```bash
# Build Docker image
docker build -t devicestress:latest .

# Run container
docker run -p 5000:5000 \
  -e FLASK_ENV=production \
  -e SECRET_KEY=your-secret-key \
  devicestress:latest
```

---

## 📥 Installation

### Prerequisites

- **Python 3.11+** (for local installation)
- **Docker & Docker Compose** (for containerized deployment)
- **4GB RAM minimum** (for stress testing)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### Step 1: Clone or Download

```bash
git clone https://github.com/your-repo/device-stress-tester.git
cd device-stress-tester
```

### Step 2: Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

### Step 3: Install Dependencies (Local)

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### Step 4: Run Application

**Local:**
```bash
python app.py
```

**Docker:**
```bash
docker-compose up -d
```

### Step 5: Access Application

- **Default URL**: http://localhost:5000
- **With Nginx**: http://localhost
- **Remote Server**: http://your-server-ip:5000

---

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Flask Settings
FLASK_ENV=production              # development or production
FLASK_DEBUG=false                 # Enable debug mode
SECRET_KEY=secure-key             # Change this!

# Server
PORT=5000                         # Application port
HOST=0.0.0.0                     # Bind address

# Nginx (Optional)
NGINX_PORT=80                    # HTTP port
NGINX_SSL_PORT=443               # HTTPS port
NGINX_HOST=localhost             # Server name

# Application Settings
LOG_LEVEL=INFO                   # Logging level
MAX_WORKERS=4                    # Concurrent workers
METRICS_UPDATE_INTERVAL=500      # Update frequency (ms)
MAX_DATA_POINTS=120              # History points
```

### Flask Configuration

Modify `app.py` for advanced configuration:

```python
# Max stress test duration
MAX_DURATION = 300  # seconds

# Memory limits
MAX_MEMORY_ALLOCATION = 8 * 1024 * 1024 * 1024  # 8GB

# CPU cores to use
MAX_CORES = psutil.cpu_count()
```

---

## 🐳 Docker Deployment

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f devicestress

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v
```

### Docker Build

```bash
# Build image with custom tag
docker build -t devicestress:1.0 .

# Build with buildkit for better performance
DOCKER_BUILDKIT=1 docker build -t devicestress:1.0 .

# Run with volume persistence
docker run -d \
  --name devicestress \
  -p 5000:5000 \
  -v $(pwd)/templates:/app/templates \
  -v $(pwd)/static:/app/static \
  -e FLASK_ENV=production \
  devicestress:1.0
```

### Production Deployment

#### Using Nginx as Reverse Proxy

```bash
# Start with Docker Compose
docker-compose up -d

# Nginx automatically available on port 80
# Configure DNS to point to your server

# For HTTPS, use Let's Encrypt
docker exec devicestress-nginx \
  certbot certonly \
  --webroot \
  -w /usr/share/nginx/html \
  -d yourdomain.com
```

#### Using Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devicestress
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
        ports:
        - containerPort: 5000
        env:
        - name: FLASK_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## 📡 API Documentation

### REST Endpoints

#### Get System Information
```bash
GET /api/system-info

Response:
{
  "cpu_count": {
    "physical": 4,
    "logical": 8
  },
  "memory": {
    "used": 4294967296,
    "total": 17179869184,
    "percent": 25.0,
    "available": 12884901888
  },
  "disk": {
    "used": 107374182400,
    "total": 536870912000,
    "percent": 20.0,
    "free": 429496729600
  },
  "platform": "linux"
}
```

#### Get Current Metrics
```bash
GET /api/metrics

Response:
{
  "cpu": 45.2,
  "memory": {
    "used_mb": 4096.5,
    "total_mb": 16384.0,
    "percent": 25.0
  },
  "temperature": 52.5,
  "operations": 1000000,
  "process": {
    "cpu_percent": 15.5,
    "memory_mb": 128.5,
    "num_threads": 8
  },
  "timestamp": "2024-01-15T10:30:45.123456"
}
```

#### Start Stress Test
```bash
POST /api/stress/start

Request Body:
{
  "duration": 60,
  "intensity": 3,
  "tests": ["cpu", "memory", "io"]
}

Response:
{
  "status": "started"
}
```

#### Stop Stress Test
```bash
POST /api/stress/stop

Response:
{
  "status": "stopped"
}
```

#### Get Test Results
```bash
GET /api/stress/results

Response:
{
  "elapsed": 60,
  "peak_metrics": {
    "peak_cpu": 95.5,
    "peak_memory": 78.2,
    "peak_temp": 75.3
  },
  "current_metrics": { ... },
  "tests_run": ["cpu", "memory", "io"],
  "duration": 60,
  "intensity": 3
}
```

### WebSocket Events

```javascript
// Client-side (JavaScript)
socket.emit('start_test', {
  duration: 60,
  intensity: 3,
  tests: ['cpu', 'memory']
});

socket.on('test_started', (data) => {
  console.log('Test started at:', data.timestamp);
});

socket.on('metrics_update', (data) => {
  console.log('CPU:', data.cpu, '%');
});

socket.on('test_completed', (data) => {
  console.log('Peak metrics:', data.peak_metrics);
});
```

---

## 💻 System Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **CPU** | 2 cores | 4+ cores | More cores = better testing |
| **RAM** | 2 GB | 8+ GB | Needed for memory stress tests |
| **Disk** | 500 MB | 1 GB | For application & temp files |
| **Network** | 10 Mbps | 100 Mbps | For WebSocket communication |
| **OS** | Linux/macOS/Windows | Linux | Docker deployment |
| **Python** | 3.11+ | 3.11+ | If running locally |
| **Docker** | 20.10+ | Latest | For containerized deployment |

### Browser Support

- **Chrome/Chromium** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

---

## 🔧 Troubleshooting

### Connection Issues

**Problem**: "Cannot connect to server"

**Solution**:
```bash
# Check if container is running
docker ps

# Check logs
docker-compose logs devicestress

# Verify port is open
netstat -tlnp | grep 5000

# Test connectivity
curl http://localhost:5000
```

### High Memory Usage

**Problem**: Application consuming too much memory

**Solution**:
```bash
# Reduce test duration
set duration to 30 seconds

# Lower intensity level
set intensity to 1 or 2

# Check system memory
free -h
docker stats
```

### WebSocket Disconnection

**Problem**: Real-time metrics not updating

**Solution**:
```bash
# Check firewall
sudo ufw status

# Ensure WebSocket port is open
netstat -tlnp | grep 5000

# Restart container
docker-compose restart devicestress
```

### Docker Build Failures

**Problem**: "Docker build failed"

**Solution**:
```bash
# Clear Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache

# Check disk space
df -h
```

### Performance Issues

**Problem**: Dashboard is slow

**Solution**:
```bash
# Reduce update frequency (in browser console)
localStorage.setItem('updateInterval', '2000');

# Limit metrics history
MAX_DATA_POINTS = 60  # in app.py

# Run on better hardware
# OR
# Disable unnecessary features
```

---

## 📊 Advanced Usage

### Custom Stress Tests

Edit `app.py` to add custom stress operations:

```python
@staticmethod
def custom_stress(duration, intensity):
    """Custom stress test implementation"""
    operations = 0
    start_time = time.time()
    
    while time.time() - start_time < duration:
        # Your stress test code here
        operations += 1
    
    return operations
```

### Monitor Multiple Servers

Use Docker Compose with multiple instances:

```yaml
services:
  devicestress-1:
    image: devicestress:latest
    ports:
      - "5001:5000"
  
  devicestress-2:
    image: devicestress:latest
    ports:
      - "5002:5000"
```

### Export Custom Reports

Modify `script.js` to customize export format:

```javascript
function exportResults() {
    const customFormat = {
        date: new Date().toISOString(),
        environment: {
            os: navigator.platform,
            browser: navigator.userAgent
        },
        results: state.testResults
    };
    // ... export code
}
```

---

## 📝 License

This project is provided as-is for educational and testing purposes.

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review Docker logs
3. Check application console (Developer Tools)

---

## 🔐 Security Notes

1. **Change SECRET_KEY** in production
2. **Enable HTTPS** for remote deployments
3. **Use firewall rules** to restrict access
4. **Keep dependencies updated** (`pip install --upgrade -r requirements.txt`)
5. **Run as non-root** in Docker (default in Dockerfile)
6. **Monitor resource usage** to prevent DoS

---

## 📈 Performance Tips

1. **Close unnecessary applications** before stress testing
2. **Run tests sequentially** for accurate results
3. **Monitor temperatures** during testing
4. **Use SSD storage** for I/O tests
5. **Allocate sufficient memory** for memory tests
6. **Update BIOS/firmware** for best hardware access

---

**Version**: 1.0
**Last Updated**: January 2024
**Maintainer**: DeviceStress Team
