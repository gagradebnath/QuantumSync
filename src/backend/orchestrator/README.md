# Orchestrator Module

## Overview

The **Orchestrator module** is the "conductor" that coordinates all other modules to execute the complete media publishing workflow. Think of it as the maestro of an orchestra—it tells each musician (module) when to play their part.

**Analogy**: If modules are like ingredients in a recipe, the orchestrator is the chef who combines them in the right order.

## What This Module Does

### Core Responsibilities

1. **Coordinate Workflow** - Execute steps in correct order
2. **Handle Initialization** - Start up all modules with proper configuration
3. **Provide Simple API** - Hide complexity, expose clean interface to client
4. **Error Handling** - Catch and report errors gracefully
5. **Event Emission** - Notify client of progress/status changes

## File Structure

```
orchestrator/
└── index.ts          # Main framework coordinator (14.2 KB)
```

## Complete Publishing Workflow

This is what the orchestrator orchestrates:

```
1. Load audio file
   ↓
2. Extract fingerprint
   ↓
3. Upload media to IPFS
   ↓
4. Encrypt metadata
   ↓
5. Upload encrypted metadata to IPFS
   ↓
6. Request peer fingerprint comparisons (mesh network)
   ↓
7. Collect peer reports
   ↓
8. Aggregate confidence scores
   ↓
9. Generate ring signature
   ↓
10. Create blockchain anchor
   ↓
11. Submit through relayer (anonymously)
   ↓
12. Return results to client
```

## Current State

⚠️ **STUB**: Defines `MediaSharingFramework` class with method signatures but no implementation.

**What exists** ✅
- Class structure
- Configuration interface
- Method signatures

**What's MISSING** ❌
- Module initialization
- Workflow coordination
- Error handling
- Event emission
- Progress tracking

## What Needs to Be Done

### 1. **Implement Framework Initialization** (HIGH PRIORITY)

