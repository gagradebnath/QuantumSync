# Crypto Module

## Overview

The **Crypto module** handles all cryptographic operations. Think of it as the "lock and key" system that:
- Encrypts sensitive metadata so only authorized people can read it
- Signs data so we know it hasn't been tampered with
- Generates random keys that are mathematically unique

**Analogy**: If your media is a secret letter, crypto is the envelope + wax seal + encryption code.

## What This Module Does

### Core Responsibilities

1. **Encrypt/Decrypt Data** - Use XChaCha20-Poly1305 for authenticated encryption
2. **Generate Keys** - Create cryptographic keys for encryption and signing
3. **Sign Data** - Prove you created/authorized something using digital signatures
4. **Verify Signatures** - Check that a signature is valid and the data wasn't modified
5. **Post-Quantum Crypto** - Use quantum-resistant algorithms (Kyber, Dilithium)

## File Structure

```
crypto/
├── pq-crypto.ts           # Post-quantum cryptography (14.7 KB)
└── ring-signature.ts      # Anonymous ring signatures (11.9 KB)
```

## Module 1: pq-crypto.ts (Post-Quantum Cryptography)

### What It Does

Implements three main cryptographic operations:

#### 1. **Key Encapsulation (Kyber-768)**
- **Purpose**: Generate a shared secret between two parties without sharing passwords
- **Use Case**: You want to send metadata to someone without them knowing your password
- **How it works**:
  - They give you their public key
  - You use it to create an encrypted capsule containing a shared secret
  - Only they can open that capsule (because they have the private key)
  - Now you both have the same secret that nobody else knows

#### 2. **Digital Signatures (Dilithium3)**
- **Purpose**: Prove you created something without revealing your private key
- **Use Case**: Peer reports on the mesh network
- **How it works**:
  - You have a private key (like a signature only you can make)
  - You sign a message, creating a unique signature
  - Others can verify using your public key that YOU signed it
  - If anyone changes the message, the signature becomes invalid

#### 3. **Authenticated Encryption (XChaCha20-Poly1305)**
- **Purpose**: Encrypt data AND check it hasn't been tampered with
- **Use Case**: Encrypting media metadata
- **How it works**:
  - XChaCha20 encrypts the data (scrambles it)
  - Poly1305 creates an authentication tag (proves nobody changed it)
  - If someone modifies the encrypted data, the tag becomes invalid

### Current State

⚠️ **STUB/PLACEHOLDER**: The file defines classes but doesn't implement them:

**What exists** ✅
- `PQCryptoManager` class definition
- Method signatures (names and parameter types)
- JSDoc comments explaining intent

**What's MISSING** ❌
- Actual implementation of all methods
- Integration with Kyber/Dilithium libraries
- Error handling
- Key generation logic
- Encryption/decryption logic
- Signature verification logic

### What Needs to Be Done

#### 1. **Install Cryptography Libraries** (HIGH PRIORITY)

```bash
npm install libsodium-wrappers      # XChaCha20-Poly1305
npm install @noble/post-quantum      # Kyber & Dilithium
npm install @types/libsodium-wrappers  # TypeScript types
```

#### 2. **Implement Kyber Key Encapsulation** (HIGH PRIORITY)

**What it means**: Implement functions to create and use Kyber keys.

**Steps**:
```typescript
// crypto/pq-crypto.ts
import { pqsignature, pqencrypt } from '@noble/post-quantum';

export class PQCryptoManager {
  async generateKEMKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
    // Step 1: Use Kyber library to generate key pair
    const { publicKey, privateKey } = pqencrypt.kyber768.generateKeypair();
    
    // Step 2: Validate keys are correct size
    if (publicKey.length !== 1184) {
      throw new Error('Invalid Kyber public key size');
    }
    if (privateKey.length !== 2400) {
      throw new Error('Invalid Kyber private key size');
    }
    
    // Step 3: Return the keys
    return { publicKey, privateKey };
  }
  
  async encapsulate(publicKey: Uint8Array): Promise<{ ciphertext: Uint8Array; sharedSecret: Uint8Array }> {
    // Step 1: Validate public key
    if (publicKey.length !== 1184) {
      throw new Error('Invalid public key size');
    }
    
    // Step 2: Use Kyber to encapsulate (create shared secret + capsule)
    const { ciphertext, sharedSecret } = pqencrypt.kyber768.encapsulate(publicKey);
    
    // Step 3: Return both the capsule and secret
    return { ciphertext, sharedSecret };
  }
  
  async decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    // Step 1: Validate inputs
    if (ciphertext.length !== 1088) {
      throw new Error('Invalid ciphertext size');
    }
    
    // Step 2: Use Kyber to open the capsule
    const sharedSecret = pqencrypt.kyber768.decapsulate(ciphertext, privateKey);
    
    // Step 3: Return the shared secret
    return sharedSecret;
  }
}
```

