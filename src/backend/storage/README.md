# Storage Module

## Overview

The **Storage module** handles uploading and retrieving media files on decentralized networks. Think of it as the "cloud storage" for your framework, but without a central company controlling it.

**Analogy**: Instead of uploading to Google Drive (one company), you're uploading to IPFS or Arweave (thousands of computers worldwide).

## What This Module Does

### Core Responsibilities

1. **Upload Media** - Store audio/video files on IPFS or Arweave and get a permanent ID (CID)
2. **Upload Metadata** - Store encrypted metadata separately for access control
3. **Retrieve Files** - Download files from decentralized storage
4. **Verify Content** - Check that downloaded content matches the original (using content hash)
5. **Handle Failures** - Retry uploads if they fail, use redundant storage providers

## File Structure

```
storage/
└── public-storage.ts          # IPFS and Arweave clients (7.0 KB)
```

## Two Storage Strategies

### Strategy 1: **Media Upload (Public)**
- **Media file**: Plaintext, publicly viewable
- **Why**: Enables peer verification of content authenticity
- **Who can read it**: Everyone
- **Storage provider**: IPFS or Arweave

### Strategy 2: **Metadata Upload (Encrypted)**
- **Metadata file**: Encrypted, only recipients can read
- **Why**: Protects privacy of descriptions, locations, etc.
- **Who can read it**: Only those with decryption keys
- **Storage provider**: IPFS or Arweave

## Current State

⚠️ **STUB**: Defines `PublicStorageManager` class with method signatures but no implementation.

**What exists** ✅
- Class definition
- Configuration interface
- Method signatures

**What's MISSING** ❌
- IPFS client implementation
- Arweave client implementation
- Upload logic
- Download/retrieval logic
- Retry/fallback logic
- Content verification

## What Needs to Be Done

### 1. **Install Storage Libraries** (HIGH PRIORITY)

```bash
npm install ipfs-http-client      # IPFS client
npm install arweave               # Arweave client
npm install @types/ipfs-http-client  # TypeScript types
```

### 2. **Implement IPFS Storage** (HIGH PRIORITY)

**What is IPFS?**
- IPFS = InterPlanetary File System
- Files are stored on thousands of nodes worldwide
- Each file gets a unique content hash (CID) like `QmXxx...`
- Files are pinned (kept) by multiple nodes so they persist
- Free for basic usage

```typescript
// storage/public-storage.ts

import * as IpfsHttpClient from 'ipfs-http-client';

export interface StorageConfig {
  provider: 'ipfs' | 'arweave' | 'both';
  ipfsEndpoint?: string;        // HTTP API endpoint
  arweaveConfig?: {
    walletPath: string;
    fundingAmount: string;
  };
  redundantStorage?: boolean;   // Use multiple providers
}

export interface StorageResult {
  cid: string;                  // Content ID (hash)
  provider: 'ipfs' | 'arweave';
  size: number;                 // File size in bytes
  uploadedAt: number;           // Timestamp
  expiresAt?: number;           // When it might expire (Arweave = never)
}

export class PublicStorageManager {
  private ipfs: ReturnType<typeof IpfsHttpClient.create> | null = null;
  private config: StorageConfig;
  
  constructor(config: StorageConfig) {
    this.config = config;
  }
  
  /**
   * Initialize storage manager
   */
  async initialize(): Promise<void> {
    if (this.config.provider === 'ipfs' || this.config.provider === 'both') {
      // Step 1: Connect to IPFS HTTP API
      const endpoint = this.config.ipfsEndpoint || 'https://ipfs.infura.io:5001';
      
      try {
        this.ipfs = IpfsHttpClient.create({
          url: endpoint,
          timeout: 60000  // 60 second timeout
        });
        
        // Step 2: Verify connection
        const version = await this.ipfs.version();
        console.log('Connected to IPFS:', version);
      } catch (error) {
        console.error('Failed to connect to IPFS:', error);
        if (this.config.provider === 'ipfs') {
          throw new Error('IPFS connection required but failed');
        }
      }
    }
    
    // TODO: Initialize Arweave if needed
  }
  
  /**
   * Upload media file to IPFS
   * 
   * Returns: Content ID (CID) that can be used to retrieve the file
   */
  async uploadMedia(mediaData: Uint8Array): Promise<StorageResult> {
    if (!this.ipfs) {
      throw new Error('Storage not initialized');
    }
    
    try {
      // Step 1: Upload to IPFS
      console.log(`Uploading ${mediaData.length} bytes to IPFS...`);
      
      const result = await this.ipfs.add(mediaData, {
        progress: (bytes) => {
          console.log(`Uploaded ${bytes} bytes...`);
        }
      });
      
      const cid = result.cid.toString();
      console.log('Upload successful. CID:', cid);
      
      // Step 2: Pin to ensure persistence
      await this.ipfs.pin.add(cid);
      console.log('File pinned on IPFS');
      
      // Step 3: Return result
      return {
        cid,
        provider: 'ipfs',
        size: mediaData.length,
        uploadedAt: Date.now()
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
  
  /**
   * Upload encrypted metadata to IPFS
   * 
   * Metadata is stored encrypted so only authorized parties can read it
   */
  async uploadMetadata(encryptedData: Uint8Array): Promise<StorageResult> {
    // Same as uploadMedia for now
    return this.uploadMedia(encryptedData);
  }
  
  /**
   * Retrieve media from IPFS using CID
   */
  async retrieveMedia(cid: string): Promise<Uint8Array> {
    if (!this.ipfs) {
      throw new Error('Storage not initialized');
    }
    
    try {
      console.log(`Retrieving ${cid} from IPFS...`);
      
      // Step 1: Read file from IPFS
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(new Uint8Array(chunk));
      }
      
      // Step 2: Combine chunks
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalSize);
      
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      console.log(`Retrieved ${result.length} bytes`);
      return result;
    } catch (error) {
      throw new Error(`Retrieval failed: ${error.message}`);
    }
  }
  
  /**
   * Get IPFS gateway URL for public viewing
   */
  getPublicGatewayUrl(cid: string): string {
    // IPFS gateway URL that anyone can use in a browser
    return `https://ipfs.io/ipfs/${cid}`;
  }
}
```

### 3. **Implement Arweave Storage (Optional)** (MEDIUM PRIORITY)

**What is Arweave?**
- Files stored permanently on blockchain
- Costs money upfront but lasts forever
- More expensive than IPFS but guaranteed permanence
- Good for critical evidence

```typescript
import Arweave from 'arweave';
import fs from 'fs';

