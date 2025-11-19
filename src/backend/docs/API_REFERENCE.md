# API Quick Reference

Comprehensive API documentation for the Mesh Media Sharing Framework. This reference provides detailed technical specifications for every public interface, including classes, methods, types, events, and configuration options.

## Documentation Structure

This reference is organized hierarchically:
1. **Quick Start**: Minimal code to get started
2. **Core Classes**: Main framework classes (MediaSharingFramework, PQCryptoManager, etc.)
3. **Type Definitions**: TypeScript interfaces and types
4. **Configuration**: Framework configuration options
5. **Events**: Emitted events and their payloads
6. **Error Codes**: Standardized error codes and meanings
7. **Utilities**: Helper functions and utilities

For practical usage examples, see [EXAMPLES.md](./EXAMPLES.md). For security considerations, see [SECURITY.md](./SECURITY.md).

## Quick Start

```typescript
import { MediaSharingFramework } from './backend/orchestrator';

const framework = new MediaSharingFramework({
  storage: { provider: 'ipfs', endpoint: 'https://ipfs.infura.io:5001' },
  blockchain: { network: 'polygon', rpcUrl: 'https://polygon-rpc.com', chainId: 137 },
  privacy: { networkType: 'tor', socksProxy: 'socks5://127.0.0.1:9050' },
});

await framework.initialize();
const result = await framework.publishMedia(audioData, { description: 'Recording' });
```

## Core Classes

### MediaSharingFramework
Main orchestrator for the entire framework.

```typescript
class MediaSharingFramework {
  constructor(config: FrameworkConfig);
  
  // Initialization
  initialize(): Promise<void>;
  
  // Media operations
  publishMedia(
    mediaData: Float32Array | Int16Array | Blob,
    metadata: { description?: string; tags?: string[]; location?: string },
    options?: { requestPeerVerification?: boolean; minPeerReports?: number }
  ): Promise<PublicationResult>;
  
  verifyMedia(fingerprintHash: string): Promise<VerificationResult>;
  
  // Peer network
  startPeerDiscovery(): Promise<void>;
  stopPeerDiscovery(): Promise<void>;
  getDiscoveredPeers(): MeshPeer[];
  getRelayerNodes(): RelayerNode[];
}
```

### PQCryptoManager
Post-quantum cryptography operations.

```typescript
class PQCryptoManager {
  // KEM operations
  generateKEMKeyPair(algorithm?: 'kyber512' | 'kyber768' | 'kyber1024'): Promise<PQKeyPair>;
  encapsulate(recipientPublicKey: Uint8Array): Promise<KEMEncapsulation>;
  decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array>;
  
  // Signature operations
  generateSignatureKeyPair(algorithm?: 'dilithium2' | 'dilithium3' | 'dilithium5'): Promise<PQKeyPair>;
  sign(message: Uint8Array, privateKey: Uint8Array, publicKey: Uint8Array): Promise<SignatureResult>;
  verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean>;
  
  // AEAD encryption
  encryptAEAD(plaintext: Uint8Array, key: Uint8Array, associatedData?: Uint8Array): Promise<AEADResult>;
  decryptAEAD(ciphertext: Uint8Array, nonce: Uint8Array, tag: Uint8Array, key: Uint8Array): Promise<Uint8Array>;
  
  // Key derivation and hashing
  deriveKey(inputKeyMaterial: Uint8Array, length: number, salt?: Uint8Array): Promise<Uint8Array>;
  hash(data: Uint8Array, variant?: 256 | 512): Promise<Uint8Array>;
}
```

### MainsHumExtractor
Fingerprint extraction and comparison.

```typescript
class MainsHumExtractor {
  constructor(config?: Partial<FingerprintConfig>);
  
  extract(audioData: Float32Array | Int16Array, sampleRate?: number): Promise<Fingerprint>;
  compare(fingerprint1: Fingerprint, fingerprint2: Fingerprint): Promise<FingerprintComparison>;
}
```

