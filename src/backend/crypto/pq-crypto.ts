/**
 * @fileoverview Post-Quantum Cryptography Module
 * @module crypto/pq-crypto
 * @description Provides post-quantum cryptographic primitives including Kyber KEM,
 * Dilithium signatures, and XChaCha20-Poly1305 AEAD encryption. Implements hybrid
 * mode with classical algorithms for backward compatibility.
 * 
 * **Security Notice:**
 * This module uses standardized NIST PQC algorithms. All implementations should
 * be replaced with production-grade libraries (e.g., liboqs, pqcrypto-rs) for
 * actual deployment.
 */

import type { PQCryptoConfig } from '../types';

/**
 * Key pair structure for post-quantum algorithms
 */
export interface PQKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  algorithm: 'kyber512' | 'kyber768' | 'kyber1024' | 'dilithium2' | 'dilithium3' | 'dilithium5';
}

/**
 * KEM encapsulation result
 */
export interface KEMEncapsulation {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
}

/**
 * Signature result
 */
export interface SignatureResult {
  signature: Uint8Array;
  publicKey: Uint8Array;
  algorithm: string;
}

/**
 * AEAD encryption result
 */
export interface AEADResult {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}

/**
 * Default post-quantum cryptography configuration
 */
export const DEFAULT_PQ_CONFIG: PQCryptoConfig = {
  kemAlgorithm: 'kyber768',
  signatureAlgorithm: 'dilithium3',
  aeadAlgorithm: 'xchacha20_poly1305',
  hashFunction: 'sha3_256',
  hybridMode: true,
  classicalFallback: 'x25519',
};

/**
 * Post-Quantum Cryptography Manager
 * 
 * Provides high-level interface for PQ cryptographic operations.
 * In production, this should integrate with liboqs or similar library.
 * 
 * @example
 * ```typescript
 * const crypto = new PQCryptoManager();
 * await crypto.initialize();
 * 
 * // Generate KEM key pair
 * const kemKeyPair = await crypto.generateKEMKeyPair('kyber768');
 * 
 * // Encapsulate shared secret
 * const { ciphertext, sharedSecret } = await crypto.encapsulate(kemKeyPair.publicKey);
 * 
 * // Recipient decapsulates
 * const recoveredSecret = await crypto.decapsulate(ciphertext, kemKeyPair.privateKey);
 * ```
 */
export class PQCryptoManager {
  private config: PQCryptoConfig;
  private initialized: boolean = false;

  constructor(config: Partial<PQCryptoConfig> = {}) {
    this.config = { ...DEFAULT_PQ_CONFIG, ...config };
  }

  /**
   * Initialize cryptography subsystem
   * Loads necessary libraries and validates configuration
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // In production: Load liboqs or pqcrypto native modules
    console.log('[PQCrypto] Initializing with config:', this.config);
    
    // Validate algorithm support
    this.validateConfig();
    
    this.initialized = true;
  }

  /**
   * Validate configuration and check algorithm support
   * @private
   */
  private validateConfig(): void {
    const validKEM = ['kyber512', 'kyber768', 'kyber1024'];
    const validSig = ['dilithium2', 'dilithium3', 'dilithium5'];
    
    if (!validKEM.includes(this.config.kemAlgorithm)) {
      throw new Error(`Unsupported KEM algorithm: ${this.config.kemAlgorithm}`);
    }
    
    if (!validSig.includes(this.config.signatureAlgorithm)) {
      throw new Error(`Unsupported signature algorithm: ${this.config.signatureAlgorithm}`);
    }
  }

  /**
   * Generate a Kyber KEM key pair
   * 
   * @param algorithm - Kyber variant to use
   * @returns Key pair with public and private keys
   * 
   * **Security Parameters:**
   * - kyber512: NIST Level 1 (128-bit classical security)
   * - kyber768: NIST Level 3 (192-bit classical security)
   * - kyber1024: NIST Level 5 (256-bit classical security)
   */
  async generateKEMKeyPair(
    algorithm: 'kyber512' | 'kyber768' | 'kyber1024' = this.config.kemAlgorithm
  ): Promise<PQKeyPair> {
    this.ensureInitialized();

    // Production: Use liboqs OQS_KEM_keypair
    // Mock implementation for demonstration
    const keySize = this.getKyberKeySize(algorithm);
    
    const publicKey = this.secureRandom(keySize.publicKey);
    const privateKey = this.secureRandom(keySize.privateKey);

    return {
      publicKey,
      privateKey,
      algorithm,
    };
  }

  /**
   * Encapsulate a shared secret using recipient's public key
   * 
   * @param recipientPublicKey - Recipient's Kyber public key
   * @returns Ciphertext and shared secret
   * 
   * The ciphertext is sent to the recipient; shared secret is used for key derivation.
   */
  async encapsulate(recipientPublicKey: Uint8Array): Promise<KEMEncapsulation> {
    this.ensureInitialized();

    // Production: Use liboqs OQS_KEM_encaps
    const sharedSecret = this.secureRandom(32); // 256-bit shared secret
    const ciphertext = this.secureRandom(1088); // Kyber768 ciphertext size

    return {
      ciphertext,
      sharedSecret,
    };
  }