export class PublicStorageManager {
  private arweave: Arweave | null = null;
  
  /**
   * Initialize Arweave (in initialize() method)
   */
  private async initializeArweave(): Promise<void> {
    this.arweave = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https'
    });
    
    // Load wallet (must exist and have funding)
    const walletPath = this.config.arweaveConfig?.walletPath;
    if (walletPath && fs.existsSync(walletPath)) {
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
      this.arweave.setSigningKey(walletData);
    }
  }
  
  /**
   * Upload to Arweave
   */
  async uploadToArweave(mediaData: Uint8Array): Promise<StorageResult> {
    if (!this.arweave) {
      throw new Error('Arweave not initialized');
    }
    
    try {
      // Step 1: Create transaction
      const transaction = await this.arweave.createTransaction({
        data: mediaData
      });
      
      // Step 2: Sign transaction
      await this.arweave.transactions.sign(transaction);
      
      // Step 3: Submit to network
      const uploader = await this.arweave.transactions.getUploader(transaction);
      
      while (!uploader.isComplete) {
        await uploader.uploadChunk();
        console.log(`Upload progress: ${uploader.pctComplete}%`);
      }
      
      // Step 4: Return transaction ID (permanent address)
      return {
        cid: transaction.id,  // Called CID but it's actually TX ID
        provider: 'arweave',
        size: mediaData.length,
        uploadedAt: Date.now(),
        expiresAt: undefined  // Arweave is permanent
      };
    } catch (error) {
      throw new Error(`Arweave upload failed: ${error.message}`);
    }
  }
  
  /**
   * Retrieve from Arweave using transaction ID
   */
  async retrieveFromArweave(txId: string): Promise<Uint8Array> {
    if (!this.arweave) {
      throw new Error('Arweave not initialized');
    }
    
    try {
      // Fetch from Arweave gateway
      const response = await fetch(`https://arweave.net/${txId}`);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (error) {
      throw new Error(`Arweave retrieval failed: ${error.message}`);
    }
  }
}
```

### 4. **Implement Content Verification** (HIGH PRIORITY)

```typescript
import { createHash } from 'crypto';

export class PublicStorageManager {
  /**
   * Verify that downloaded content matches expected hash
   */
  async verifyContent(
    data: Uint8Array,
    expectedHash: string
  ): Promise<boolean> {
    // Step 1: Calculate hash of downloaded data
    const hash = createHash('sha256');
    hash.update(Buffer.from(data));
    const actualHash = hash.digest('hex');
    
    // Step 2: Compare
    return actualHash === expectedHash;
  }
  
