# Deployment Guide

Comprehensive deployment guide for the Mesh Media Sharing Framework covering installation, configuration, optimization, and operational considerations for production environments. This guide provides step-by-step instructions for deploying the framework across various platforms including cloud servers, on-premises infrastructure, mobile devices, and edge computing environments.

## Deployment Overview

Deploying the Mesh Media Sharing Framework requires careful consideration of:
- **Infrastructure requirements**: Hardware, network, and storage specifications
- **Dependency management**: Installation and configuration of required libraries and services
- **Security hardening**: Firewall rules, encryption, and access controls
- **Performance optimization**: Tuning for specific workloads and scale
- **Monitoring & logging**: Observability and troubleshooting capabilities
- **High availability**: Redundancy and failover strategies

This guide walks through each aspect in detail, providing production-ready configurations and best practices learned from real-world deployments.

## Production Deployment

### System Requirements

The framework's resource requirements vary significantly based on deployment scenario, workload characteristics, and security requirements. Below are detailed specifications for different deployment profiles.

#### Minimum Requirements (Development/Testing)
- **CPU**: 2 cores (4 recommended for fingerprint extraction)
- **RAM**: 2GB (4GB recommended)
- **Storage**: 10GB for database and cache
- **Network**: Stable internet connection
- **OS**: Linux (Ubuntu 22.04+), macOS 12+, Windows 10+, Android 10+, iOS 14+

#### Recommended Requirements
- **CPU**: 4+ cores with AVX2 support
- **RAM**: 8GB+
- **Storage**: SSD with 50GB+
- **Network**: 10 Mbps+ with low latency

### Dependencies

#### Node.js Backend

```bash
# Core dependencies
npm install @noble/post-quantum      # Post-quantum crypto
npm install libsodium-wrappers       # XChaCha20-Poly1305
npm install ipfs-http-client         # IPFS client
npm install arweave                  # Arweave client
npm install ethers                   # Blockchain interaction
npm install better-sqlite3           # SQLite database
npm install tor-request              # Tor SOCKS5 proxy
npm install node-webrtc              # WebRTC for Node.js

# Optional dependencies
npm install fft.js                   # Fast FFT implementation
npm install ml-matrix                # Matrix operations
npm install @types/better-sqlite3    # TypeScript types
```

#### Native Dependencies (Optional)

For better performance, compile native libraries:

```bash
# Install build tools
# Ubuntu/Debian
sudo apt-get install build-essential python3 libsodium-dev

# macOS
brew install libsodium cmake

# Install native crypto libraries
git clone https://github.com/open-quantum-safe/liboqs
cd liboqs
mkdir build && cd build
cmake -DCMAKE_INSTALL_PREFIX=/usr/local ..
make && sudo make install
```

### Configuration

#### Environment Variables

Create `.env` file:

```bash
# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CHAIN_ID=137
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
CONTRACT_ADDRESS=0x...

# Storage
IPFS_ENDPOINT=https://ipfs.infura.io:5001
IPFS_API_KEY=your_api_key
ARWEAVE_WALLET_PATH=./arweave-wallet.json
PINATA_API_KEY=your_pinata_key

# Privacy Network
TOR_SOCKS_PROXY=socks5://127.0.0.1:9050
TOR_CONTROL_PORT=9051
TOR_CONTROL_PASSWORD=your_password

# Database
DATABASE_PATH=./data/media_sharing.db
DATABASE_MAX_CONNECTIONS=10

# Mesh Network
WEBRTC_SIGNALING_SERVER=wss://signaling.example.com
MESH_SERVICE_NAME=mesh-media-sync

# Security
MASTER_KEY_ENCRYPTION=enabled
KEY_ROTATION_INTERVAL=86400
LOG_LEVEL=info
```

#### Framework Configuration

```typescript
// config/production.ts
import type { FrameworkConfig } from '../backend/types';

export const productionConfig: FrameworkConfig = {
  storage: {
    provider: 'ipfs',
    endpoint: process.env.IPFS_ENDPOINT!,
    authToken: process.env.IPFS_API_KEY,
    redundantStorage: true, // Upload to multiple providers
  },
  
  blockchain: {
    network: 'polygon',
    rpcUrl: process.env.POLYGON_RPC_URL!,
    chainId: parseInt(process.env.POLYGON_CHAIN_ID!),
    gasPriceStrategy: 'standard',
    contractAddress: process.env.CONTRACT_ADDRESS,
  },
  
  privacy: {
    networkType: 'tor',
    socksProxy: process.env.TOR_SOCKS_PROXY!,
    hopCount: 3,
    enablePadding: true,
    enableTimingObfuscation: true,
    submissionDelayRange: [2000, 8000],
  },
  
  fingerprint: {
    sampleRate: 44100,
    fftWindowSize: 4096,
    targetFrequency: 60, // or 50 for Europe/Asia
    minDuration: 5,
  },
  
  mesh: {
    serviceName: 'mesh-media-sync',
    peerName: 'Anonymous',
    enabledTransports: ['webrtc', 'bluetooth'],
    autoAcceptConnections: false,
    maxConnections: 10,
    enforceEncryption: true,
  },
};
```

