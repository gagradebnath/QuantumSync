# Mesh Media Sharing Framework - Backend Implementation

## Overview

A comprehensive, privacy-preserving framework for sharing audio/video media over local mesh networks with public blockchain anchoring. This enterprise-grade system implements cutting-edge cryptographic techniques including post-quantum cryptography, mains-hum fingerprinting, and anonymous relayer networks to provide maximum privacy protection, tamper-resilience, and verifiable authenticity for sensitive media content.

### Key Capabilities

**Privacy Protection**: The framework ensures complete anonymity for content publishers through multi-layered privacy mechanisms:
- **Ring Signatures**: Lattice-based cryptographic signatures that prove membership in a group without revealing which member signed, providing unconditional anonymity even against future quantum computers
- **Tor/I2P/Nym Integration**: All blockchain submissions are routed through anonymous networks, preventing IP address correlation and network traffic analysis
- **Metadata Encryption**: While media content is public (enabling verification), all identifying metadata is encrypted with post-quantum algorithms
- **Relayer Network**: Decoupled submission architecture ensures the blockchain never sees the original publisher's identity

**Verifiable Authenticity**: Media authenticity is established through multiple independent verification mechanisms:
- **Mains-Hum Fingerprinting**: Extracts unique electrical grid frequency signatures (50/60 Hz) from audio recordings, proving temporal and geographic proximity without revealing exact location
- **Peer Verification**: Distributed mesh network of peers independently verify recordings were made at the same time/location
- **Blockchain Anchoring**: Immutable timestamping and publication proof on public blockchains (Ethereum, Polygon)
- **Confidence Scoring**: Statistical aggregation of peer reports with outlier detection to compute tamper-resistance confidence

**Decentralized Architecture**: No single point of failure or control:
- **IPFS/Arweave Storage**: Content-addressed, permanent storage across distributed networks
- **Mesh Networking**: Peer-to-peer communication via Wi-Fi Direct, WebRTC, and Bluetooth LE
- **Multiple Relayers**: Redundant, operator-independent relayer nodes prevent censorship
- **Multi-Chain Support**: Flexible blockchain backend supports Ethereum, Polygon, and other EVM chains

**Production-Ready Features**:
- Comprehensive TypeScript implementation with full type safety
- Extensive inline JSDoc documentation for all APIs
- Database abstraction supporting SQLite (mobile) and PostgreSQL (server)
- Event-driven architecture for monitoring and integration
- Configurable security/performance trade-offs
- Cross-platform support (Node.js, React Native, browser)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT APPLICATION                         │
│  (Android / iOS / Web Browser)                              │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│              ORCHESTRATOR (orchestrator/index.ts)           │
│  Coordinates end-to-end workflow                            │
└───────────────┬─────────────────────────────────────────────┘
                │
        ┌───────┴───────┬──────────┬──────────┬───────────┐
        ▼               ▼          ▼          ▼           ▼
   ┌─────────┐   ┌──────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
   │Fingerprint│ │  Crypto  │ │  Mesh  │ │Storage │ │Blockchain│
   │  Module  │ │  Module  │ │Transport│ │ Module │ │  Anchor  │
   └─────────┘   └──────────┘ └────────┘ └─────────┘ └──────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │Relayer Network│
                            │  (Tor/Mixnet)│
                            └──────────────┘
```

## Module Structure

### Core Modules

```
backend/
├── types/                          # TypeScript type definitions
│   └── index.ts                   # All interfaces and types
├── database/                       # Database schemas and queries
│   └── schema.ts                  # SQL schemas for all tables
├── crypto/                         # Post-quantum cryptography
│   ├── pq-crypto.ts               # Kyber KEM, Dilithium, XChaCha20
│   └── ring-signature.ts          # Lattice-based ring signatures
├── fingerprint/                    # Mains-hum fingerprinting
│   └── mains-hum.ts               # FFT extraction and comparison
├── mesh/                           # Mesh network transport
│   └── transport.ts               # Wi-Fi Direct, WebRTC, BLE
├── storage/                        # Public CAS integration
│   └── public-storage.ts          # IPFS and Arweave clients
├── blockchain/                     # Blockchain anchoring
│   └── anchor.ts                  # Smart contract interface
├── relayer/                        # Privacy-preserving relayers
│   └── network.ts                 # Tor/mixnet relay protocol
├── verification/                   # Confidence aggregation
│   └── confidence.ts              # Peer report aggregation
└── orchestrator/                   # Main coordinator
    └── index.ts                   # High-level API
