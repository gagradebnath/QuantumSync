/**
 * @fileoverview Core type definitions for the Mesh Media Sharing Framework
 * @module types
 * @description Provides comprehensive TypeScript interfaces and types for all
 * components of the privacy-preserving mesh media sharing system.
 */

/**
 * Represents a media item stored in the local database
 */
export interface MediaItem {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** Local file system path to the media file */
  localPath: string;
  
  /** Content identifier from IPFS/Arweave (public, plaintext media) */
  mediaCid: string;
  
  /** SHA3-256 hash of the extracted mains-hum fingerprint */
  fingerprintHash: string;
  
  /** Raw fingerprint vector (binary format) for local comparison */
  fingerprintVector: Uint8Array;
  
  /** IPFS CID pointing to encrypted metadata blob */
  metadataCid: string;
  
  /** Blockchain transaction hash of the published anchor (null if not yet anchored) */
  anchorTx: string | null;
  
  /** Aggregated confidence score [0.0, 1.0] from peer comparisons */
  aggregatedConfidence: number;
  
  /** ISO 8601 timestamp of media creation */
  createdAt: string;
  
  /** Media type (audio/video) */
  mediaType: 'audio' | 'video';
  
  /** File size in bytes */
  fileSize: number;
  
  /** Duration in seconds */
  duration: number;
}

/**
 * Peer-signed confidence report from fingerprint comparison
 */
export interface PeerReport {
  /** UUID of the report */
  id: string;
  
  /** Reference to the media item being verified */
  mediaItemId: string;
  
  /** Ephemeral peer identifier (not linkable across sessions) */
  peerEphemeralId: string;
  
  /** Confidence score [0.0, 1.0] from this peer's comparison */
  confidenceScore: number;
  
  /** Post-quantum signature (Dilithium) over {mediaItemId, fingerprintHash, confidenceScore, timestamp} */
  signature: Uint8Array;
  
  /** Ephemeral public key used for signature verification */
  ephemeralPubKey: Uint8Array;
  
  /** ISO 8601 timestamp of report generation */
  timestamp: string;
  
  /** Peer's network address (IP:port or Bluetooth MAC, anonymized) */
  peerAddress: string;
  
  /** Geographic proximity indicator (near/medium/far) */
  proximityLevel: 'near' | 'medium' | 'far';
}

/**
 * Wrapped encryption keys for authorized recipients
 */
export interface WrappedKey {
  /** Reference to the media item */
  mediaItemId: string;
  
  /** Recipient's post-quantum public key (Kyber) */
  recipientPub: Uint8Array;
  
  /** KEM-wrapped symmetric key blob (Kyber encapsulated key) */
  wrappedKeyBlob: Uint8Array;
  
  /** ISO 8601 timestamp of key wrapping */
  createdAt: string;
  
  /** Key derivation salt (used with KEM shared secret) */
  salt: Uint8Array;
  
  /** Key purpose identifier (metadata_key, media_key, etc.) */
  purpose: 'metadata' | 'media' | 'audit';
}

/**
 * Ephemeral key pairs for anonymous operations
 */
export interface EphemeralKey {
  /** UUID of the key pair */
  id: string;
  
  /** Ephemeral public key (Kyber or Dilithium) */
  publicKey: Uint8Array;
  
  /** Encrypted private key (encrypted with device master key) */
  encryptedPrivateKey: Uint8Array;
  
  /** Key type identifier */
  keyType: 'kyber' | 'dilithium' | 'x25519';
  
  /** ISO 8601 timestamp of key generation */
  createdAt: string;
  
  /** ISO 8601 timestamp of key expiration */
  expiresAt: string;
  
  /** Key usage purpose */
  purpose: 'signing' | 'encryption' | 'ring_signature';
  
  /** Ring signature group identifier (if applicable) */
  ringGroupId?: string;
}

/**
 * Metadata object stored encrypted on IPFS
 */
export interface MediaMetadata {
  /** Reference to public media CID */
  mediaCid: string;
  
  /** Fingerprint hash */
  fingerprintHash: string;
  
  /** ISO 8601 timestamp */
  timestamp: string;
  
  /** Optional wrapped media key (if media needs controlled access) */
  wrappedMediaKeys?: WrappedKey[];
  