#### 3. **Implement Dilithium Signatures** (HIGH PRIORITY)

**What it means**: Implement digital signature generation and verification.

**Steps**:
```typescript
export class PQCryptoManager {
  async generateSignatureKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
    // Generate keys for signing
    const { publicKey, secretKey } = pqsignature.dilithium3.keygen();
    
    return {
      publicKey,
      privateKey: secretKey
    };
  }
  
  async sign(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    // Sign a message with your private key
    const signature = pqsignature.dilithium3.sign(message, privateKey);
    return signature;
  }
  
  async verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    try {
      // Verify signature and return true if valid
      pqsignature.dilithium3.verify(signature, message, publicKey);
      return true;
    } catch {
      return false;
    }
  }
}
```

#### 4. **Implement XChaCha20-Poly1305 Encryption** (HIGH PRIORITY)

**What it means**: Encrypt and decrypt data with authentication.

**Steps**:
```typescript
import { secretbox } from 'libsodium-wrappers';

export class PQCryptoManager {
  async generateAEADKey(): Promise<Uint8Array> {
    // Generate a random 32-byte key
    return secretbox.key_by_seed(crypto.getRandomValues(new Uint8Array(32)));
  }
  
  async encryptAEAD(
    plaintext: Uint8Array,
    key: Uint8Array
  ): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array; tag: Uint8Array }> {
    // Generate random nonce (number used once)
    const nonce = crypto.getRandomValues(new Uint8Array(24)); // 24 bytes for XChaCha20
    
    // Encrypt with nonce and key
    const ciphertext = secretbox(plaintext, nonce, key);
    
    // The tag is included in the ciphertext by libsodium
    return {
      ciphertext,
      nonce,
      tag: new Uint8Array() // libsodium combines them
    };
  }
  
  async decryptAEAD(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    try {
      // Decrypt and verify
      const plaintext = secretbox.open(ciphertext, nonce, key);
      return plaintext;
    } catch (error) {
      throw new Error('Decryption failed - data may be tampered with');
    }
  }
}
```

#### 5. **Implement Metadata Encryption Helpers** (HIGH PRIORITY)

**What it means**: Convenience functions to encrypt/decrypt structured metadata.

**Steps**:
```typescript
export interface MediaMetadata {
  title: string;
  description: string;
  recordedAt: number;
  location: string;
  tags: string[];
}

export class PQCryptoManager {
  async encryptMetadata(
    metadata: MediaMetadata,
    recipients: Uint8Array[] // Array of public keys
  ): Promise<EncryptedMetadata> {
    // Step 1: Convert metadata object to JSON bytes
    const jsonString = JSON.stringify(metadata);
    const plaintext = new TextEncoder().encode(jsonString);
    
    // Step 2: Generate a unique key for this metadata
    const contentKey = await this.generateAEADKey();
    
    // Step 3: Encrypt metadata with the content key
    const { ciphertext, nonce } = await this.encryptAEAD(plaintext, contentKey);
    
    // Step 4: Wrap the content key for each recipient
    const wrappedKeys = [];
    for (const recipientPublicKey of recipients) {
      const { ciphertext: wrapped } = await this.encapsulate(recipientPublicKey);
      wrappedKeys.push(wrapped);
    }
    
    // Step 5: Return the encrypted metadata
    return {
      ciphertext,
      nonce,
      wrappedKeys
    };
  }
  
  async decryptMetadata(
    encrypted: EncryptedMetadata,
    myPrivateKey: Uint8Array,
    wrappedKeyIndex: number
  ): Promise<MediaMetadata> {
    // Step 1: Unwrap the key that was encrypted for me
    const contentKey = await this.decapsulate(
      encrypted.wrappedKeys[wrappedKeyIndex],
      myPrivateKey
    );
    
    // Step 2: Decrypt the metadata
    const plaintext = await this.decryptAEAD(
      encrypted.ciphertext,
      contentKey,
      encrypted.nonce
    );
    
    // Step 3: Parse JSON back to object
    const jsonString = new TextDecoder().decode(plaintext);
    return JSON.parse(jsonString);
  }
}
```