### Database Setup

#### Initialize Database

```typescript
import { initializeDatabase } from './backend/database/schema';
import Database from 'better-sqlite3';

const db = new Database(process.env.DATABASE_PATH!);

// Create database interface
const dbInterface = {
  execute: async (sql: string, params?: any[]) => {
    db.prepare(sql).run(...(params || []));
  },
  query: async <T>(sql: string, params?: any[]): Promise<T[]> => {
    return db.prepare(sql).all(...(params || [])) as T[];
  },
  close: async () => {
    db.close();
  },
};

await initializeDatabase(dbInterface);
console.log('Database initialized');
```

#### Backup Strategy

```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DB_PATH="./data/media_sharing.db"

mkdir -p $BACKUP_DIR

# Create SQLite backup
sqlite3 $DB_PATH ".backup $BACKUP_DIR/media_sharing_$DATE.db"

# Compress backup
gzip $BACKUP_DIR/media_sharing_$DATE.db

# Encrypt backup (optional)
gpg --encrypt --recipient your-key-id $BACKUP_DIR/media_sharing_$DATE.db.gz

# Delete old backups (keep last 30 days)
find $BACKUP_DIR -name "*.db.gz.gpg" -mtime +30 -delete

echo "Backup completed: media_sharing_$DATE.db.gz.gpg"
```

### Tor Setup

Tor (The Onion Router) is critical for the framework's anonymity guarantees. Proper Tor configuration ensures that:
- Publisher IP addresses are never exposed to relayers or blockchain nodes
- Traffic analysis attacks are mitigated through onion routing
- Censorship resistance is maintained through bridge relays
- Geographic location cannot be determined from network metadata

**Important**: The security of the entire system relies heavily on correct Tor configuration. Take time to understand each setting and verify Tor is functioning properly before publishing any media.

#### Install Tor

```bash
# Ubuntu/Debian (recommended for production)
sudo apt-get update
sudo apt-get install tor tor-arm  # tor-arm provides monitoring interface

# Verify installation
tor --version
# Should output: Tor version 0.4.7.x (or later)

# macOS
brew install tor

# Windows (download from torproject.org)
# Or use Tor Browser Bundle which includes Tor daemon

# Configure Tor
sudo vim /etc/tor/torrc
# Or on macOS: /usr/local/etc/tor/torrc
# Or on Windows: C:\Users\<User>\AppData\Roaming\tor\torrc
```

#### torrc Configuration (Production-Ready)

This configuration balances security, performance, and reliability:

```
# ============================================
# SOCKS Proxy Configuration
# ============================================
# Listen on localhost only (security best practice)
SOCKSPort 9050

# Enable control port
ControlPort 9051
HashedControlPassword YOUR_HASHED_PASSWORD

# Performance
CircuitBuildTimeout 30
LearnCircuitBuildTimeout 0
MaxCircuitDirtiness 600

# Anonymity
UseEntryGuards 1
NumEntryGuards 3
IsolateDestAddr 1
```

#### Start Tor

```bash
# Ubuntu/Debian
sudo systemctl start tor
sudo systemctl enable tor

# macOS
brew services start tor

# Verify Tor is running
curl --socks5 127.0.0.1:9050 https://check.torproject.org/api/ip
```

### Web Server Setup (Optional)

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/mesh-media-sync

upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer" always;
    }
}
```

### Docker Deployment

#### Dockerfile

```dockerfile
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    tor \
    sqlite

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build TypeScript
RUN npm run build

# Expose ports
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD node healthcheck.js || exit 1