```

## Core Modules

### 1. **Types** (`types/index.ts`)
- Comprehensive TypeScript interfaces for all framework components
- Type-safe data structures for media items, peer reports, wrapped keys, etc.
- Error handling and validation types

### 2. **Database** (`database/schema.ts`)
- SQLite/PostgreSQL compatible schemas
- Tables: `media_items`, `peer_reports`, `wrapped_keys`, `ephemeral_keys`, `mesh_peers`, `relayer_nodes`
- Migration system for schema versioning

### 3. **Post-Quantum Cryptography** (`crypto/pq-crypto.ts`)
- **Kyber KEM** (768-bit): Key encapsulation for metadata encryption
- **Dilithium** (Level 3): Digital signatures for peer reports
- **XChaCha20-Poly1305**: Authenticated encryption (AEAD)
- **SHA3-256/512**: Cryptographic hashing
- Hybrid mode with classical fallbacks (X25519/Ed25519)

### 4. **Ring Signatures** (`crypto/ring-signature.ts`)
- Lattice-based ring signatures for anonymous anchor publishing
- Configurable anonymity set size (recommended: 10-100 members)
- Proves membership without revealing specific signer

### 5. **Fingerprint Extraction** (`fingerprint/mains-hum.ts`)
- Extracts electrical mains-hum signatures (50/60 Hz)
- FFT-based spectral analysis with bandpass filtering
- Cross-correlation and DTW for comparison
- Confidence scoring with tamper detection

### 6. **Mesh Transport** (`mesh/transport.ts`)
- Multi-protocol peer discovery (Wi-Fi Direct, WebRTC, Bluetooth LE)
- Encrypted peer-to-peer messaging
- Fingerprint comparison coordination
- Platform-specific implementations (Android/iOS/Web)

### 7. **Public Storage** (`storage/public-storage.ts`)
- **IPFS**: Content-addressable storage for media and metadata
- **Arweave**: Permanent storage option
- Media stored **plaintext** (public viewable)
- Metadata stored **encrypted** (post-quantum)

### 8. **Blockchain Anchor** (`blockchain/anchor.ts`)
- Minimal on-chain footprint for cost efficiency
- Smart contract or transaction-data based anchoring
- Supports Polygon, Ethereum L2s, Avalanche
- Anchor structure: `{mediaCid, fingerprintHash, metadataCid, timestamp, verificationBlob}`

### 9. **Relayer Network** (`relayer/network.ts`)
- Privacy-preserving relay protocol
- Tor/I2P/Nym mixnet integration
- Distributed relayer selection strategies
- Funding rotation to prevent on-chain linkage
- Timing obfuscation and traffic padding

### 10. **Confidence Aggregation** (`verification/confidence.ts`)
- Aggregates peer-signed comparison reports
- Outlier detection (trimmed mean, z-score)
- Signature verification (Dilithium)
- Tamper detection analysis

### 11. **Orchestrator** (`orchestrator/index.ts`)
- High-level framework coordinator
- End-to-end workflow automation
- Simple API for client applications

## Data Flow

### Publishing Media

```
1. Client captures/uploads media
   ↓
2. Extract mains-hum fingerprint (FFT analysis)
   ↓
3. Upload media (plaintext) to IPFS → get mediaCid
   ↓
4. Encrypt metadata with Kyber KEM (per recipient)
   ↓
5. Upload encrypted metadata to IPFS → get metadataCid
   ↓
6. Request fingerprint comparisons from mesh peers
   ↓
7. Aggregate peer reports → confidence score
   ↓
8. Generate ring signature (anonymity set of 20+ members)
   ↓
9. Submit anchor via Tor → relayer network
   ↓
10. Relayer publishes anchor to blockchain
    ↓
11. Return txHash and public media URL to client
```

### Verifying Media

```
1. Client queries blockchain anchor by fingerprintHash
   ↓
2. Retrieve mediaCid and metadataCid from anchor
   ↓
3. Verify ring signature (proves valid member signed)
   ↓
4. Fetch media from IPFS (public, plaintext)
   ↓
5. Fetch encrypted metadata from IPFS
   ↓
6. Decrypt metadata using wrapped keys (if authorized)
   ↓