### MeshTransportManager
Mesh network peer discovery and communication.

```typescript
class MeshTransportManager {
  constructor(crypto: PQCryptoManager, config?: Partial<MeshTransportConfig>);
  
  initialize(): Promise<void>;
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  
  getDiscoveredPeers(): MeshPeer[];
  connectToPeer(peerId: string): Promise<void>;
  disconnectPeer(peerId: string): Promise<void>;
  
  sendFingerprintRequest(peerId: string, request: FingerprintRequest): Promise<FingerprintResponse>;
  broadcast(message: PeerMessage): Promise<void>;
  
  on(event: 'peer-discovered' | 'peer-connected' | 'peer-disconnected', handler: Function): void;
}
```

### PublicStorageManager
IPFS and Arweave storage operations.

```typescript
class PublicStorageManager {
  constructor(config: StorageConfig);
  
  uploadMedia(data: Blob | Uint8Array): Promise<StorageUploadResult>;
  uploadMetadata(encryptedBlob: Uint8Array): Promise<StorageUploadResult>;
  retrieve(cid: string, provider?: 'ipfs' | 'arweave'): Promise<Uint8Array>;
}
```

### BlockchainAnchorManager
Blockchain anchor publishing and verification.

```typescript
class BlockchainAnchorManager {
  constructor(config: BlockchainConfig);
  
  publishAnchor(anchor: BlockchainAnchor): Promise<AnchorTransaction>;
  verifyAnchor(fingerprintHash: string): Promise<AnchorVerification>;
  getAnchorByTx(txHash: string): Promise<BlockchainAnchor | null>;
  
  getGasPrice(): Promise<bigint>;
  estimateGas(anchor: BlockchainAnchor): Promise<number>;
}
```

### RelayerNetworkManager
Privacy-preserving relayer network.

```typescript
class RelayerNetworkManager {
  constructor(privacyConfig: PrivacyNetworkConfig, blockchainManager?: BlockchainAnchorManager);
  
  initialize(): Promise<void>;
  
  submitAnchor(
    anchor: BlockchainAnchor,
    options?: {
      strategy?: 'random' | 'reputation' | 'lowest_fee' | 'distributed';
      redundancy?: number;
      maxFee?: bigint;
      priority?: 'low' | 'medium' | 'high';
    }
  ): Promise<RelayerResult[]>;
  
  getRelayers(): RelayerNode[];
  addRelayer(node: RelayerNode): void;
  removeRelayer(nodeId: string): void;
}
```

### ConfidenceAggregator
Peer report aggregation and confidence scoring.

```typescript
class ConfidenceAggregator {
  constructor(crypto: PQCryptoManager);
  
  aggregate(
    reports: PeerReport[],
    options?: {
      outlierThreshold?: number;
      minPeers?: number;
      verifySignatures?: boolean;
    }
  ): Promise<ConfidenceAggregation>;
}
```

## Type Definitions

### FrameworkConfig
```typescript
interface FrameworkConfig {
  fingerprint?: Partial<FingerprintConfig>;
  storage: StorageConfig;
  blockchain: BlockchainConfig;
  privacy: PrivacyNetworkConfig;
  mesh?: Partial<MeshTransportConfig>;
}
```

### PublicationResult
```typescript
interface PublicationResult {
  mediaItem: MediaItem;
  txHash: string;
  mediaUrl: string;
  metadataCid: string;
  confidenceScore: number;
  tamperAnalysis: {
    riskLevel: 'low' | 'medium' | 'high';
    indicators: string[];
  };
  publishedAt: string;
}
```

### Fingerprint
```typescript
interface Fingerprint {
  vector: Float32Array;
  hash: string;
  mainsFrequency: number;
  extractionQuality: number;
  duration: number;
  sampleRate: number;
  extractedAt: string;
}
```

