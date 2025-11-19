# Security Considerations and Best Practices

Comprehensive security guide for deploying, operating, and maintaining the Mesh Media Sharing Framework in high-risk environments. This document provides detailed threat analysis, cryptographic security properties, operational security procedures, and incident response guidelines.

## Understanding the Security Model

The framework employs **defense in depth** - multiple independent security layers that provide protection even if individual components are compromised:

1. **Cryptographic Layer**: Post-quantum encryption and signatures protect data confidentiality and integrity
2. **Anonymity Layer**: Ring signatures and Tor routing hide publisher identity
3. **Network Layer**: Mesh networking and relayers prevent single points of failure
4. **Physical Layer**: Mains-hum fingerprinting provides non-cryptographic verification
5. **Statistical Layer**: Confidence aggregation resists Sybil and poisoning attacks

**Security Philosophy**: The system assumes adversaries will compromise individual components (relayers, peers, storage providers) and is designed to maintain security properties despite these compromises.

## Threat Model

### Adversary Capabilities and Defenses

This section analyzes different adversary types, their capabilities, limitations, and how the framework defends against them.

### Adversaries

1. **Passive Observer (Network Surveillance)**
   
   **Capabilities**:
   - Monitor all network traffic at ISP or backbone level
   - Record packet metadata: source/destination IPs, timestamps, sizes
   - Perform statistical traffic analysis
   - Correlate traffic patterns across time
   - Cannot decrypt TLS/Tor encrypted traffic
   - Cannot determine content of encrypted messages
   
   **Attack Scenarios**:
   - Identify that device A connected to Tor at time T
   - Observe that blockchain transaction occurred shortly after
   - Attempt correlation attack: "A probably published media X"
   
   **Framework Defenses**:
   - **Tor Integration**: All relayer submissions go through Tor, hiding source IP
   - **Timing Obfuscation**: Random delays (2-8 seconds default) between actions prevent precise timing correlation
   - **Traffic Padding**: Messages padded to uniform sizes hide content length
   - **Circuit Isolation**: Each submission uses fresh Tor circuit
   - **Result**: Observer sees Tor traffic but cannot determine what was submitted or correlate to specific publications

2. **Active Network Attacker (Man-in-the-Middle)**
   
   **Capabilities**:
   - Intercept and modify network traffic
   - Inject malicious packets
   - Impersonate servers
   - Perform SSL stripping attacks
   - Deploy malicious Tor exit nodes
   - Cannot break post-quantum cryptography
   - Cannot forge signatures without private keys
   
   **Attack Scenarios**:
   - Intercept IPFS uploads and serve modified content
   - MITM blockchain RPC calls to show fake confirmations
   - Compromise Tor exit node to observe unencrypted traffic
   
   **Framework Defenses**:
   - **End-to-End Encryption**: Media metadata encrypted before leaving device
   - **Content Addressing**: IPFS/Arweave use content-addressed storage (CID = hash of content)
   - **Blockchain Verification**: Multiple RPC endpoints with cross-validation
   - **Certificate Pinning**: Mesh connections use pinned certificates
   - **Authenticated Encryption**: XChaCha20-Poly1305 detects tampering
   - **Result**: Attacker cannot modify content undetected or forge valid signatures

3. **Malicious Peer (Sybil Attacker)**
   - Can submit false confidence reports
   - Detected by outlier detection
   - Cannot compromise other peers' data

4. **Blockchain Analyst**
   - Can analyze on-chain transactions
   - Cannot link anchor to real-world identity (ring signatures)
   - Cannot link multiple anchors to same user (relayer rotation)

5. **Quantum Adversary**
   - Has access to quantum computer
   - Cannot break Kyber/Dilithium (post-quantum resistant)
   - Classical algorithms (X25519) vulnerable only in hybrid fallback mode

### Assets to Protect

1. **Uploader Identity** - Protected by Tor + ring signatures
2. **Metadata Confidentiality** - Protected by Kyber KEM + XChaCha20
3. **Media Authenticity** - Protected by mains-hum fingerprinting
4. **Peer Privacy** - Protected by ephemeral keys
5. **Financial Privacy** - Protected by relayer funding rotation

## Cryptographic Security

### Post-Quantum Key Sizes

**NIST Security Levels:**
- Level 1 (Kyber512): ~128-bit classical security
- Level 3 (Kyber768, Dilithium3): ~192-bit classical security
- Level 5 (Kyber1024, Dilithium5): ~256-bit classical security

**Recommendations:**
- Use **Kyber768** (Level 3) for production - balanced security/performance
- Use **Dilithium3** (Level 3) for signatures
- Enable hybrid mode for backward compatibility

### Key Management

#### Ephemeral Keys
```typescript
// Generate ephemeral key pair for one-time use
const ephemeralKey = await crypto.generateSignatureKeyPair('dilithium3');

// Use for signing
const signature = await crypto.sign(message, ephemeralKey.privateKey, ephemeralKey.publicKey);

// IMMEDIATELY discard private key after use
// Do NOT store ephemeral private keys
```