7. Display media with confidence score and audit trail
```

## Security Features

### Post-Quantum Resistance
- **Kyber-768**: NIST Level 3 KEM (192-bit classical security equivalent)
- **Dilithium3**: NIST Level 3 signatures
- Protects against quantum attacks on wrapped keys and signatures

### Anonymity Measures
- **Tor/Mixnet**: All relayer communications over anonymity networks
- **Ring Signatures**: Unlinkable anchor publishing (no signer identity)
- **Ephemeral Keys**: One-time keys per submission
- **Funding Rotation**: Relayers use rotating accounts (no on-chain linkage)
- **Timing Obfuscation**: Random delays prevent correlation attacks

### Tamper Detection
- **Mains-Hum Fingerprinting**: Electrical grid signatures for timestamp verification
- **Peer Consensus**: Multiple independent devices verify fingerprint match
- **Confidence Scoring**: Aggregated tamper-resilience metric [0.0, 1.0]
- **Outlier Detection**: Statistical filtering of malicious reports

## Usage Example

```typescript
import { MediaSharingFramework } from './orchestrator';

// Initialize framework
const framework = new MediaSharingFramework({
  storage: {
    provider: 'ipfs',
    endpoint: 'https://ipfs.infura.io:5001',
    redundantStorage: true,
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
    enableTimingObfuscation: true,
    submissionDelayRange: [2000, 5000],
  },
});

await framework.initialize();

// Publish media
const audioData = await loadAudioFile('recording.wav');
const result = await framework.publishMedia(audioData, {
  description: 'Field recording from protest',
  tags: ['citizen-journalism', '2025-11-19'],
  location: 'Generalized Region', // Anonymized
});

console.log('Published media URL:', result.mediaUrl);
console.log('Blockchain TX:', result.txHash);
console.log('Confidence score:', result.confidenceScore);
console.log('Tamper risk:', result.tamperAnalysis.riskLevel);
```

## Deployment Considerations

### Production Dependencies

Install production-grade cryptography libraries:

```bash
npm install @noble/post-quantum  # Kyber & Dilithium
npm install libsodium-wrappers   # XChaCha20-Poly1305
npm install ipfs-http-client     # IPFS integration
npm install arweave              # Arweave integration
npm install ethers               # Ethereum/blockchain
npm install tor-request          # Tor integration
```

### Performance Optimization

- **Fingerprint Extraction**: Use Web Workers (browser) or Worker Threads (Node.js) for FFT computation
- **Signature Verification**: Batch verification for multiple peer reports
- **Storage Uploads**: Parallel uploads to IPFS/Arweave gateways
- **Database**: Index on `fingerprint_hash`, `media_cid`, `anchor_tx` for fast queries

### Platform-Specific Notes

#### Android
- Use Android NDK for native cryptography (faster)
- Wi-Fi Direct API for mesh networking
- Bluetooth LE for short-range discovery

#### iOS
- MultipeerConnectivity framework for mesh
- CoreBluetooth for BLE
- Network Extension for Tor integration (requires entitlements)

#### Web Browser
- WebRTC for peer discovery (requires signaling server)
- Web Bluetooth API (limited support)
- WASM builds of crypto libraries for performance

## API Reference

### MediaSharingFramework

Main orchestrator class providing high-level API.

#### Constructor

```typescript
new MediaSharingFramework(config: FrameworkConfig)
```

#### Methods

##### `initialize(): Promise<void>`
Initialize all framework components. Must be called before use.

##### `publishMedia(mediaData, metadata, options): Promise<PublicationResult>`
Publish media with full privacy-preserving workflow.

**Parameters:**
- `mediaData`: Audio/video data (Float32Array, Int16Array, or Blob)
- `metadata`: Descriptive metadata (description, tags, location)
- `options`: Publication options (peer verification, recipient keys, ring size)

**Returns:** `PublicationResult` containing media URL, txHash, confidence score

##### `verifyMedia(fingerprintHash): Promise<VerificationResult>`
Verify media exists on blockchain and retrieve anchor.

##### `startPeerDiscovery(): Promise<void>`
Start mesh peer discovery for verification network.

##### `stopPeerDiscovery(): Promise<void>`
Stop mesh peer discovery.

##### `getDiscoveredPeers(): MeshPeer[]`
Get list of discovered mesh peers.

##### `getRelayerNodes(): RelayerNode[]`
Get list of available relayer nodes.

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run security audit
npm audit

# Benchmark cryptography
npm run benchmark:crypto
```

## License

This framework is designed for citizen journalism and human rights applications. Use responsibly and in compliance with local laws.

## References

- NIST Post-Quantum Cryptography: https://csrc.nist.gov/projects/post-quantum-cryptography
- Mains-Hum Analysis: Grigoras, C. (2009). "Digital Audio Recording Analysis"
- Tor Project: https://www.torproject.org/
- IPFS Specifications: https://specs.ipfs.io/
- Ring Signatures: Rivest, Shamir, Tauman (2001)