```typescript
// orchestrator/index.ts

import { PQCryptoManager } from '../crypto/pq-crypto';
import { MainsHumExtractor } from '../fingerprint/mains-hum';
import { MeshTransport } from '../mesh/transport';
import { PublicStorageManager } from '../storage/public-storage';
import { BlockchainAnchor } from '../blockchain/anchor';
import { RelayerNetwork } from '../relayer/network';
import { ConfidenceAggregator } from '../verification/confidence';
import { SimpleDatabase } from '../database/simple-sqlite';

export interface FrameworkConfig {
  storage: { provider: 'ipfs' | 'arweave'; endpoint: string };
  blockchain: { network: string; rpcUrl: string; chainId: number };
  privacy: { networkType: 'tor' | 'none'; socksProxy?: string };
  fingerprint: { targetFrequency: number; minDuration: number };
  mesh: { serviceName: string; enabledTransports: string[] };
}

export class MediaSharingFramework {
  private crypto: PQCryptoManager | null = null;
  private fingerprint: MainsHumExtractor | null = null;
  private mesh: MeshTransport | null = null;
  private storage: PublicStorageManager | null = null;
  private blockchain: BlockchainAnchor | null = null;
  private relayer: RelayerNetwork | null = null;
  private aggregator: ConfidenceAggregator | null = null;
  private database: SimpleDatabase | null = null;
  private config: FrameworkConfig;
  private initialized = false;
  
  constructor(config: FrameworkConfig) {
    this.config = config;
  }
  
  /**
   * Initialize all framework modules
   * 
   * Must be called before any publishing/verification
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Media Sharing Framework...\n');
    
    try {
      // Step 1: Initialize database
      console.log('1️⃣  Initializing database...');
      this.database = new SimpleDatabase();
      console.log('✅ Database ready\n');
      
      // Step 2: Initialize cryptography
      console.log('2️⃣  Initializing post-quantum crypto...');
      this.crypto = new PQCryptoManager();
      await this.crypto.initialize();
      console.log('✅ Crypto ready\n');
      
      // Step 3: Initialize fingerprinting
      console.log('3️⃣  Initializing fingerprint extractor...');
      this.fingerprint = new MainsHumExtractor({
        sampleRate: 44100,
        fftWindowSize: 4096,
        targetFrequency: this.config.fingerprint.targetFrequency,
        minDuration: this.config.fingerprint.minDuration
      });
      console.log('✅ Fingerprinting ready\n');
      
      // Step 4: Initialize storage
      console.log('4️⃣  Initializing storage...');
      this.storage = new PublicStorageManager({
        provider: this.config.storage.provider as 'ipfs' | 'arweave',
        ipfsEndpoint: this.config.storage.endpoint
      });
      await this.storage.initialize();
      console.log('✅ Storage ready\n');
      
      // Step 5: Initialize blockchain
      console.log('5️⃣  Initializing blockchain...');
      this.blockchain = new BlockchainAnchor({
        network: this.config.blockchain.network as any,
        rpcUrl: this.config.blockchain.rpcUrl,
        chainId: this.config.blockchain.chainId
      });
      await this.blockchain.initialize(process.env.RELAYER_PRIVATE_KEY);
      console.log('✅ Blockchain ready\n');
      
      // Step 6: Initialize relayer network
      console.log('6️⃣  Initializing relayer network...');
      this.relayer = new RelayerNetwork({
        torEnabled: this.config.privacy.networkType === 'tor',
        minRelayerReputation: 0.8,
        useMultipleRelayers: true,
        timingObfuscation: 3000
      });
      await this.relayer.initialize();
      console.log('✅ Relayer network ready\n');
      
      // Step 7: Initialize mesh transport
      console.log('7️⃣  Initializing mesh transport...');
      this.mesh = new MeshTransport({
        enabledTransports: this.config.mesh.enabledTransports as any[],
        serviceName: this.config.mesh.serviceName,
        discoveryInterval: 5000,
        maxPeers: 50
      });
      console.log('✅ Mesh transport ready\n');
      
      // Step 8: Initialize confidence aggregator
      console.log('8️⃣  Initializing confidence aggregator...');
      this.aggregator = new ConfidenceAggregator();
      console.log('✅ Confidence aggregator ready\n');
      
      this.initialized = true;
      console.log('✨ Framework initialization complete!\n');
    } catch (error) {
      throw new Error(`Framework initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Check if framework is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Framework not initialized - call initialize() first');
    }
  }
}
```

### 2. **Implement Publishing Workflow** (HIGH PRIORITY)

```typescript
export interface PublicationResult {
  mediaUrl: string;              // Gateway URL for public access
  txHash: string;                // Blockchain transaction hash
  confidenceScore: number;       // Peer verification confidence [0.0, 1.0]
  peerCount: number;             // How many peers verified
  mediaCid: string;              // IPFS hash
  metadataCid: string;           // Encrypted metadata hash
  timestamp: number;             // Publication time
}

export class MediaSharingFramework {
  /**
   * Publish media with full privacy-preserving workflow
   */
  async publishMedia(
    mediaData: Uint8Array,
    metadata: {
      title: string;
      description: string;
      tags: string[];
      location: string;
    }
  ): Promise<PublicationResult> {
    this.ensureInitialized();
    
    try {
      console.log('📤 Starting media publication...\n');
      
      // Step 1: Extract fingerprint
      console.log('1️⃣ Extracting audio fingerprint...');
      const fingerprint = await this.fingerprint!.extract(
        new Float32Array(mediaData)
      );
      console.log(`✅ Fingerprint extracted (quality: ${fingerprint.quality.toFixed(2)})\n`);
      
      // Step 2: Upload media to IPFS
      console.log('2️⃣ Uploading media to IPFS...');
      const mediaUpload = await this.storage!.uploadMedia(mediaData);
      const mediaUrl = this.storage!.getPublicGatewayUrl(mediaUpload.cid);
      console.log(`✅ Media uploaded: ${mediaUrl}\n`);
      
      // Step 3: Encrypt metadata
      console.log('3️⃣ Encrypting metadata...');
      // Get our public key for wrapping
      const ourKeyPair = await this.crypto!.generateKEMKeyPair();
      const encryptedMetadata = await this.crypto!.encryptMetadata(
        {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          location: metadata.location,
          recordedAt: Date.now()
        },
        [ourKeyPair.publicKey]
      );
      console.log('✅ Metadata encrypted\n');
      
      // Step 4: Upload encrypted metadata
      console.log('4️⃣ Uploading encrypted metadata...');
      const metadataUpload = await this.storage!.uploadMetadata(
        encryptedMetadata.ciphertext
      );
      console.log(`✅ Encrypted metadata uploaded\n`);
      
      // Step 5: Request peer verification
      console.log('5️⃣ Requesting peer fingerprint verification...');
      
      // Start mesh discovery
      await this.mesh!.startDiscovery();
      
      // Wait a bit for peers to be discovered
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const peers = this.mesh!.getDiscoveredPeers();
      console.log(`Found ${peers.length} peers for verification`);
      
      let validReports = 0;
      
      for (const peer of peers) {
        try {
          const report = await this.mesh!.requestFingerprintComparison(
            peer.id,
            fingerprint,
            'dummy-media-id',
            this.crypto!
          );
          
          this.aggregator!.addReport({
            peerId: peer.id,
            mediaItemId: 'dummy-media-id',
            similarity: report.comparison.similarity,
            confidence: report.comparison.confidence,
            signature: new Uint8Array(),
            timestamp: Date.now()
          });
          
          validReports++;
        } catch (error) {
          console.warn(`Peer ${peer.id} verification failed:`, error.message);
        }
      }
      
      console.log(`✅ Received ${validReports} peer reports\n`);
      
      // Step 6: Calculate confidence
      console.log('6️⃣ Aggregating peer reports and calculating confidence...');
      const peerPublicKeys = new Map();  // Would populate from peer discovery
      // For MVP, skip verification since we don't have real signatures
      let confidenceScore = 0;
      if (validReports > 0) {
        confidenceScore = 0.85;  // Placeholder
      }
      console.log(`✅ Confidence score: ${confidenceScore.toFixed(2)}\n`);
      
      // Step 7: Create blockchain anchor
      console.log('7️⃣ Creating blockchain anchor...');
      const fingerprintHash = this.storage!.calculateHash(
        new Uint8Array(fingerprint.signature)
      );
      
      const anchorData = {
        mediaCid: mediaUpload.cid,
        metadataCid: metadataUpload.cid,
        fingerprintHash,
        timestamp: Date.now(),
        verificationBlob: new Uint8Array()
      };
      console.log('✅ Anchor created\n');
      
      // Step 8: Submit through relayer
      console.log('8️⃣ Submitting anchor to blockchain (via relayer)...');
      const relayResult = await this.relayer!.submitAnchorThroughRelayer(
        anchorData,
        this.blockchain!
      );
      console.log(`✅ Submitted! TX: ${relayResult.transactionHash}\n`);
      
      // Step 9: Store in local database
      console.log('9️⃣ Storing publication record...');
      this.database!.saveMedia({
        id: generateUUID(),
        mediaCid: mediaUpload.cid,
        metadata_cid: metadataUpload.cid,
        fingerprintHash,
        created_at: Date.now()
      });
      console.log('✅ Stored locally\n');
      
      // Step 10: Return results
      const result: PublicationResult = {
        mediaUrl,
        txHash: relayResult.transactionHash,
        confidenceScore,
        peerCount: validReports,
        mediaCid: mediaUpload.cid,
        metadataCid: metadataUpload.cid,
        timestamp: Date.now()
      };
      
      console.log('🎉 Publication complete!\n');
      console.log('Results:');
      console.log(`  Media URL: ${result.mediaUrl}`);
      console.log(`  Transaction: ${result.txHash}`);
      console.log(`  Confidence: ${result.confidenceScore.toFixed(2)}`);
      console.log(`  Verified by: ${result.peerCount} peers\n`);
      
      return result;
    } catch (error) {
      throw new Error(`Publication failed: ${error.message}`);
    } finally {
      await this.mesh!.stopDiscovery();
    }
  }
}
```

### 3. **Implement Verification Workflow** (MEDIUM PRIORITY)

```typescript
export interface VerificationResult {
  found: boolean;
  mediaUrl?: string;
  confidenceScore?: number;
  peerCount?: number;
  timestamp?: number;
  authentic: boolean;
}

