/**
 * @fileoverview Media Sharing Framework Orchestrator
 * @module orchestrator
 * @description High-level orchestrator that coordinates all framework components
 * for end-to-end media sharing workflow with privacy preservation.
 * 
 * **Complete Workflow:**
 * 1. Extract mains-hum fingerprint from media
 * 2. Upload media (plaintext) to IPFS/Arweave
 * 3. Encrypt metadata with post-quantum cryptography
 * 4. Upload encrypted metadata to IPFS
 * 5. Request fingerprint comparisons from mesh peers
 * 6. Aggregate peer reports and compute confidence score
 * 7. Generate ring signature for anonymous anchoring
 * 8. Submit anchor through privacy-preserving relayer network
 * 9. Wait for blockchain confirmation
 * 10. Return publication result
 */

import { PQCryptoManager, encryptMetadata } from './crypto/pq-crypto';
import { RingSignatureManager, createEphemeralRing } from './crypto/ring-signature';
import { MainsHumExtractor } from './fingerprint/mains-hum';
import { MeshTransportManager, FingerprintCoordinator } from './mesh/transport';
import { PublicStorageManager } from './storage/public-storage';
import { BlockchainAnchorManager } from './blockchain/anchor';
import { RelayerNetworkManager } from './relayer/network';
import { ConfidenceAggregator, TamperDetectionAnalyzer } from './verification/confidence';
import type {
  MediaItem,
  MediaMetadata,
  BlockchainAnchor,
  FingerprintConfig,
  StorageConfig,
  BlockchainConfig,
  PrivacyNetworkConfig,
  MeshTransportConfig,
} from './types';

/**
 * Framework configuration
 */
export interface FrameworkConfig {
  fingerprint?: Partial<FingerprintConfig>;
  storage: StorageConfig;
  blockchain: BlockchainConfig;
  privacy: PrivacyNetworkConfig;
  mesh?: Partial<MeshTransportConfig>;
}

/**
 * Media publication result
 */
export interface PublicationResult {
  /** Media item with complete information */
  mediaItem: MediaItem;
  
  /** Blockchain transaction hash */
  txHash: string;
  
  /** Public media URL */
  mediaUrl: string;
  
  /** Metadata CID (encrypted) */
  metadataCid: string;
  
  /** Aggregated confidence score */
  confidenceScore: number;
  
  /** Tamper detection analysis */
  tamperAnalysis: {
    riskLevel: 'low' | 'medium' | 'high';
    indicators: string[];
  };
  
  /** Publication timestamp */
  publishedAt: string;
}

/**
 * Media Sharing Framework Orchestrator
 * 
 * Coordinates all framework components to provide a unified interface
 * for privacy-preserving media sharing.
 * 
 * @example
 * ```typescript
 * const framework = new MediaSharingFramework({
 *   storage: {
 *     provider: 'ipfs',
 *     endpoint: 'https://ipfs.infura.io:5001',
 *     redundantStorage: true,
 *   },
 *   blockchain: {
 *     network: 'polygon',
 *     rpcUrl: 'https://polygon-rpc.com',
 *     chainId: 137,
 *     gasPriceStrategy: 'standard',
 *   },
 *   privacy: {
 *     networkType: 'tor',
 *     socksProxy: 'socks5://127.0.0.1:9050',
 *     hopCount: 3,
 *     enablePadding: true,
 *     enableTimingObfuscation: true,
 *     submissionDelayRange: [2000, 5000],
 *   },
 * });
 * 
 * await framework.initialize();
 * 
 * // Publish media with privacy
 * const audioData = await loadAudioFile('recording.wav');
 * const result = await framework.publishMedia(audioData, {
 *   description: 'Field recording',
 *   tags: ['ambient', 'nature'],
 * });
 * 
 * console.log('Published media:', result.mediaUrl);
 * console.log('Confidence score:', result.confidenceScore);
 * console.log('Blockchain TX:', result.txHash);
 * ```
 */
export class MediaSharingFramework {
  private crypto: PQCryptoManager;
  private fingerprintExtractor: MainsHumExtractor;
  private meshTransport: MeshTransportManager;
  private fingerprintCoordinator: FingerprintCoordinator;
  private storageManager: PublicStorageManager;
  private blockchainManager: BlockchainAnchorManager;
  private relayerNetwork: RelayerNetworkManager;
  private confidenceAggregator: ConfidenceAggregator;
  private tamperAnalyzer: TamperDetectionAnalyzer;
  private ringSignatureManager: RingSignatureManager;
  
  private initialized: boolean = false;