#### 6. **Add Error Handling** (MEDIUM PRIORITY)

```typescript
export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

export class InvalidKeyError extends CryptoError {
  constructor(keyType: string) {
    super(`Invalid ${keyType} key`);
    this.name = 'InvalidKeyError';
  }
}

export class SignatureVerificationError extends CryptoError {
  constructor() {
    super('Signature verification failed');
    this.name = 'SignatureVerificationError';
  }
}

// Use in methods:
async generateKEMKeyPair() {
  try {
    // Generate keys
  } catch (error) {
    throw new CryptoError('Failed to generate KEM keypair: ' + error.message);
  }
}
```

## Module 2: ring-signature.ts (Anonymous Ring Signatures)

### What It Does

Creates signatures where nobody can tell which person in a group signed the message.

**Real-world analogy**: Imagine a group of 20 people passing around a document. One of them signs it with a group pen. Anyone can verify that one of the 20 signed it, but nobody can tell which one.

### Why It's Important

When publishing media, you want:
- The blockchain to know the media is valid
- But NOT know who published it
- NOT to be able to link multiple publications to the same person

### Current State

⚠️ **STUB**: Defines `RingSignatureManager` class but no implementation.

### What Needs to Be Done

#### 1. **Understand Ring Signatures** (HIGH PRIORITY)

Before implementing, understand the concept:

```
Group (Anonymity Set):
┌─────────────┐
│ Person 1 Key│ ← Could be any one
│ Person 2 Key│   of these
│ Person 3 Key│
│ ...         │
│ Person 20 Key│
└─────────────┘
       ↓
   Ring Signature
       ↓
"One of these people signed this message"
(But we can't tell which!)
```

#### 2. **Create Ring Signature Class** (HIGH PRIORITY)

```typescript
// crypto/ring-signature.ts

/**
 * Represents a ring of public keys (anonymity set)
 */
export interface Ring {
  publicKeys: Uint8Array[];      // All keys in the ring
  signerIndex: number;            // Which key is ours (secret)
  signerKeyPair: {               // Our actual key pair
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  };
}

/**
 * A ring signature that proves membership without revealing signer
 */
export interface RingSignature {
  signature: Uint8Array;
  ringPublicKeys: Uint8Array[];  // The ring (for verification)
}

export class RingSignatureManager {
  private crypto: PQCryptoManager;
  
  constructor(cryptoManager: PQCryptoManager) {
    this.crypto = cryptoManager;
  }
  
  /**
   * Create a ring signature
   * 
   * This proves we're in the ring without revealing which key is ours
   */
  async sign(
    message: Uint8Array,
    ring: Ring
  ): Promise<RingSignature> {
    // Step 1: Sign the message with our private key
    const ourSignature = await this.crypto.sign(message, ring.signerKeyPair.privateKey);
    
    // Step 2: Create a "challenge" (hash of message)
    const challenge = await this.crypto.hash(message);
    
    // Step 3: For each key in the ring, compute a response
    // This makes it seem like we could be any key in the ring
    const responses: Uint8Array[] = [];
    
    for (let i = 0; i < ring.publicKeys.length; i++) {
      if (i === ring.signerIndex) {
        // Our key: use the real signature
        responses.push(ourSignature);
      } else {
        // Other keys: generate fake signature that looks valid but isn't
        // (They should verify as invalid but prove we knew the challenge)
        responses.push(await this.crypto.generateRandomBytes(64));
      }
    }
    
    // Step 4: Combine into ring signature
    const combinedSignature = Buffer.concat([
      challenge,
      ...responses
    ]);
    
    return {
      signature: combinedSignature,
      ringPublicKeys: ring.publicKeys
    };
  }
  
  /**
   * Verify a ring signature
   * 
   * Checks that the signer is one of the keys in the ring
   * (But doesn't reveal which key they are)
   */
  async verify(
    message: Uint8Array,
    ringSignature: RingSignature
  ): Promise<boolean> {
    try {
      // Step 1: Extract the challenge and responses
      const challenge = ringSignature.signature.slice(0, 32);
      const responses = [];
      
      for (let i = 0; i < ringSignature.ringPublicKeys.length; i++) {
        const start = 32 + (i * 64);
        const end = start + 64;
        responses.push(ringSignature.signature.slice(start, end));
      }
      
      // Step 2: For each response, verify it could have come from that key
      for (let i = 0; i < responses.length; i++) {
        const isValid = await this.crypto.verify(
          message,
          responses[i],
          ringSignature.ringPublicKeys[i]
        );
        
        // At least one should be valid (the real signer's)
        if (isValid) return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }
}
```