  /** Uploader annotations (encrypted) */
  uploaderAnnotations: {
    description?: string;
    tags?: string[];
    location?: string; // Obfuscated/generalized
    customMetadata?: Record<string, any>;
  };
  
  /** Aggregated confidence summary */
  confidenceSummary: {
    aggregatedScore: number;
    peerCount: number;
    consensusLevel: 'high' | 'medium' | 'low';
    outlierCount: number;
  };
  
  /** Audit trail (encrypted) */
  auditTrail: {
    captureDevice: string; // Device fingerprint (hashed)
    captureTimestamp: string;
    softwareVersion: string;
    verificationRounds: number;
  };
}

/**
 * Blockchain anchor payload (minimal on-chain footprint)
 */
export interface BlockchainAnchor {
  /** Public media CID */
  mediaCid: string;
  
  /** Fingerprint hash (SHA3-256 hex) */
  fingerprintHash: string;
  
  /** Encrypted metadata CID */
  metadataCid: string;
  
  /** ISO 8601 timestamp */
  timestamp: string;
  
  /** Ephemeral verification blob (ring signature or ephemeral pubkey proof) */
  ephemeralVerificationBlob: string; // Base64-encoded
  
  /** Schema version for future compatibility */
  version: string;
}

/**
 * Fingerprint extraction configuration
 */
export interface FingerprintConfig {
  /** Sample rate in Hz */
  sampleRate: number;
  
  /** FFT window size */
  fftWindowSize: number;
  
  /** Hop size for windowing */
  hopSize: number;
  
  /** Bandpass filter lower cutoff (Hz) */
  lowCutoff: number;
  
  /** Bandpass filter upper cutoff (Hz) */
  highCutoff: number;
  
  /** Target frequency (mains hum: 50Hz or 60Hz) */
  targetFrequency: number;
  
  /** Frequency tolerance (Hz) */
  frequencyTolerance: number;
  
  /** Minimum fingerprint duration (seconds) */
  minDuration: number;
}

/**
 * Mesh network peer discovery result
 */
export interface MeshPeer {
  /** Ephemeral peer identifier */
  peerId: string;
  
  /** Peer's public key for secure communication */
  publicKey: Uint8Array;
  
  /** Peer's network address */
  address: string;
  
  /** Transport type */
  transport: 'wifi_direct' | 'webrtc' | 'bluetooth';
  
  /** Signal strength indicator */
  signalStrength: number;
  
  /** Peer capabilities */
  capabilities: {
    fingerprintComparison: boolean;
    relaySupport: boolean;
    storageProvider: boolean;
  };
  
  /** Last seen timestamp */
  lastSeen: string;
}

/**
 * Relayer node information
 */
export interface RelayerNode {
  /** Relayer unique identifier */
  nodeId: string;
  
  /** Relayer onion address (Tor) or mixnet address */
  onionAddress: string;
  
  /** Relayer public key (for encrypted submissions) */
  publicKey: Uint8Array;
  
  /** Supported blockchain networks */
  supportedChains: string[];
  
  /** Relayer reputation score [0.0, 1.0] */
  reputationScore: number;
  
  /** Fee structure */
  feeStructure: {
    baseFeeSatoshis: number;
    perKbFeeSatoshis: number;
  };
  
  /** Relayer uptime percentage */
  uptime: number;
  
  /** Last health check timestamp */
  lastHealthCheck: string;
}

/**
 * Confidence aggregation result
 */
export interface ConfidenceAggregation {
  /** Aggregated confidence score (trimmed mean) */
  aggregatedScore: number;
  
  /** Number of peer reports included */
  reportCount: number;
  
  /** Number of outliers excluded */
  outlierCount: number;
  
  /** Standard deviation of scores */
  standardDeviation: number;
  
  /** Consensus level */
  consensusLevel: 'high' | 'medium' | 'low';
  
  /** Individual peer scores */
  peerScores: Array<{
    peerId: string;
    score: number;
    included: boolean;
  }>;
}

/**
 * Storage provider configuration
 */
export interface StorageConfig {
  /** Provider type */
  provider: 'ipfs' | 'arweave' | 'filecoin';
  
  /** API endpoint */
  endpoint: string;
  
  /** Authentication token (if required) */
  authToken?: string;
  