export class MediaSharingFramework {
  /**
   * Verify published media
   */
  async verifyMedia(fingerprintHash: string): Promise<VerificationResult> {
    this.ensureInitialized();
    
    try {
      console.log('🔍 Verifying media...\n');
      
      // Step 1: Query blockchain for anchor
      console.log('1️⃣ Querying blockchain for anchor...');
      const anchor = await this.blockchain!.queryAnchorByFingerprint(fingerprintHash);
      
      if (!anchor) {
        console.log('❌ Not found on blockchain\n');
        return { found: false, authentic: false };
      }
      
      console.log('✅ Anchor found\n');
      
      // Step 2: Retrieve media from IPFS
      console.log('2️⃣ Retrieving media from IPFS...');
      const mediaData = await this.storage!.retrieveMedia(anchor.mediaCid);
      const mediaUrl = this.storage!.getPublicGatewayUrl(anchor.mediaCid);
      console.log('✅ Media retrieved\n');
      
      // Step 3: Verify content hash
      console.log('3️⃣ Verifying content integrity...');
      const calculatedHash = this.storage!.calculateHash(mediaData);
      const hashValid = calculatedHash === anchor.fingerprintHash;
      console.log(hashValid ? '✅ Content verified\n' : '❌ Content mismatch\n');
      
      return {
        found: true,
        mediaUrl,
        confidenceScore: 0.85,  // Would come from stored anchor
        peerCount: 0,            // Would come from stored anchor
        timestamp: anchor.timestamp,
        authentic: hashValid
      };
    } catch (error) {
      throw new Error(`Verification failed: ${error.message}`);
    }
  }
}
```

### 4. **Add Lifecycle Management** (MEDIUM PRIORITY)

```typescript
export class MediaSharingFramework {
  /**
   * Shutdown the framework
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down framework...');
    
    if (this.mesh) {
      await this.mesh.stopDiscovery();
    }
    
    if (this.database) {
      this.database.close();
    }
    
    this.initialized = false;
    console.log('✅ Framework shut down');
  }
  
  /**
   * Get framework status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      crypto: !!this.crypto,
      storage: !!this.storage,
      blockchain: !!this.blockchain,
      mesh: !!this.mesh,
      relayer: !!this.relayer
    };
  }
}
```

## How to Use This Module

### Basic Usage

```typescript
import { MediaSharingFramework } from './orchestrator';

// Step 1: Create framework with config
const framework = new MediaSharingFramework({
  storage: {
    provider: 'ipfs',
    endpoint: 'https://ipfs.infura.io:5001'
  },
  blockchain: {
    network: 'polygon',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    chainId: 80001
  },
  privacy: {
    networkType: 'tor',
    socksProxy: 'socks5://127.0.0.1:9050'
  },
  fingerprint: {
    targetFrequency: 60,
    minDuration: 5
  },
  mesh: {
    serviceName: 'mesh-media-sync',
    enabledTransports: ['webrtc']
  }
});

// Step 2: Initialize all modules
await framework.initialize();

// Step 3: Load audio
const audioBuffer = fs.readFileSync('recording.wav');

// Step 4: Publish
const result = await framework.publishMedia(audioBuffer, {
  title: 'Evidence recording',
  description: 'Important documentation',
  tags: ['evidence', 'public'],
  location: 'Downtown'
});

// Step 5: Get results
console.log('Published at:', result.mediaUrl);
console.log('Confidence:', result.confidenceScore);

// Step 6: Shutdown
await framework.shutdown();
```

## Checklist for Completing This Module

- [ ] Implement module initialization
- [ ] Implement publishing workflow (all 10 steps)
- [ ] Implement verification workflow
- [ ] Add error handling and recovery
- [ ] Add progress logging
- [ ] Implement shutdown/cleanup
- [ ] Test complete workflow end-to-end
- [ ] Document configuration options
- [ ] Add usage examples
- [ ] Test with real audio files

## Key Takeaways

1. **Orchestrator hides complexity** - Client doesn't need to know about modules
2. **Workflow order matters** - Must extract fingerprint before uploading, etc.
3. **Error handling is critical** - Failure in one step should gracefully fail entire operation
4. **Clean shutdown is important** - Must clean up resources (close DB, stop mesh, etc.)

## Next Steps

1. Implement framework initialization
2. Implement publishing workflow
3. Test with real audio file
4. Implement verification workflow
5. Add error recovery
6. Test complete end-to-end flow