#### 3. **Create Utility Function for Ephemeral Rings** (MEDIUM PRIORITY)

```typescript
/**
 * Create a ring of ephemeral (temporary) keys
 * 
 * This creates a fresh anonymity set each time
 */
export async function createEphemeralRing(
  crypto: PQCryptoManager,
  ringSize: number = 20
): Promise<Ring> {
  // Step 1: Generate our actual key pair
  const ourKeyPair = await crypto.generateSignatureKeyPair();
  
  // Step 2: Generate fake public keys for other ring members
  const otherPublicKeys: Uint8Array[] = [];
  for (let i = 0; i < ringSize - 1; i++) {
    const fakeKeyPair = await crypto.generateSignatureKeyPair();
    otherPublicKeys.push(fakeKeyPair.publicKey);
  }
  
  // Step 3: Shuffle all keys so our position is random
  const allKeys = [ourKeyPair.publicKey, ...otherPublicKeys];
  const shuffled = allKeys.sort(() => Math.random() - 0.5);
  
  // Step 4: Find where our key ended up
  const ourIndex = shuffled.indexOf(ourKeyPair.publicKey);
  
  // Step 5: Return the ring
  return {
    publicKeys: shuffled,
    signerIndex: ourIndex,
    signerKeyPair: ourKeyPair
  };
}
```

## How to Use This Module

### Step 1: Encrypt Metadata

```typescript
// In orchestrator/index.ts
const cryptoManager = new PQCryptoManager();
await cryptoManager.initialize();

const encrypted = await cryptoManager.encryptMetadata(
  {
    title: 'Protest Recording',
    description: 'Evidence of police action',
    recordedAt: Date.now(),
    location: 'Downtown',
    tags: ['evidence', 'public']
  },
  [recipientPublicKey]  // Who can decrypt this
);

console.log('Encrypted metadata CID:', await uploadToIPFS(encrypted));
```

### Step 2: Sign Peer Reports

```typescript
// In mesh/transport.ts (when responding to peer)
const peerReport = {
  mediaItemId: 'abc123',
  similarity: 0.95,
  timestamp: Date.now()
};

const messageBytes = new TextEncoder().encode(JSON.stringify(peerReport));
const signature = await cryptoManager.sign(messageBytes, myKeyPair.privateKey);

// Send signature + message to publishing device
```

### Step 3: Create Ring Signature for Blockchain

```typescript
// In relayer/network.ts (before submitting anchor)
const ring = await createEphemeralRing(cryptoManager, 20);

const anchor = {
  mediaCid: 'QmXxx',
  metadataCid: 'QmYyy',
  fingerprintHash: 'abc123'
};

const anchorBytes = new TextEncoder().encode(JSON.stringify(anchor));
const ringSignature = await ringManager.sign(anchorBytes, ring);

// Submit with ring signature to blockchain
// Blockchain can verify the anchor is valid
// But cannot determine who published it!
```

## Checklist for Completing This Module

- [ ] Install libsodium-wrappers and @noble/post-quantum
- [ ] Implement Kyber key generation
- [ ] Implement Kyber encapsulation/decapsulation
- [ ] Implement Dilithium key generation
- [ ] Implement Dilithium signing and verification
- [ ] Implement XChaCha20-Poly1305 encryption/decryption
- [ ] Add metadata encryption/decryption helpers
- [ ] Add error handling and custom error classes
- [ ] Implement ring signature creation
- [ ] Implement ring signature verification
- [ ] Create ephemeral ring utility function
- [ ] Test with actual encryption/decryption

## Key Takeaways

1. **Cryptography is complex** - Use established libraries, don't invent new algorithms
2. **Keys are precious** - Protect private keys like passwords
3. **Signatures prove authorship** - Without revealing the author (with ring signatures)
4. **Encryption protects privacy** - Both confidentiality (XChaCha20) and integrity (Poly1305)

## Next Steps

1. Install the crypto libraries
2. Implement Kyber key generation first (test it with the crypto library)
3. Implement Dilithium signing/verification
4. Implement XChaCha20 encryption
5. Add ring signatures
6. Test all operations