# Start Tor and application
CMD ["sh", "-c", "tor & npm start"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/media_sharing.db
      - TOR_SOCKS_PROXY=socks5://127.0.0.1:9050
    volumes:
      - ./data:/data
      - ./config:/app/config
    restart: unless-stopped
    networks:
      - mesh-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: media_sharing
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - mesh-network

volumes:
  postgres-data:

networks:
  mesh-network:
    driver: bridge
```

### Monitoring

#### Health Check Endpoint

```typescript
// healthcheck.ts
import http from 'http';

const options = {
  host: 'localhost',
  port: 3000,
  path: '/health',
  timeout: 2000,
};

const req = http.request(options, (res) => {
  console.log(`Health check: ${res.statusCode}`);
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', (err) => {
  console.error('Health check failed:', err);
  process.exit(1);
});

req.end();
```

#### Prometheus Metrics

```typescript
// metrics.ts
import promClient from 'prom-client';

const register = new promClient.Register();

// Metrics
const publishCounter = new promClient.Counter({
  name: 'media_publications_total',
  help: 'Total number of media publications',
  registers: [register],
});

const confidenceGauge = new promClient.Gauge({
  name: 'confidence_score',
  help: 'Current confidence score',
  registers: [register],
});

const peerCounter = new promClient.Gauge({
  name: 'mesh_peers_discovered',
  help: 'Number of discovered mesh peers',
  registers: [register],
});

export { register, publishCounter, confidenceGauge, peerCounter };
```

### Logging

#### Winston Configuration

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mesh-media-sync' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;
```

### Performance Tuning

#### Node.js Flags

```bash
# Increase heap size for large fingerprint processing
node --max-old-space-size=4096 dist/index.js

# Enable JIT optimizations
node --always-opt dist/index.js
```

#### Worker Threads for Fingerprint Extraction

```typescript
import { Worker } from 'worker_threads';

function extractFingerprintInWorker(audioData: Float32Array): Promise<Fingerprint> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./fingerprint-worker.js', {
      workerData: { audioData },
    });
    
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}
```

### Scaling Considerations

#### Horizontal Scaling

- Deploy multiple instances behind load balancer
- Use shared database (PostgreSQL)
- Coordinate mesh peers across instances (Redis pub/sub)
- Distribute relayer submissions

#### Database Sharding

```sql
-- Shard by media_item_id hash
CREATE TABLE media_items_shard_0 (LIKE media_items INCLUDING ALL);
CREATE TABLE media_items_shard_1 (LIKE media_items INCLUDING ALL);
CREATE TABLE media_items_shard_2 (LIKE media_items INCLUDING ALL);

-- Route queries based on hash(media_item_id) % 3
```

### Security Hardening

#### File Permissions

```bash
chmod 600 .env
chmod 600 arweave-wallet.json
chmod 700 data/
chmod 755 dist/
```

#### Firewall Rules

```bash
# Ubuntu/Debian (ufw)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 3000/tcp  # Application port
sudo ufw allow 9050/tcp  # Tor SOCKS5
sudo ufw enable
```

### Troubleshooting

#### Common Issues

**Issue**: Tor connection fails
```bash
# Check Tor status
systemctl status tor

# Test Tor connection
curl --socks5 127.0.0.1:9050 https://check.torproject.org/api/ip
```

**Issue**: IPFS upload timeout
```bash
# Increase timeout in config
storage.timeout = 120000; // 2 minutes

# Try alternative gateway
storage.endpoint = 'https://ipfs.io/api/v0';
```

**Issue**: High memory usage
```bash
# Reduce concurrent operations
mesh.maxConnections = 5;
storage.uploadConcurrency = 2;
```

## Mobile Deployment

### Android

#### Build Configuration

```gradle
// android/app/build.gradle
android {
    defaultConfig {
        minSdkVersion 26  // Required for Keystore
        targetSdkVersion 33
        
        ndk {
            abiFilters 'armeabi-v7a', 'arm64-v8a'
        }
    }
    
    packagingOptions {
        pickFirst 'lib/*/libc++_shared.so'
    }
}

dependencies {
    implementation 'net.java.dev.jna:jna:5.12.1'
    implementation 'com.google.crypto.tink:tink-android:1.9.0'
}
```

### iOS

#### Entitlements

```xml
<!-- ios/Runner/Runner.entitlements -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.example.meshMediaSync</string>
    </array>
</dict>
</plist>
```

## Production Checklist

- [ ] Install production dependencies
- [ ] Configure environment variables
- [ ] Set up Tor with proper configuration
- [ ] Initialize database with migrations
- [ ] Configure backup strategy
- [ ] Set up monitoring and logging
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set proper file permissions
- [ ] Test health check endpoint
- [ ] Load test with expected traffic
- [ ] Security audit of configuration
- [ ] Document runbook for operations team