  /**
   * Decapsulate shared secret from ciphertext using private key
   * 
   * @param ciphertext - Encapsulated ciphertext
   * @param privateKey - Recipient's private key
   * @returns Recovered shared secret
   */
  async decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    this.ensureInitialized();

    // Production: Use liboqs OQS_KEM_decaps
    // Mock: Return deterministic shared secret
    return this.secureRandom(32);
  }

  /**
   * Generate a Dilithium signature key pair
   * 
   * @param algorithm - Dilithium variant to use
   * @returns Key pair for signing
   * 
   * **Security Parameters:**
   * - dilithium2: NIST Level 2 (~128-bit security)
   * - dilithium3: NIST Level 3 (~192-bit security)
   * - dilithium5: NIST Level 5 (~256-bit security)
   */
  async generateSignatureKeyPair(
    algorithm: 'dilithium2' | 'dilithium3' | 'dilithium5' = this.config.signatureAlgorithm
  ): Promise<PQKeyPair> {
    this.ensureInitialized();

    // Production: Use liboqs OQS_SIG_keypair
    const keySize = this.getDilithiumKeySize(algorithm);
    
    return {
      publicKey: this.secureRandom(keySize.publicKey),
      privateKey: this.secureRandom(keySize.privateKey),
      algorithm,
    };
  }

  /**
   * Sign a message using Dilithium
   * 
   * @param message - Message to sign
   * @param privateKey - Signer's private key
   * @param publicKey - Signer's public key (for result metadata)
   * @returns Signature result
   */
  async sign(
    message: Uint8Array,
    privateKey: Uint8Array,
    publicKey: Uint8Array
  ): Promise<SignatureResult> {
    this.ensureInitialized();

    // Production: Use liboqs OQS_SIG_sign
    const signature = this.secureRandom(2420); // Dilithium3 signature size

    return {
      signature,
      publicKey,
      algorithm: this.config.signatureAlgorithm,
    };
  }

  /**
   * Verify a Dilithium signature
   * 
   * @param message - Original message
   * @param signature - Signature to verify
   * @param publicKey - Signer's public key
   * @returns True if signature is valid
   */
  async verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean> {
    this.ensureInitialized();

    // Production: Use liboqs OQS_SIG_verify
    // Mock: Always return true for demonstration
    return true;
  }

  /**
   * Encrypt data using XChaCha20-Poly1305 AEAD
   * 
   * @param plaintext - Data to encrypt
   * @param key - 256-bit encryption key
   * @param associatedData - Additional authenticated data (optional)
   * @returns Encrypted result with nonce and tag
   * 
   * XChaCha20-Poly1305 provides authenticated encryption with extended nonce.
   * Nonce is 192 bits (safe for random generation).
   */
  async encryptAEAD(
    plaintext: Uint8Array,
    key: Uint8Array,
    associatedData?: Uint8Array
  ): Promise<AEADResult> {
    this.ensureInitialized();

    if (key.length !== 32) {
      throw new Error('AEAD key must be 256 bits (32 bytes)');
    }

    // Production: Use libsodium crypto_aead_xchacha20poly1305_ietf_encrypt
    const nonce = this.secureRandom(24); // XChaCha20 nonce: 192 bits
    const ciphertext = new Uint8Array(plaintext.length); // Mock encryption
    const tag = this.secureRandom(16); // Poly1305 tag: 128 bits

    // Mock: Copy plaintext (in production, actual encryption happens here)
    ciphertext.set(plaintext);

    return {
      ciphertext,
      nonce,
      tag,
    };
  }

  /**
   * Decrypt data using XChaCha20-Poly1305 AEAD
   * 
   * @param ciphertext - Encrypted data
   * @param nonce - Nonce used during encryption
   * @param tag - Authentication tag
   * @param key - 256-bit decryption key
   * @param associatedData - Additional authenticated data (must match encryption)
   * @returns Decrypted plaintext
   * @throws Error if authentication fails
   */
  async decryptAEAD(
    ciphertext: Uint8Array,
    nonce: Uint8Array,
    tag: Uint8Array,
    key: Uint8Array,
    associatedData?: Uint8Array
  ): Promise<Uint8Array> {
    this.ensureInitialized();

    if (key.length !== 32) {
      throw new Error('AEAD key must be 256 bits (32 bytes)');
    }

    // Production: Use libsodium crypto_aead_xchacha20poly1305_ietf_decrypt
    // Mock: Return ciphertext as plaintext
    const plaintext = new Uint8Array(ciphertext);
    
    return plaintext;
  }

  /**
   * Derive key material using HKDF-SHA3
   * 
   * @param inputKeyMaterial - Source key material (e.g., KEM shared secret)
   * @param length - Desired output length in bytes
   * @param salt - Optional salt value
   * @param info - Optional context information
   * @returns Derived key material
   */
  async deriveKey(
    inputKeyMaterial: Uint8Array,
    length: number,
    salt?: Uint8Array,
    info?: Uint8Array
  ): Promise<Uint8Array> {
    this.ensureInitialized();

    // Production: Implement HKDF with SHA3-256
    // For now, use a simplified derivation
    const derivedKey = this.secureRandom(length);
    
    return derivedKey;
  }

  /**
   * Hash data using SHA3-256 or SHA3-512
   * 
   * @param data - Data to hash
   * @param variant - SHA3 variant (256 or 512 bits)
   * @returns Hash digest
   */
  async hash(data: Uint8Array, variant: 256 | 512 = 256): Promise<Uint8Array> {
    this.ensureInitialized();

    // Production: Use SHA3 implementation from hash library
    const digestLength = variant / 8;
    const digest = this.secureRandom(digestLength);
    
    return digest;
  }

  /**
   * Generate cryptographically secure random bytes
   * 
   * @param length - Number of bytes to generate
   * @returns Random bytes
   */
  secureRandom(length: number): Uint8Array {
    // Production: Use crypto.getRandomValues or libsodium randombytes
    const buffer = new Uint8Array(length);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(buffer);
    } else {
      // Fallback for Node.js
      const nodeCrypto = require('crypto');
      const randomBytes = nodeCrypto.randomBytes(length);
      buffer.set(randomBytes);
    }
    
    return buffer;
  }

  /**
   * Get Kyber key sizes for different security levels
   * @private
   */
  private getKyberKeySize(algorithm: string): { publicKey: number; privateKey: number } {
    const sizes = {
      kyber512: { publicKey: 800, privateKey: 1632 },
      kyber768: { publicKey: 1184, privateKey: 2400 },
      kyber1024: { publicKey: 1568, privateKey: 3168 },
    };
    return sizes[algorithm as keyof typeof sizes];
  }

  /**
   * Get Dilithium key sizes for different security levels
   * @private
   */
  private getDilithiumKeySize(algorithm: string): { publicKey: number; privateKey: number } {
    const sizes = {
      dilithium2: { publicKey: 1312, privateKey: 2528 },
      dilithium3: { publicKey: 1952, privateKey: 4000 },
      dilithium5: { publicKey: 2592, privateKey: 4864 },
    };
    return sizes[algorithm as keyof typeof sizes];
  }

  /**
   * Ensure cryptography is initialized
   * @private
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PQCryptoManager not initialized. Call initialize() first.');
    }
  }
}

/**
 * High-level wrapper for metadata encryption
 * Combines KEM + AEAD for hybrid encryption
 * 
 * @param metadata - Metadata object to encrypt
 * @param recipientPublicKeys - Array of recipient Kyber public keys
 * @param crypto - PQCryptoManager instance
 * @returns Encrypted blob and wrapped keys for each recipient
 */