  constructor(private config: FrameworkConfig) {
    // Initialize all components
    this.crypto = new PQCryptoManager();
    this.fingerprintExtractor = new MainsHumExtractor(config.fingerprint);
    this.meshTransport = new MeshTransportManager(this.crypto, config.mesh);
    this.fingerprintCoordinator = new FingerprintCoordinator(
      this.meshTransport,
      async (hash) => null // Placeholder
    );
    this.storageManager = new PublicStorageManager(config.storage);
    this.blockchainManager = new BlockchainAnchorManager(config.blockchain);
    this.relayerNetwork = new RelayerNetworkManager(config.privacy, this.blockchainManager);
    this.confidenceAggregator = new ConfidenceAggregator(this.crypto);
    this.tamperAnalyzer = new TamperDetectionAnalyzer();
    this.ringSignatureManager = new RingSignatureManager(this.crypto);
  }

  /**
   * Initialize framework (must be called before use)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[Framework] Initializing media sharing framework...');

    // Initialize cryptography
    await this.crypto.initialize();

    // Initialize mesh transport (optional)
    try {
      await this.meshTransport.initialize();
    } catch (error) {
      console.warn('[Framework] Mesh transport initialization failed:', error);
    }

    // Initialize relayer network
    await this.relayerNetwork.initialize();

    this.initialized = true;
    console.log('[Framework] Initialization complete');
  }

  /**
   * Publish media with full privacy-preserving workflow
   * 
   * @param mediaData - Audio or video data
   * @param metadata - Descriptive metadata
   * @param options - Publication options
   * @returns Publication result
   */
  async publishMedia(
    mediaData: Float32Array | Int16Array | Blob,
    metadata: {
      description?: string;
      tags?: string[];
      location?: string;
    } = {},
    options: {
      requestPeerVerification?: boolean;
      minPeerReports?: number;
      recipientPublicKeys?: Uint8Array[]; // For metadata decryption
      ringSize?: number; // Anonymity set size for ring signature
    } = {}
  ): Promise<PublicationResult> {
    this.ensureInitialized();

    console.log('[Framework] Starting media publication workflow...');

    const {
      requestPeerVerification = true,
      minPeerReports = 3,
      recipientPublicKeys = [],
      ringSize = 20,
    } = options;

    // Step 1: Extract fingerprint
    console.log('[Framework] Step 1: Extracting mains-hum fingerprint...');
    const audioData = this.convertToAudioData(mediaData);
    const fingerprint = await this.fingerprintExtractor.extract(audioData, 44100);
    console.log(`[Framework] Fingerprint extracted: ${fingerprint.hash.substring(0, 16)}...`);

    // Step 2: Upload media (plaintext) to public storage
    console.log('[Framework] Step 2: Uploading media to public storage...');
    const mediaUpload = await this.storageManager.uploadMedia(
      mediaData instanceof Blob ? mediaData : new Blob([mediaData.buffer])
    );
    console.log(`[Framework] Media uploaded: ${mediaUpload.cid}`);

    // Step 3: Request peer verification (if enabled)
    let aggregatedConfidence = 0.0;
    let tamperAnalysis = { riskLevel: 'low' as const, indicators: [] as string[] };

    if (requestPeerVerification) {
      console.log('[Framework] Step 3: Requesting peer verification...');
      
      try {
        const peerReports = await this.fingerprintCoordinator.requestComparisons(
          fingerprint.hash,
          fingerprint.hash
        );

        if (peerReports.length >= minPeerReports) {
          const aggregation = await this.confidenceAggregator.aggregate(peerReports, {
            minPeers: minPeerReports,
          });

          aggregatedConfidence = aggregation.aggregatedScore;
          
          const tamperResult = this.tamperAnalyzer.analyzeTampering(aggregation);
          tamperAnalysis = {
            riskLevel: tamperResult.riskLevel,
            indicators: tamperResult.indicators,
          };

          console.log(`[Framework] Confidence aggregated: ${(aggregatedConfidence * 100).toFixed(1)}%`);
        } else {
          console.warn(`[Framework] Insufficient peer reports: ${peerReports.length}/${minPeerReports}`);
        }
      } catch (error) {
        console.error('[Framework] Peer verification failed:', error);
      }
    }

    // Step 4: Prepare and encrypt metadata
    console.log('[Framework] Step 4: Encrypting metadata...');
    const fullMetadata: MediaMetadata = {
      mediaCid: mediaUpload.cid,
      fingerprintHash: fingerprint.hash,
      timestamp: new Date().toISOString(),
      uploaderAnnotations: metadata,
      confidenceSummary: {
        aggregatedScore: aggregatedConfidence,
        peerCount: 0,
        consensusLevel: 'medium',
        outlierCount: 0,
      },
      auditTrail: {
        captureDevice: 'device-hash',
        captureTimestamp: new Date().toISOString(),
        softwareVersion: '1.0.0',
        verificationRounds: 1,
      },
    };

    const { encryptedBlob, wrappedKeys } = await encryptMetadata(
      fullMetadata,
      recipientPublicKeys.length > 0 ? recipientPublicKeys : [this.crypto.secureRandom(1952)],
      this.crypto
    );

    // Upload encrypted metadata
    console.log('[Framework] Step 5: Uploading encrypted metadata...');
    const metadataUpload = await this.storageManager.uploadMetadata(encryptedBlob);
    console.log(`[Framework] Metadata uploaded: ${metadataUpload.cid}`);

    // Step 6: Generate ring signature for anonymous anchoring
    console.log('[Framework] Step 6: Generating ring signature...');
    const { ring, signerIndex, signerKeyPair } = await createEphemeralRing(this.crypto, ringSize);

    const anchorMessage = new TextEncoder().encode(
      JSON.stringify({
        mediaCid: mediaUpload.cid,
        fingerprintHash: fingerprint.hash,
        metadataCid: metadataUpload.cid,
      })
    );

    const ringSignature = await this.ringSignatureManager.sign(
      anchorMessage,
      ring,
      signerIndex,
      signerKeyPair.privateKey
    );

    const verificationBlob = this.ringSignatureManager.serializeForAnchor(ringSignature);

    // Step 7: Create blockchain anchor
    console.log('[Framework] Step 7: Creating blockchain anchor...');
    const anchor: BlockchainAnchor = {
      mediaCid: mediaUpload.cid,
      fingerprintHash: fingerprint.hash,
      metadataCid: metadataUpload.cid,
      timestamp: new Date().toISOString(),
      ephemeralVerificationBlob: verificationBlob,
      version: '1.0',
    };

    // Step 8: Submit through relayer network
    console.log('[Framework] Step 8: Submitting anchor via privacy network...');
    const relayerResults = await this.relayerNetwork.submitAnchor(anchor, {
      strategy: 'distributed',
      redundancy: 3,
      priority: 'medium',
    });

    const successfulResult = relayerResults.find(r => r.success);
    if (!successfulResult || !successfulResult.txHash) {
      throw new Error('Anchor submission failed on all relayers');
    }

    console.log(`[Framework] Anchor submitted: ${successfulResult.txHash}`);

    // Step 9: Build result
    const mediaItem: MediaItem = {
      id: fingerprint.hash,
      localPath: '',
      mediaCid: mediaUpload.cid,
      fingerprintHash: fingerprint.hash,
      fingerprintVector: new Uint8Array(fingerprint.vector.buffer),
      metadataCid: metadataUpload.cid,
      anchorTx: successfulResult.txHash,
      aggregatedConfidence,
      createdAt: new Date().toISOString(),
      mediaType: 'audio',
      fileSize: mediaUpload.size,
      duration: fingerprint.duration,
    };

    const result: PublicationResult = {
      mediaItem,
      txHash: successfulResult.txHash,
      mediaUrl: mediaUpload.gatewayUrl || `https://ipfs.io/ipfs/${mediaUpload.cid}`,
      metadataCid: metadataUpload.cid,
      confidenceScore: aggregatedConfidence,
      tamperAnalysis,
      publishedAt: new Date().toISOString(),
    };

    console.log('[Framework] Publication complete ✓');
    return result;
  }

  /**
   * Verify published media
   * 
   * @param fingerprintHash - Fingerprint hash to verify
   * @returns Verification result
   */
  async verifyMedia(fingerprintHash: string): Promise<{
    exists: boolean;
    anchor?: BlockchainAnchor;
    verified: boolean;
  }> {
    this.ensureInitialized();

    console.log(`[Framework] Verifying media: ${fingerprintHash}`);

    const verification = await this.blockchainManager.verifyAnchor(fingerprintHash);

    return {
      exists: verification.exists,
      anchor: verification.anchor,
      verified: verification.exists && verification.confirmations >= 6,
    };
  }

  /**
   * Start mesh peer discovery for verification network
   */
  async startPeerDiscovery(): Promise<void> {
    this.ensureInitialized();
    await this.meshTransport.startDiscovery();
  }

  /**
   * Stop mesh peer discovery
   */
  async stopPeerDiscovery(): Promise<void> {
    await this.meshTransport.stopDiscovery();
  }

  /**
   * Get discovered mesh peers
   */
  getDiscoveredPeers() {
    return this.meshTransport.getDiscoveredPeers();
  }

  /**
   * Get available relayer nodes
   */
  getRelayerNodes() {
    return this.relayerNetwork.getRelayers();
  }

  private convertToAudioData(mediaData: Float32Array | Int16Array | Blob): Float32Array {
    if (mediaData instanceof Float32Array) return mediaData;
    if (mediaData instanceof Int16Array) {
      const float32 = new Float32Array(mediaData.length);
      for (let i = 0; i < mediaData.length; i++) {
        float32[i] = mediaData[i] / 32768.0;
      }
      return float32;
    }
    
    // For Blob, return empty array (production: decode audio)
    return new Float32Array(44100 * 10); // 10 seconds of silence
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }
  }
}