#### Device Master Key
```typescript
// Derive device-specific master key from secure hardware
const masterKey = await deriveFromSecureEnclave();

// Use to encrypt stored private keys
const encryptedPrivateKey = await crypto.encryptAEAD(
  privateKey,
  masterKey
);
```

#### Key Rotation
```typescript
// Rotate ephemeral keys frequently (every submission)
// Rotate mesh peer keys daily
// Rotate relayer funding keys after N transactions

const KEY_ROTATION_POLICY = {
  ephemeralKeys: 'per-submission',
  meshPeerKeys: '24-hours',
  fundingKeys: 'per-100-tx',
};
```

### Encryption Best Practices

#### Metadata Encryption
```typescript
// Always encrypt metadata with recipient-specific keys
const recipientKeys = await getAuthorizedRecipientKeys();

// Use Kyber KEM for key wrapping
const { encryptedBlob, wrappedKeys } = await encryptMetadata(
  metadata,
  recipientKeys,
  crypto
);

// Store wrapped keys separately
await db.storeWrappedKeys(mediaId, wrappedKeys);
```

#### Secure Random Number Generation
```typescript
// ALWAYS use cryptographically secure RNG
const nonce = crypto.secureRandom(24); // XChaCha20 nonce

// NEVER use Math.random() for cryptographic operations
```

## Anonymity and Privacy

### Tor Configuration

#### Recommended torrc Settings
```
# Use entry guards for consistency
UseEntryGuards 1
NumEntryGuards 3

# Enable circuit isolation
IsolateClientProtocol 1
IsolateDestAddr 1

# Disable dangerous features
WarnUnsafeSocks 1
SafeSocks 1

# Connection settings
AvoidDiskWrites 1
FetchDirInfoEarly 1
FetchDirInfoExtraEarly 1
```

#### Circuit Management
```typescript
// Rotate Tor circuit for each relayer submission
await torClient.newCircuit();

// Use separate circuit per relayer
for (const relayer of relayers) {
  await torClient.isolateCircuit();
  await submitToRelayer(relayer, anchor);
}
```

### Traffic Analysis Resistance

#### Timing Obfuscation
```typescript
// Randomize submission delays
const delay = randomUniform(5000, 15000); // 5-15 seconds
await sleep(delay);

// Add cover traffic (dummy submissions)
if (Math.random() < 0.1) {
  await submitDummyAnchor(); // 10% dummy traffic
}
```

#### Packet Padding
```typescript
// Pad messages to fixed sizes
const PACKET_SIZES = [512, 1024, 2048, 4096];
const targetSize = PACKET_SIZES[Math.floor(Math.random() * PACKET_SIZES.length)];

const paddedMessage = padMessage(message, targetSize);
```

### Metadata Minimization

```typescript
// DO NOT include precise location
metadata.location = 'North America'; // Generalized region

// DO NOT include precise timestamps
metadata.timestamp = roundToHour(Date.now()); // Round to hour

// DO NOT include device identifiers
// Use hashed device fingerprint instead
metadata.device = sha3(deviceInfo);

// DO NOT include personal information
// All PII should be excluded or encrypted
```

## Peer Network Security

### Peer Authentication

```typescript
// Verify peer signatures before accepting reports
const isValid = await crypto.verify(
  report.message,
  report.signature,
  report.ephemeralPubKey
);

if (!isValid) {
  console.warn('Invalid peer signature - rejecting report');
  return;
}
```

### Sybil Attack Mitigation

```typescript
// Limit reports per peer per media item
const MAX_REPORTS_PER_PEER = 1;

// Detect duplicate peer IDs
const seenPeers = new Set();
for (const report of reports) {
  if (seenPeers.has(report.peerEphemeralId)) {
    console.warn('Duplicate peer detected - possible Sybil attack');
    continue;
  }
  seenPeers.add(report.peerEphemeralId);
}

// Use proximity information (BLE/Wi-Fi signal strength)
// Peers must be physically nearby
if (report.proximityLevel === 'far') {
  console.warn('Peer too distant - suspicious');
}
```

### Outlier Detection

```typescript
// Use statistical methods to detect malicious reports
const aggregation = await confidenceAggregator.aggregate(reports, {
  outlierThreshold: 2.0, // 2 standard deviations
  minPeers: 5,
});

console.log(`Excluded ${aggregation.outlierCount} outliers`);
```

## Blockchain Security

### Smart Contract Auditing

```solidity
// Use minimal smart contract surface
// Avoid complex logic that could have vulnerabilities

contract AnchorRegistry {
  // Read-only function - no state changes
  function verifyAnchor(bytes32 hash) external view returns (bool) {
    return anchors[hash].exists;
  }
  
  // Simple write function with access control
  function publishAnchor(
    bytes32 hash,
    string calldata mediaCid,
    string calldata metadataCid,
    bytes calldata verificationBlob
  ) external onlyRelayer {
    require(!anchors[hash].exists, "Already exists");
    // ... store anchor
  }
}
```