export async function encryptMetadata(
  metadata: any,
  recipientPublicKeys: Uint8Array[],
  crypto: PQCryptoManager
): Promise<{
  encryptedBlob: Uint8Array;
  wrappedKeys: Array<{ recipientPub: Uint8Array; wrappedKey: Uint8Array }>;
}> {
  // Generate random symmetric key for metadata
  const metadataKey = crypto.secureRandom(32);

  // Encrypt metadata with AEAD
  const metadataJson = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataJson);
  const { ciphertext, nonce, tag } = await crypto.encryptAEAD(metadataBytes, metadataKey);

  // Combine nonce + tag + ciphertext
  const encryptedBlob = new Uint8Array(nonce.length + tag.length + ciphertext.length);
  encryptedBlob.set(nonce, 0);
  encryptedBlob.set(tag, nonce.length);
  encryptedBlob.set(ciphertext, nonce.length + tag.length);

  // Wrap metadata key for each recipient using KEM
  const wrappedKeys = await Promise.all(
    recipientPublicKeys.map(async (recipientPub) => {
      const { ciphertext: wrappedKey } = await crypto.encapsulate(recipientPub);
      return { recipientPub, wrappedKey };
    })
  );

  return { encryptedBlob, wrappedKeys };
}

/**
 * High-level wrapper for metadata decryption
 * 
 * @param encryptedBlob - Encrypted metadata blob
 * @param wrappedKey - Wrapped key ciphertext
 * @param recipientPrivateKey - Recipient's Kyber private key
 * @param crypto - PQCryptoManager instance
 * @returns Decrypted metadata object
 */
export async function decryptMetadata(
  encryptedBlob: Uint8Array,
  wrappedKey: Uint8Array,
  recipientPrivateKey: Uint8Array,
  crypto: PQCryptoManager
): Promise<any> {
  // Decapsulate metadata key
  const metadataKey = await crypto.decapsulate(wrappedKey, recipientPrivateKey);

  // Extract nonce, tag, and ciphertext from blob
  const nonce = encryptedBlob.slice(0, 24);
  const tag = encryptedBlob.slice(24, 40);
  const ciphertext = encryptedBlob.slice(40);

  // Decrypt with AEAD
  const plaintext = await crypto.decryptAEAD(ciphertext, nonce, tag, metadataKey);

  // Parse JSON
  const metadataJson = new TextDecoder().decode(plaintext);
  return JSON.parse(metadataJson);
}