  /**
   * Calculate hash of data (for storage)
   */
  calculateHash(data: Uint8Array): string {
    const hash = createHash('sha256');
    hash.update(Buffer.from(data));
    return hash.digest('hex');
  }
}
```

### 5. **Implement Redundant Upload** (MEDIUM PRIORITY)

```typescript
export class PublicStorageManager {
  /**
   * Upload with redundancy (to multiple providers)
   */
  async uploadMediaWithRedundancy(
    mediaData: Uint8Array
  ): Promise<StorageResult[]> {
    if (!this.config.redundantStorage) {
      // Single provider
      if (this.config.provider === 'ipfs') {
        return [await this.uploadMedia(mediaData)];
      } else if (this.config.provider === 'arweave') {
        return [await this.uploadToArweave(mediaData)];
      }
      return [];
    }
    
    // Multiple providers
    const results: StorageResult[] = [];
    
    if (this.ipfs) {
      try {
        results.push(await this.uploadMedia(mediaData));
      } catch (error) {
        console.error('IPFS upload failed:', error);
      }
    }
    
    if (this.arweave) {
      try {
        results.push(await this.uploadToArweave(mediaData));
      } catch (error) {
        console.error('Arweave upload failed:', error);
      }
    }
    
    if (results.length === 0) {
      throw new Error('All storage providers failed');
    }
    
    return results;
  }
}
```

### 6. **Add Retry Logic** (MEDIUM PRIORITY)

```typescript
async function uploadWithRetry(
  uploadFn: () => Promise<StorageResult>,
  maxRetries = 3
): Promise<StorageResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadFn();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Upload failed after all retries');
}
```

## How to Use This Module

### Step 1: Initialize Storage

```typescript
// In orchestrator/index.ts
const storage = new PublicStorageManager({
  provider: 'ipfs',
  ipfsEndpoint: 'https://ipfs.infura.io:5001',
  redundantStorage: false
});

await storage.initialize();
```

### Step 2: Upload Media

```typescript
const mediaData = await loadAudioFile('recording.wav');

const result = await storage.uploadMedia(mediaData);
console.log('Media uploaded to IPFS:', result.cid);
console.log('Gateway URL:', storage.getPublicGatewayUrl(result.cid));

// Share URL: https://ipfs.io/ipfs/QmXxx...
```

### Step 3: Upload Encrypted Metadata

```typescript
const encrypted = await crypto.encryptMetadata(metadata, [recipientKey]);

const metadataResult = await storage.uploadMetadata(encrypted);
console.log('Encrypted metadata CID:', metadataResult.cid);
```

### Step 4: Retrieve and Verify

```typescript
// Later, retrieve and verify
const retrieved = await storage.retrieveMedia(result.cid);

const hash = storage.calculateHash(mediaData);
const isValid = await storage.verifyContent(retrieved, hash);

if (isValid) {
  console.log('✅ Content verified - no tampering detected');
} else {
  console.log('❌ Content mismatch - may have been corrupted');
}
```

## Checklist for Completing This Module

- [ ] Install ipfs-http-client library
- [ ] Implement IPFS connection and initialization
- [ ] Implement media upload to IPFS
- [ ] Implement media retrieval from IPFS
- [ ] Implement file pinning (persistence)
- [ ] Implement content hash calculation
- [ ] Implement content verification
- [ ] Add error handling for network failures
- [ ] Implement retry logic with exponential backoff
- [ ] Implement redundant uploads (optional but recommended)
- [ ] Test with actual IPFS/Infura endpoint
- [ ] Document gateway URLs for public access

## Cost Considerations

### IPFS (Recommended for PoC)
- **Cost**: Free (using public gateway like Infura)
- **Persistence**: Depends on pinning (auto-pinned on Infura for 30 days)
- **Speed**: Fast (geographically distributed)
- **Great for**: Testing, non-critical data, public content

### Arweave (For Permanent Storage)
- **Cost**: ~$0.02-0.05 per MB (one-time)
- **Persistence**: Permanent (blockchain stored)
- **Speed**: Slower than IPFS
- **Great for**: Critical evidence, long-term archival

**Recommendation**: Start with IPFS, upgrade to Arweave for critical recordings.

## Gateway URLs

Anyone can view uploaded media using gateway URLs:
```
IPFS Gateway:
https://ipfs.io/ipfs/QmXxxx...
https://cloudflare-ipfs.com/ipfs/QmXxxx...

Arweave Gateway:
https://arweave.net/TxID...
```

## Key Takeaways

1. **Decentralized storage is key** - No single entity can take down content
2. **Content hashing enables verification** - Download and verify without trusting server
3. **Redundancy improves reliability** - Use multiple providers for critical data
4. **Gateways enable public access** - Anyone can view without running a full node

## Next Steps

1. Connect to IPFS Infura endpoint
2. Implement basic upload and retrieval
3. Test with real audio files
4. Implement content verification
5. Add retry logic
6. Test redundant uploads
7. Optionally add Arweave support