### BlockchainAnchor
```typescript
interface BlockchainAnchor {
  mediaCid: string;
  fingerprintHash: string;
  metadataCid: string;
  timestamp: string;
  ephemeralVerificationBlob: string;
  version: string;
}
```

## Configuration Examples

### Minimal Configuration
```typescript
const config: FrameworkConfig = {
  storage: {
    provider: 'ipfs',
    endpoint: 'https://ipfs.infura.io:5001',
    redundantStorage: false,
  },
  blockchain: {
    network: 'polygon',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
    gasPriceStrategy: 'standard',
  },
  privacy: {
    networkType: 'tor',
    socksProxy: 'socks5://127.0.0.1:9050',
    hopCount: 3,
    enablePadding: false,
    enableTimingObfuscation: false,
    submissionDelayRange: [0, 0],
  },
};
```

### Maximum Privacy Configuration
```typescript
const config: FrameworkConfig = {
  storage: {
    provider: 'ipfs',
    endpoint: 'https://ipfs.infura.io:5001',
    redundantStorage: true, // Upload to multiple providers
  },
  blockchain: {
    network: 'polygon',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
    gasPriceStrategy: 'slow', // Blend with regular traffic
  },
  privacy: {
    networkType: 'tor',
    socksProxy: 'socks5://127.0.0.1:9050',
    hopCount: 5, // More hops = better anonymity
    enablePadding: true,
    enableTimingObfuscation: true,
    submissionDelayRange: [5000, 15000], // Wider delay range
  },
  mesh: {
    serviceName: 'mesh-media-sync',
    peerName: 'Anonymous',
    enabledTransports: ['webrtc', 'bluetooth'],
    autoAcceptConnections: false,
    maxConnections: 5,
    enforceEncryption: true,
  },
};
```

## Error Handling

```typescript
import { FrameworkError, ErrorCode } from './backend/types';

try {
  const result = await framework.publishMedia(audioData, metadata);
} catch (error) {
  if (error instanceof FrameworkError) {
    switch (error.code) {
      case ErrorCode.FINGERPRINT_EXTRACTION_FAILED:
        console.error('Failed to extract fingerprint:', error.message);
        break;
      case ErrorCode.STORAGE_UPLOAD_FAILED:
        console.error('Storage upload failed:', error.details);
        break;
      case ErrorCode.RELAYER_UNAVAILABLE:
        console.error('No relayers available:', error.message);
        break;
      default:
        console.error('Framework error:', error);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Events

### Mesh Transport Events
```typescript
meshTransport.on('peer-discovered', (event: PeerDiscoveryEvent) => {
  console.log('Discovered peer:', event.peer.peerId);
});

meshTransport.on('peer-connected', (event: { peer: MeshPeer; timestamp: string }) => {
  console.log('Connected to peer:', event.peer.peerId);
});

meshTransport.on('peer-disconnected', (event: { peerId: string; timestamp: string }) => {
  console.log('Disconnected from peer:', event.peerId);
});
```

## Utility Functions

### Metadata Encryption/Decryption
```typescript
import { encryptMetadata, decryptMetadata } from './backend/crypto/pq-crypto';

// Encrypt
const { encryptedBlob, wrappedKeys } = await encryptMetadata(
  metadataObject,
  [recipientPubKey1, recipientPubKey2],
  cryptoManager
);

// Decrypt
const metadata = await decryptMetadata(
  encryptedBlob,
  wrappedKeys[0].wrappedKey,
  recipientPrivateKey,
  cryptoManager
);
```

### Ring Signature
```typescript
import { createEphemeralRing } from './backend/crypto/ring-signature';

const { ring, signerIndex, signerKeyPair } = await createEphemeralRing(cryptoManager, 20);

const ringSignature = await ringSignatureManager.sign(
  message,
  ring,
  signerIndex,
  signerKeyPair.privateKey
);

const isValid = await ringSignatureManager.verify(message, ringSignature);
```