### Gas Management

```typescript
// Estimate gas before submitting
const estimatedGas = await blockchainManager.estimateGas(anchor);
const gasPrice = await blockchainManager.getGasPrice();

const totalCost = BigInt(estimatedGas) * gasPrice;

if (totalCost > maxAcceptableCost) {
  console.warn('Gas cost too high - waiting for lower prices');
  await waitForLowerGas();
}
```

### Transaction Monitoring

```typescript
// Monitor for transaction replacement attacks
const txHash = await publishAnchor(anchor);

// Wait for confirmations
const confirmations = await waitForConfirmations(txHash, 6);

if (!confirmations.success) {
  console.error('Transaction failed or replaced');
  // Retry with higher gas price
}
```

## Operational Security

### Key Storage

#### Browser Environment
```typescript
// Use IndexedDB with encryption
const masterKey = await deriveFromPassword(userPassword);
const encryptedKey = await crypto.encryptAEAD(privateKey, masterKey);

await indexedDB.store('keys', encryptedKey);
```

#### Mobile Environment
```typescript
// Use secure enclave / keychain
// iOS: Keychain Services
// Android: Android Keystore

const keychain = new SecureKeychain();
await keychain.store('master_key', privateKey, {
  accessible: KeychainAccessible.WhenUnlockedThisDeviceOnly,
  biometry: true,
});
```

### Secure Communication

```typescript
// Always use TLS for non-Tor connections
const httpsAgent = new https.Agent({
  rejectUnauthorized: true,
  minVersion: 'TLSv1.3',
});

// Verify certificate pins
const expectedFingerprint = 'sha256/...';
const certFingerprint = getCertificateFingerprint(response);

if (certFingerprint !== expectedFingerprint) {
  throw new Error('Certificate pinning failed');
}
```

### Logging and Monitoring

```typescript
// NEVER log sensitive data
// DO NOT log:
// - Private keys
// - Plaintext metadata
// - User identifiers
// - Precise locations
// - Timestamps with millisecond precision

// Safe logging:
console.log('[Framework] Anchor published:', txHash);
console.log('[Framework] Confidence score:', score.toFixed(2));

// Sanitize logs before writing to disk
const sanitizedLog = removeSensitiveData(logMessage);
```

## Incident Response

### Key Compromise

```typescript
// If private key is compromised:

// 1. Revoke ephemeral key
await db.revokeEphemeralKey(keyId);

// 2. Rotate all related keys
await rotateAllKeys();

// 3. Re-encrypt affected metadata
await reencryptMetadata(affectedMediaIds);

// 4. Notify recipients (if possible)
await notifyRecipients(affectedMediaIds);
```

### Peer Network Attack

```typescript
// If Sybil attack detected:

// 1. Blacklist malicious peers
await db.blacklistPeer(peerId);

// 2. Increase outlier detection threshold
confidenceAggregator.setOutlierThreshold(3.0);

// 3. Require more peer reports
confidenceAggregator.setMinPeers(10);
```

### Relayer Compromise

```typescript
// If relayer is compromised:

// 1. Remove from pool
await relayerNetwork.removeRelayer(relayerId);

// 2. Re-submit through different relayers
await resubmitAnchor(anchor, { excludeRelayers: [relayerId] });

// 3. Monitor for double-spending
await monitorBlockchain(fingerprintHash);
```

## Security Checklist

- [ ] Use Kyber768 + Dilithium3 (NIST Level 3) minimum
- [ ] Enable Tor for all relayer submissions
- [ ] Generate ephemeral keys per submission
- [ ] Verify all peer signatures before aggregation
- [ ] Use outlier detection (z-score ≥ 2.0)
- [ ] Encrypt metadata with recipient-specific keys
- [ ] Store media in plaintext (public viewable)
- [ ] Use ring signatures (ring size ≥ 20)
- [ ] Rotate relayer funding accounts
- [ ] Apply timing obfuscation (5-15s delays)
- [ ] Minimize metadata (no PII, generalized location)
- [ ] Use secure key storage (enclave/keychain)
- [ ] Wait for 6+ blockchain confirmations
- [ ] Monitor for transaction replacement
- [ ] Sanitize logs (no private keys, no PII)

## Security Audit

Before production deployment:

1. **Code Review**: External security audit of cryptographic implementations
2. **Penetration Testing**: Test anonymity measures against real attackers
3. **Formal Verification**: Verify critical crypto operations (if feasible)
4. **Dependency Audit**: Check all dependencies for vulnerabilities
5. **Threat Modeling**: Update threat model based on deployment environment

## Resources

- NIST PQC: https://csrc.nist.gov/projects/post-quantum-cryptography
- Tor Security: https://support.torproject.org/
- Blockchain Security: https://consensys.github.io/smart-contract-best-practices/
- Key Management: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf
