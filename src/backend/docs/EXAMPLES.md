# Usage Examples

This comprehensive guide provides practical, real-world examples for using the Mesh Media Sharing Framework across a wide range of scenarios, from basic media publishing to advanced forensic analysis and multi-region deployments. Each example includes complete, runnable code with detailed explanations of what's happening at each step.

## About These Examples

The examples in this document are organized by complexity and use case:
- **Basic examples** (1-6) demonstrate core functionality and fundamental operations
- **Intermediate examples** (7-14) show mesh networking, error handling, and custom configurations
- **Advanced examples** (15-20) cover complex scenarios like multi-region deployment and forensic analysis
- **Integration examples** (21-23) demonstrate platform-specific integrations and tooling

### Prerequisites

Before running these examples, ensure:
1. The framework is properly initialized (see README.md)
2. All dependencies are installed
3. Required services (Tor, IPFS, blockchain node) are running
4. Environment variables are configured

### Code Conventions

All examples use TypeScript and assume:
- `framework` is an initialized `MediaSharingFramework` instance
- Error handling is shown where critical
- Helper functions (e.g., `extractAudio`) represent platform-specific implementations
- Configuration objects may be simplified for clarity

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Publishing Media](#publishing-media)
3. [Verifying Media](#verifying-media)
4. [Mesh Network Management](#mesh-network-management)
5. [Custom Configurations](#custom-configurations)
6. [Error Handling](#error-handling)
7. [Advanced Scenarios](#advanced-scenarios)

## Basic Usage

### Initialize Framework

Framework initialization is the first step in using the system. This process:
1. Creates instances of all subsystem managers (crypto, storage, mesh, blockchain, etc.)
2. Establishes database connections
3. Loads configuration and validates settings
4. Initializes cryptographic contexts
5. Prepares mesh network discovery (but doesn't start it yet)

Initialization is synchronous and should be done once at application startup.

```typescript
import { MediaSharingFramework } from './backend/orchestrator';
import type { FrameworkConfig } from './backend/types';

// Basic configuration for standard use case
// This configuration balances security, privacy, and performance
const config: FrameworkConfig = {
  // Storage configuration: Where media and metadata are stored
  storage: {
    provider: 'ipfs',  // Use IPFS for decentralized storage
    endpoint: 'https://ipfs.infura.io:5001',  // Infura IPFS gateway
    // Alternative: Use local IPFS node for better privacy
    // endpoint: 'http://localhost:5001',
  },
  
  // Blockchain configuration: Where anchors are published
  blockchain: {
    network: 'polygon',  // Polygon (Matic) for low gas fees
    rpcUrl: 'https://polygon-rpc.com',  // Public RPC endpoint
    chainId: 137,  // Polygon mainnet
    // Alternative: Use Ethereum mainnet for maximum security
    // network: 'ethereum',
    // rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
    // chainId: 1,
  },
  
  // Privacy configuration: How anonymity is achieved
  privacy: {
    networkType: 'tor',  // Use Tor for anonymous routing
    socksProxy: 'socks5://127.0.0.1:9050',  // Local Tor daemon
    // Note: Tor must be installed and running before framework initialization
    // See DEPLOYMENT.md for Tor setup instructions
  },
  
  // Fingerprint configuration: Mains-hum extraction settings
  fingerprint: {
    sampleRate: 44100,  // Standard audio sample rate (Hz)
    fftWindowSize: 4096,  // FFT window size (higher = better frequency resolution)
    targetFrequency: 60,  // USA/Americas: 60 Hz, Europe/Asia: 50 Hz
    minDuration: 5,  // Minimum audio duration (seconds) for reliable fingerprints
  },
  
  // Mesh network configuration: Peer discovery and communication
  mesh: {
    serviceName: 'mesh-media-sync',  // mDNS service name for discovery
    enabledTransports: ['webrtc'],  // Use WebRTC for cross-platform compatibility
    // Alternative: Enable multiple transports for redundancy
    // enabledTransports: ['webrtc', 'bluetooth'],
  },
};

// Create framework instance
// This is a lightweight operation - actual initialization happens in initialize()
const framework = new MediaSharingFramework(config);

// Initialize all subsystems
// This is async and may take 2-5 seconds
try {
  await framework.initialize();
  console.log('✓ Framework initialized successfully');
  console.log('  - Database connected');
  console.log('  - Cryptographic contexts ready');
  console.log('  - Storage clients configured');
  console.log('  - Blockchain connection established');
  console.log('  - Mesh network prepared');
} catch (error) {
  console.error('✗ Framework initialization failed:', error);
  // Common issues:
  // - Database file not writable
  // - Tor not running (check: systemctl status tor)
  // - IPFS endpoint unreachable
  // - Invalid blockchain RPC URL
  throw error;
}
    endpoint: 'https://ipfs.infura.io:5001',
  },
  blockchain: {
    network: 'polygon',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
  },
  privacy: {
    networkType: 'tor',
    socksProxy: 'socks5://127.0.0.1:9050',
  },
  fingerprint: {
    sampleRate: 44100,
    fftWindowSize: 4096,
    targetFrequency: 60, // USA
  },
  mesh: {
    serviceName: 'mesh-media-sync',
    enabledTransports: ['webrtc'],
  },
};

const framework = new MediaSharingFramework(config);

// Initialize all components
await framework.initialize();
console.log('Framework initialized');
```

### Cleanup

```typescript
// Clean up resources when done
await framework.shutdown();
console.log('Framework shut down');
```

## Publishing Media

### Example 1: Publish Video with Maximum Privacy

This example demonstrates the complete workflow for publishing a video with maximum anonymity. The process involves extracting the audio track (needed for fingerprint generation), encrypting metadata, coordinating with mesh peers for verification, and submitting through an anonymous relayer to the blockchain.

**Use Case**: Citizen journalist records evidence of public interest event and needs to share it publicly while protecting their identity from both government surveillance and corporate tracking.

**Security Properties**:
- Video content is public but metadata (uploader identity, exact location, device info) is encrypted
- Ring signature ensures even blockchain analysis cannot identify the publisher
- Mains-hum fingerprint proves temporal and geographic proximity without revealing exact location
- Tor routing prevents network observers from linking publisher to submission

```typescript
import { MediaType } from './backend/types';
import fs from 'fs/promises';

async function publishVideoAnonymously() {
  // Step 1: Load video file from disk
  // Note: In mobile apps, this would come from camera roll or video recorder
  const videoData = await fs.readFile('./my-video.mp4');
  console.log(`Loaded video: ${videoData.length} bytes`);
  
  // Step 2: Extract audio track for fingerprint analysis
  // The audio is needed to extract mains-hum signatures (50/60 Hz electrical grid noise)
  // that prove the video was recorded at a specific time and general location
  // (In production, use ffmpeg or platform-specific APIs to extract audio)
  const audioTrack = extractAudioFromVideo(videoData);
  console.log(`Extracted audio: ${audioTrack.length} samples at 44100 Hz`);
  
  // Publish with maximum privacy
  const result = await framework.publishMedia({
    mediaData: videoData,
    audioData: audioTrack,
    mediaType: MediaType.VIDEO,
    title: 'My Anonymous Video',
    description: 'Recorded at public event',
    metadata: {
      duration: 120, // 2 minutes
      resolution: '1920x1080',
      codec: 'h264',
      fileSize: videoData.length,
    },
    tags: ['public-event', 'announcement'],
  });
  
  console.log('Published successfully!');
  console.log('Media CID:', result.mediaCid);
  console.log('Metadata CID:', result.metadataCid);
  console.log('Blockchain TX:', result.blockchainTx);
  console.log('Confidence Score:', result.confidenceScore);
  
  return result;
}

// Helper function (pseudo-code)
function extractAudioFromVideo(videoData: Uint8Array): Float32Array {
  // Use ffmpeg or similar to extract audio track
  // Then decode to PCM samples at target sample rate
  // Return as Float32Array
  return new Float32Array(/* audio samples */);
}
```

### Example 2: Publish Audio with Custom Metadata

```typescript
async function publishAudioWithMetadata() {
  const audioData = await fs.readFile('./interview.wav');
  const samples = decodeWavToFloat32(audioData);
  
  const result = await framework.publishMedia({
    mediaData: audioData,
    audioData: samples,
    mediaType: MediaType.AUDIO,
    title: 'Anonymous Interview',
    description: 'Whistleblower testimony',
    metadata: {
      duration: 600, // 10 minutes
      sampleRate: 44100,
      channels: 2,
      bitDepth: 16,
      location: 'Redacted', // Anonymized location
      recordedAt: Date.now(),
      keywords: ['testimony', 'whistleblower'],
    },
    tags: ['investigation', 'confidential'],
  });
  
  console.log('Audio published:', result.mediaCid);
  return result;
}

function decodeWavToFloat32(wavData: Uint8Array): Float32Array {
  // Parse WAV header and decode PCM samples
  // Return normalized Float32Array [-1.0, 1.0]
  return new Float32Array(/* samples */);
}
```

### Example 3: Batch Publishing

```typescript
async function publishMultipleMedia() {
  const files = await fs.readdir('./media-folder');
  
  for (const file of files) {
    if (file.endsWith('.mp4') || file.endsWith('.wav')) {
      console.log(`Publishing ${file}...`);
      
      const mediaData = await fs.readFile(`./media-folder/${file}`);
      const audioData = extractAudio(mediaData);
      
      try {
        const result = await framework.publishMedia({
          mediaData,
          audioData,
          mediaType: file.endsWith('.mp4') ? MediaType.VIDEO : MediaType.AUDIO,
          title: file,
          description: `Auto-published from batch`,
        });
        
        console.log(`✓ ${file} published: ${result.mediaCid}`);
      } catch (error) {
        console.error(`✗ Failed to publish ${file}:`, error);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
```

## Verifying Media

### Example 4: Verify Media Authenticity

```typescript
async function verifyMediaItem() {
  const mediaItemId = '01234567-89ab-cdef-0123-456789abcdef';
  
  const verification = await framework.verifyMedia(mediaItemId);
  
  if (verification.isValid) {
    console.log('✓ Media is authentic');
    console.log('Confidence Score:', verification.confidenceScore);
    console.log('Number of Peer Reports:', verification.peerReports.length);
    console.log('Blockchain Verified:', verification.blockchainVerified);
    
    // Show metadata (requires private key to decrypt)
    console.log('Title:', verification.metadata.title);
    console.log('Description:', verification.metadata.description);
  } else {
    console.log('✗ Media verification failed');
    console.log('Reason:', verification.reason);
  }
  
  return verification;
}
```

### Example 5: Continuous Verification Monitor

```typescript
async function monitorMediaVerification(mediaItemId: string) {
  console.log(`Monitoring verification for ${mediaItemId}...`);
  
  // Initial verification
  let verification = await framework.verifyMedia(mediaItemId);
  console.log('Initial confidence:', verification.confidenceScore);
  
  // Monitor for 5 minutes (collect more peer reports)
  const intervalId = setInterval(async () => {
    verification = await framework.verifyMedia(mediaItemId);
    
    console.log(`Update: ${verification.peerReports.length} reports, confidence: ${verification.confidenceScore}`);
    
    if (verification.confidenceScore >= 0.8) {
      console.log('✓ High confidence achieved');
      clearInterval(intervalId);
    }
  }, 30000); // Check every 30 seconds
  
  // Stop after 5 minutes
  setTimeout(() => clearInterval(intervalId), 300000);
}
```

### Example 6: Compare Fingerprints

```typescript
import { MainsHumExtractor } from './backend/fingerprint/mains-hum';

async function compareTwoRecordings() {
  const extractor = new MainsHumExtractor({
    sampleRate: 44100,
    fftWindowSize: 4096,
    targetFrequency: 60,
    minDuration: 5,
  });
  
  // Extract fingerprints
  const audio1 = await loadAudioSamples('./recording1.wav');
  const audio2 = await loadAudioSamples('./recording2.wav');
  
  const fingerprint1 = await extractor.extract(audio1);
  const fingerprint2 = await extractor.extract(audio2);
  
  // Compare
  const comparison = await extractor.compare(fingerprint1, fingerprint2);
  
  console.log('Similarity Score:', comparison.similarityScore);
  console.log('Confidence:', comparison.confidence);
  console.log('Same Location:', comparison.sameLocation);
  
  if (comparison.sameLocation) {
    console.log('Estimated Time Difference:', comparison.estimatedTimeDelta, 'seconds');
  }
  
  return comparison;
}
```

## Mesh Network Management

### Example 7: Start Peer Discovery

```typescript
async function startMeshDiscovery() {
  // Start discovering peers
  await framework.startMeshDiscovery();
  
  console.log('Mesh discovery started');
  
  // Listen for peer discovery events
  framework.on('peerDiscovered', (peer) => {
    console.log('New peer discovered:', peer.id);
    console.log('Transport:', peer.transport);
    console.log('Latency:', peer.latency, 'ms');
  });
  
  // Listen for peer reports
  framework.on('peerReportReceived', (report) => {
    console.log('Received peer report for:', report.mediaItemId);
    console.log('Fingerprint match:', report.fingerprintMatch);
  });
}
```

### Example 8: Manual Peer Connection

```typescript
async function connectToSpecificPeer() {
  const peerAddress = 'peer-id-or-address';
  
  // Connect using specific transport
  await framework.meshManager.connectToPeer({
    id: peerAddress,
    transport: 'webrtc',
    address: 'wss://signaling.example.com/peer-id',
  });
  
  console.log('Connected to peer:', peerAddress);
}
```

### Example 9: Request Fingerprint Verification

```typescript
async function requestPeerVerification(mediaItemId: string) {
  // Get discovered peers
  const peers = framework.getDiscoveredPeers();
  
  console.log(`Requesting verification from ${peers.length} peers`);
  
  for (const peer of peers) {
    try {
      const report = await framework.requestFingerprintComparison(
        peer.id,
        mediaItemId
      );
      
      console.log(`Peer ${peer.id}:`, report.fingerprintMatch ? '✓' : '✗');
    } catch (error) {
      console.error(`Failed to get report from ${peer.id}:`, error);
    }
  }
}
```

## Custom Configurations

### Example 10: High-Security Configuration

```typescript
const highSecurityConfig: FrameworkConfig = {
  storage: {
    provider: 'arweave', // Permanent storage
    redundantStorage: true,
  },
  blockchain: {
    network: 'ethereum', // L1 for maximum security
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
    chainId: 1,
    gasPriceStrategy: 'fast',
  },
  privacy: {
    networkType: 'tor',
    socksProxy: 'socks5://127.0.0.1:9050',
    hopCount: 5, // More hops = more anonymity
    enablePadding: true,
    enableTimingObfuscation: true,
    submissionDelayRange: [5000, 15000], // Longer delays
  },
  fingerprint: {
    sampleRate: 96000, // Higher quality
    fftWindowSize: 8192,
    targetFrequency: 60,
    minDuration: 10, // Longer minimum
  },
  mesh: {
    serviceName: 'mesh-media-sync-secure',
    autoAcceptConnections: false, // Manual approval
    maxConnections: 5,
    enforceEncryption: true,
  },
};
```

### Example 11: Low-Latency Configuration

```typescript
const lowLatencyConfig: FrameworkConfig = {
  storage: {
    provider: 'ipfs',
    endpoint: 'http://localhost:5001', // Local IPFS node
  },
  blockchain: {
    network: 'polygon',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
    gasPriceStrategy: 'fast',
  },
  privacy: {
    networkType: 'direct', // Skip Tor for speed
    submissionDelayRange: [0, 1000], // Minimal delay
  },
  fingerprint: {
    sampleRate: 44100,
    fftWindowSize: 2048, // Smaller window = faster
    targetFrequency: 60,
    minDuration: 3,
  },
  mesh: {
    serviceName: 'mesh-media-sync-fast',
    enabledTransports: ['webrtc'], // Fastest transport
    autoAcceptConnections: true,
    maxConnections: 20,
  },
};
```

### Example 12: Battery-Optimized Configuration (Mobile)

```typescript
const batteryOptimizedConfig: FrameworkConfig = {
  storage: {
    provider: 'ipfs',
    uploadConcurrency: 1, // Reduce network usage
  },
  blockchain: {
    network: 'polygon',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
    gasPriceStrategy: 'slow', // Cheaper transactions
  },
  privacy: {
    networkType: 'tor',
    socksProxy: 'socks5://127.0.0.1:9050',
    hopCount: 3,
    enablePadding: false, // Save bandwidth
  },
  fingerprint: {
    sampleRate: 22050, // Lower sample rate
    fftWindowSize: 2048,
    targetFrequency: 60,
    minDuration: 5,
  },
  mesh: {
    serviceName: 'mesh-media-sync',
    enabledTransports: ['bluetooth'], // Power-efficient
    maxConnections: 3,
    connectionTimeout: 30000,
  },
};
```

## Error Handling

### Example 13: Comprehensive Error Handling

```typescript
async function publishWithErrorHandling() {
  try {
    const result = await framework.publishMedia({
      mediaData: videoData,
      audioData: audioSamples,
      mediaType: MediaType.VIDEO,
      title: 'Test Video',
    });
    
    return result;
  } catch (error: any) {
    if (error.code === 'FINGERPRINT_EXTRACTION_FAILED') {
      console.error('Failed to extract fingerprint. Audio quality may be too low.');
    } else if (error.code === 'STORAGE_UPLOAD_FAILED') {
      console.error('Storage upload failed. Check network connection.');
    } else if (error.code === 'BLOCKCHAIN_SUBMISSION_FAILED') {
      console.error('Blockchain submission failed. Check gas balance.');
    } else if (error.code === 'INSUFFICIENT_PEER_REPORTS') {
      console.error('Not enough peer reports. Try increasing mesh discovery time.');
    } else {
      console.error('Unknown error:', error.message);
    }
    
    throw error;
  }
}
```

### Example 14: Retry Logic

```typescript
async function publishWithRetry(
  mediaRequest: any,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      return await framework.publishMedia(mediaRequest);
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

## Advanced Scenarios

### Example 15: Multi-Region Deployment

```typescript
// Configure multiple storage regions
const multiRegionConfig: FrameworkConfig = {
  storage: {
    provider: 'ipfs',
    endpoints: [
      'https://ipfs.infura.io:5001',
      'https://ipfs.io/api/v0',
      'https://cloudflare-ipfs.com/api/v0',
    ],
    redundantStorage: true,
    uploadConcurrency: 3,
  },
  blockchain: {
    network: 'polygon',
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://rpc-mainnet.matic.network',
      'https://matic-mainnet.chainstacklabs.com',
    ],
    chainId: 137,
  },
  // ... other config
};
```

### Example 16: Custom Relayer Selection

```typescript
import { RelayerNetworkManager } from './backend/relayer/network';

async function publishWithCustomRelayer() {
  const relayerManager = new RelayerNetworkManager({
    networkType: 'tor',
    socksProxy: 'socks5://127.0.0.1:9050',
  });
  
  await relayerManager.initialize();
  
  // Register trusted relayers
  await relayerManager.addRelayer({
    id: 'trusted-relayer-1',
    address: 'http://relayer1.onion',
    publicKey: 'relayer1-public-key',
    reputation: 1.0,
    minimumFee: BigInt(0),
  });
  
  // Submit through specific relayer
  const result = await relayerManager.submitAnchor(
    anchorData,
    {
      selectionStrategy: 'reputation',
      requireMinimumReputation: 0.8,
    }
  );
  
  console.log('Submitted via relayer:', result.relayerId);
}
```

### Example 17: Webhook Notifications

```typescript
// Set up webhook for verification updates
framework.on('verificationUpdate', async (event) => {
  const { mediaItemId, confidenceScore, peerReportsCount } = event;
  
  // Send webhook to your server
  await fetch('https://your-server.com/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaItemId,
      confidenceScore,
      peerReportsCount,
      timestamp: Date.now(),
    }),
  });
});

// Trigger verification updates
await framework.startMeshDiscovery();
```

### Example 18: Forensic Analysis

```typescript
import { TamperDetectionAnalyzer } from './backend/verification/confidence';

async function analyzeMediaForensics(mediaItemId: string) {
  const analyzer = new TamperDetectionAnalyzer();
  
  // Get all peer reports
  const peerReports = await framework.getPeerReports(mediaItemId);
  
  // Analyze for tampering
  const analysis = await analyzer.analyzeReports(peerReports);
  
  console.log('Forensic Analysis Results:');
  console.log('Tampering Detected:', analysis.tamperingDetected);
  console.log('Risk Level:', analysis.riskLevel);
  console.log('Suspicious Patterns:', analysis.suspiciousPatterns);
  
  if (analysis.tamperingDetected) {
    console.log('Warnings:');
    analysis.warnings.forEach(warning => console.log('-', warning));
  }
  
  return analysis;
}
```

### Example 19: Export Media Archive

```typescript
async function exportMediaArchive(mediaItemId: string, outputPath: string) {
  // Verify media
  const verification = await framework.verifyMedia(mediaItemId);
  
  if (!verification.isValid) {
    throw new Error('Cannot export invalid media');
  }
  
  // Download media
  const mediaData = await framework.storageManager.retrieve(verification.mediaCid);
  
  // Create archive with metadata
  const archive = {
    mediaItemId,
    mediaCid: verification.mediaCid,
    metadataCid: verification.metadataCid,
    blockchainTx: verification.blockchainTx,
    confidenceScore: verification.confidenceScore,
    metadata: verification.metadata,
    peerReports: verification.peerReports,
    exportedAt: Date.now(),
  };
  
  // Save files
  await fs.writeFile(`${outputPath}/media.bin`, mediaData);
  await fs.writeFile(`${outputPath}/metadata.json`, JSON.stringify(archive, null, 2));
  
  console.log(`Archive exported to ${outputPath}`);
}
```

### Example 20: Performance Benchmarking

```typescript
async function benchmarkPublishing() {
  const testSizes = [1, 5, 10, 50, 100]; // MB
  
  for (const sizeMB of testSizes) {
    const testData = new Uint8Array(sizeMB * 1024 * 1024);
    const audioData = new Float32Array(sizeMB * 100000);
    
    const startTime = Date.now();
    
    try {
      await framework.publishMedia({
        mediaData: testData,
        audioData: audioData,
        mediaType: MediaType.VIDEO,
        title: `Test ${sizeMB}MB`,
      });
      
      const duration = Date.now() - startTime;
      console.log(`${sizeMB}MB: ${duration}ms (${(sizeMB / (duration / 1000)).toFixed(2)} MB/s)`);
    } catch (error) {
      console.error(`${sizeMB}MB: Failed - ${error.message}`);
    }
  }
}
```

## Integration Examples

### Example 21: React Native Integration

```typescript
// MeshMediaService.ts
import { MediaSharingFramework } from './backend/orchestrator';
import { NativeModules } from 'react-native';

export class MeshMediaService {
  private framework: MediaSharingFramework;
  
  async initialize() {
    // Use native crypto modules
    const config = {
      crypto: {
        useNativeModules: true,
      },
      storage: {
        provider: 'ipfs',
        endpoint: 'https://ipfs.infura.io:5001',
      },
      // ... other config
    };
    
    this.framework = new MediaSharingFramework(config);
    await this.framework.initialize();
  }
  
  async publishVideo(videoUri: string) {
    // Read video from device
    const videoData = await NativeModules.FileSystem.readFile(videoUri);
    
    // Extract audio (use native audio processing)
    const audioData = await NativeModules.AudioProcessor.extractAudio(videoUri);
    
    return await this.framework.publishMedia({
      mediaData: videoData,
      audioData: audioData,
      mediaType: MediaType.VIDEO,
      title: 'Mobile Video',
    });
  }
}
```

### Example 22: Command-Line Tool

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { MediaSharingFramework } from './backend/orchestrator';

const program = new Command();

program
  .name('mesh-media')
  .description('Mesh Media Sharing CLI')
  .version('1.0.0');

program
  .command('publish <file>')
  .description('Publish a media file')
  .option('-t, --title <title>', 'Media title')
  .option('-d, --description <description>', 'Media description')
  .action(async (file, options) => {
    const framework = new MediaSharingFramework(config);
    await framework.initialize();
    
    const mediaData = await fs.readFile(file);
    const audioData = extractAudio(mediaData);
    
    const result = await framework.publishMedia({
      mediaData,
      audioData,
      mediaType: MediaType.VIDEO,
      title: options.title || file,
      description: options.description,
    });
    
    console.log('Published:', result.mediaCid);
  });

program
  .command('verify <mediaItemId>')
  .description('Verify a media item')
  .action(async (mediaItemId) => {
    const framework = new MediaSharingFramework(config);
    await framework.initialize();
    
    const verification = await framework.verifyMedia(mediaItemId);
    
    console.log('Valid:', verification.isValid);
    console.log('Confidence:', verification.confidenceScore);
  });

program.parse();
```

## Testing Examples

### Example 23: Unit Test

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MediaSharingFramework } from './backend/orchestrator';

describe('MediaSharingFramework', () => {
  let framework: MediaSharingFramework;
  
  beforeAll(async () => {
    framework = new MediaSharingFramework(testConfig);
    await framework.initialize();
  });
  
  afterAll(async () => {
    await framework.shutdown();
  });
  
  it('should publish media successfully', async () => {
    const result = await framework.publishMedia({
      mediaData: testMediaData,
      audioData: testAudioData,
      mediaType: MediaType.VIDEO,
      title: 'Test Video',
    });
    
    expect(result.mediaCid).toBeDefined();
    expect(result.confidenceScore).toBeGreaterThan(0);
  });
  
  it('should verify published media', async () => {
    const verification = await framework.verifyMedia(testMediaItemId);
    
    expect(verification.isValid).toBe(true);
    expect(verification.blockchainVerified).toBe(true);
  });
});
```

These examples cover the most common use cases. For more advanced scenarios, refer to the API Reference and Security documentation.