  /** Default pin duration (IPFS) */
  pinDuration?: number;
  
  /** Arweave wallet JWK (if using Arweave) */
  arweaveWallet?: any;
  
  /** Enable redundant storage across multiple providers */
  redundantStorage: boolean;
}

/**
 * Post-quantum cryptography configuration
 */
export interface PQCryptoConfig {
  /** KEM algorithm (Kyber variant) */
  kemAlgorithm: 'kyber512' | 'kyber768' | 'kyber1024';
  
  /** Signature algorithm (Dilithium variant) */
  signatureAlgorithm: 'dilithium2' | 'dilithium3' | 'dilithium5';
  
  /** AEAD algorithm */
  aeadAlgorithm: 'xchacha20_poly1305' | 'aes256_gcm';
  
  /** Hash function */
  hashFunction: 'sha3_256' | 'sha3_512' | 'blake3';
  
  /** Enable hybrid mode (PQ + classical) */
  hybridMode: boolean;
  
  /** Classical fallback algorithm (if hybrid) */
  classicalFallback?: 'x25519' | 'ed25519';
}

/**
 * Privacy network configuration
 */
export interface PrivacyNetworkConfig {
  /** Privacy network type */
  networkType: 'tor' | 'i2p' | 'nym';
  
  /** SOCKS5 proxy address (for Tor) */
  socksProxy?: string;
  
  /** Number of hops */
  hopCount: number;
  
  /** Enable traffic padding */
  enablePadding: boolean;
  
  /** Enable timing obfuscation */
  enableTimingObfuscation: boolean;
  
  /** Submission delay range (ms) */
  submissionDelayRange: [number, number];
}

/**
 * Error types for the framework
 */
export enum ErrorCode {
  // Cryptography errors
  CRYPTO_ENCRYPTION_FAILED = 'CRYPTO_ENCRYPTION_FAILED',
  CRYPTO_DECRYPTION_FAILED = 'CRYPTO_DECRYPTION_FAILED',
  CRYPTO_SIGNATURE_INVALID = 'CRYPTO_SIGNATURE_INVALID',
  CRYPTO_KEY_GENERATION_FAILED = 'CRYPTO_KEY_GENERATION_FAILED',
  
  // Fingerprint errors
  FINGERPRINT_EXTRACTION_FAILED = 'FINGERPRINT_EXTRACTION_FAILED',
  FINGERPRINT_COMPARISON_FAILED = 'FINGERPRINT_COMPARISON_FAILED',
  FINGERPRINT_INVALID = 'FINGERPRINT_INVALID',
  
  // Storage errors
  STORAGE_UPLOAD_FAILED = 'STORAGE_UPLOAD_FAILED',
  STORAGE_RETRIEVAL_FAILED = 'STORAGE_RETRIEVAL_FAILED',
  STORAGE_PROVIDER_UNAVAILABLE = 'STORAGE_PROVIDER_UNAVAILABLE',
  
  // Blockchain errors
  BLOCKCHAIN_ANCHOR_FAILED = 'BLOCKCHAIN_ANCHOR_FAILED',
  BLOCKCHAIN_TX_TIMEOUT = 'BLOCKCHAIN_TX_TIMEOUT',
  BLOCKCHAIN_INSUFFICIENT_FUNDS = 'BLOCKCHAIN_INSUFFICIENT_FUNDS',
  
  // Mesh network errors
  MESH_PEER_DISCOVERY_FAILED = 'MESH_PEER_DISCOVERY_FAILED',
  MESH_CONNECTION_FAILED = 'MESH_CONNECTION_FAILED',
  MESH_TRANSFER_FAILED = 'MESH_TRANSFER_FAILED',
  
  // Relayer errors
  RELAYER_UNAVAILABLE = 'RELAYER_UNAVAILABLE',
  RELAYER_SUBMISSION_FAILED = 'RELAYER_SUBMISSION_FAILED',
  RELAYER_AUTHENTICATION_FAILED = 'RELAYER_AUTHENTICATION_FAILED',
  
  // Database errors
  DB_INSERT_FAILED = 'DB_INSERT_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_UPDATE_FAILED = 'DB_UPDATE_FAILED',
}

/**
 * Framework error class
 */
export class FrameworkError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FrameworkError';
  }
}
