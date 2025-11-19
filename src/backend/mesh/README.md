# Mesh Transport Module

## Overview

The **Mesh Transport module** enables direct peer-to-peer communication between devices on a local network. Think of it as creating a "mini-network" where devices can talk to each other without needing the internet.

**Analogy**: If the internet is like calling someone through a telephone exchange, mesh networking is like shouting to your neighbor across a backyard fence.

## What This Module Does

### Core Responsibilities

1. **Peer Discovery** - Find other devices nearby (without central server)
2. **Establish Connections** - Create encrypted channels between peers
3. **Message Exchange** - Send/receive data peer-to-peer
4. **Coordinate Fingerprint Comparison** - Ask peers to compare audio fingerprints
5. **Handle Disconnections** - Gracefully deal with peers going offline

## File Structure

```
mesh/
└── transport.ts          # Multi-protocol networking (17.1 KB)
```

## Supported Protocols

### 1. **WebRTC** (Web Real-Time Communication)
- **Use Case**: Browsers, web apps, cross-platform
- **How it works**: Creates direct connection between two browsers using ICE servers to traverse NAT
- **Latency**: Low (direct peer-to-peer)
- **Reliability**: Good (handles packet loss)

### 2. **Bluetooth LE** (Low Energy)
- **Use Case**: Mobile devices in close proximity
- **How it works**: Uses Bluetooth frequency (2.4 GHz) for short-range communication
- **Range**: ~50 meters
- **Power**: Very efficient (good for mobile)

### 3. **Wi-Fi Direct**
- **Use Case**: Android/iOS devices
- **How it works**: Devices form a local Wi-Fi network without router
- **Range**: ~100 meters
- **Speed**: Fast (Wi-Fi speeds)

## Current State

⚠️ **STUB**: Defines `MeshTransport` class with method signatures but no implementation.

**What exists** ✅
- Class definition
- Interface for peer/transport
- Configuration structure

**What's MISSING** ❌
- WebRTC implementation
- Bluetooth LE implementation
- Wi-Fi Direct implementation
- Peer discovery logic
- Message routing
- Connection management

## What Needs to Be Done

### 1. **Choose Initial Protocol** (HIGH PRIORITY)

**For PoC (Proof of Concept)**: Start with **WebRTC** because:
- Works on all platforms (web, Node.js)
- Most documentation available
- Easiest to test without hardware

**Advanced**: Later add Bluetooth and Wi-Fi Direct.

### 2. **Implement Peer Discovery** (HIGH PRIORITY)

```typescript
// mesh/transport.ts

export interface Peer {
  id: string;                    // Unique identifier
  address: string;               // Network address (IP:port, Bluetooth MAC, etc.)
  transport: 'webrtc' | 'bluetooth' | 'wifi-direct';
  lastSeen: number;              // Timestamp of last communication
  reputation: number;            // Trust score [0.0, 1.0]
  publicKey: Uint8Array;         // For encryption
}

export interface TransportConfig {
  enabledTransports: ('webrtc' | 'bluetooth' | 'wifi-direct')[];
  serviceName: string;           // Service identifier (e.g., 'mesh-media-sync')
  discoveryInterval: number;     // How often to scan for peers (ms)
  maxPeers: number;              // Maximum peers to connect to
}

export class MeshTransport {
  private peers: Map<string, Peer> = new Map();
  private config: TransportConfig;
  private discoveryRunning = false;
  
  constructor(config: TransportConfig) {
    this.config = config;
  }
  
  /**
   * Start searching for peers
   */
  async startDiscovery(): Promise<void> {
    if (this.discoveryRunning) return;
    
    this.discoveryRunning = true;
    
    // Start discovery for each enabled transport
    for (const transport of this.config.enabledTransports) {
      this.startDiscoveryForTransport(transport);
    }
  }
  
  /**
   * Stop searching for peers
   */
  async stopDiscovery(): Promise<void> {
    this.discoveryRunning = false;
  }
  
  /**
   * Start discovery for specific transport type
   */
  private async startDiscoveryForTransport(
    transport: 'webrtc' | 'bluetooth' | 'wifi-direct'
  ): Promise<void> {
    // Run discovery periodically
    setInterval(() => {
      switch (transport) {
        case 'webrtc':
          this.discoverWebRTCPeers();
          break;
        case 'bluetooth':
          this.discoverBluetoothPeers();
          break;
        case 'wifi-direct':
          this.discoverWiFiDirectPeers();
          break;
      }
    }, this.config.discoveryInterval);
  }
  
  /**
   * Discover peers via WebRTC
   */
  private async discoverWebRTCPeers(): Promise<void> {
    // Step 1: Use mDNS (multicast DNS) to announce our service
    console.log('Discovering WebRTC peers via mDNS...');
    
    // This is a placeholder - would use mdns library in reality
    // const browser = mdns.createBrowser(mdns.tcp('mesh-media'));
    // browser.on('serviceUp', (service) => {
    //   const peer = this.createPeerFromMDNS(service);
    //   this.peers.set(peer.id, peer);
    // });
  }
  
  /**
   * Discover peers via Bluetooth LE
   */
  private async discoverBluetoothPeers(): Promise<void> {
    // Step 1: Start Bluetooth scan
    console.log('Discovering Bluetooth LE peers...');
    
    // Placeholder - would use 'noble' or native APIs
    // const devices = await scanBluetooth();
    // for (const device of devices) {
    //   if (device.advertisement.localName.includes('mesh-media')) {
    //     const peer = this.createPeerFromBluetooth(device);
    //     this.peers.set(peer.id, peer);
    //   }
    // }
  }
  
  /**
   * Discover peers via Wi-Fi Direct
   */
  private async discoverWiFiDirectPeers(): Promise<void> {
    // Step 1: Start Wi-Fi Direct discovery
    console.log('Discovering Wi-Fi Direct peers...');
    
    // Placeholder - platform-specific (Android/iOS)
  }
  
  /**
   * Get list of discovered peers
   */
  getDiscoveredPeers(): Peer[] {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    return Array.from(this.peers.values()).filter(peer => {
      // Only include peers seen recently
      return (now - peer.lastSeen) < maxAge;
    });
  }
  
  /**
   * Get specific peer by ID
   */
  getPeer(peerId: string): Peer | null {
    return this.peers.get(peerId) || null;
  }
}
```

### 3. **Implement Connection Management** (HIGH PRIORITY)

```typescript
export interface Connection {
  peerId: string;
  established: boolean;
  transport: 'webrtc' | 'bluetooth' | 'wifi-direct';
  encryptionKey: Uint8Array;    // Shared secret for this connection
  createdAt: number;
}

export class MeshTransport {
  private connections: Map<string, Connection> = new Map();
  
  /**
   * Establish encrypted connection to peer
   */
  async connectToPeer(
    peerId: string,
    crypto: PQCryptoManager
  ): Promise<Connection> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer not found: ${peerId}`);
    }
    
    // Check if already connected
    if (this.connections.has(peerId)) {
      return this.connections.get(peerId)!;
    }
    
    // Step 1: Generate ephemeral keys
    const ourKeyPair = await crypto.generateKEMKeyPair();
    
    // Step 2: Exchange public keys with peer (unencrypted)
    const peerPublicKey = await this.sendKeyExchange(peerId, ourKeyPair.publicKey);
    
    // Step 3: Establish shared secret using Kyber KEM
    const { ciphertext, sharedSecret } = await crypto.encapsulate(peerPublicKey);
    
    // Step 4: Send encapsulated secret to peer
    await this.sendEncapsulated(peerId, ciphertext);
    
    // Step 5: Create connection
    const connection: Connection = {
      peerId,
      established: true,
      transport: peer.transport,
      encryptionKey: sharedSecret,
      createdAt: Date.now()
    };
    
    this.connections.set(peerId, connection);
    return connection;
  }
  
  /**
   * Send encrypted message to peer
   */
  async sendToPeer(
    peerId: string,
    message: Uint8Array,
    crypto: PQCryptoManager
  ): Promise<void> {
    const connection = this.connections.get(peerId);
    if (!connection || !connection.established) {
      throw new Error(`No connection to peer: ${peerId}`);
    }
    
    // Encrypt message with connection key
    const { ciphertext, nonce } = await crypto.encryptAEAD(
      message,
      connection.encryptionKey
    );
    
    // Send encrypted package
    await this.sendEncryptedMessage(peerId, {
      ciphertext,
      nonce,
      timestamp: Date.now()
    });
  }
  
  /**
   * Receive message from peer (stub)
   */
  async receiveToPeer(
    message: EncryptedMessage,
    crypto: PQCryptoManager
  ): Promise<Uint8Array> {
    const peerId = message.senderId;
    const connection = this.connections.get(peerId);
    
    if (!connection) {
      throw new Error(`Unknown peer: ${peerId}`);
    }
    
    // Decrypt message
    const plaintext = await crypto.decryptAEAD(
      message.ciphertext,
      connection.encryptionKey,
      message.nonce
    );
    
    return plaintext;
  }
  
  /**
   * Stubs for actual network operations
   */
  private async sendKeyExchange(peerId: string, publicKey: Uint8Array): Promise<Uint8Array> {
    // TODO: Implement actual network send
    console.log(`Sending key exchange to ${peerId}`);
    return new Uint8Array(32); // Placeholder
  }
  
  private async sendEncapsulated(peerId: string, ciphertext: Uint8Array): Promise<void> {
    // TODO: Implement actual network send
    console.log(`Sending encapsulated secret to ${peerId}`);
  }
  
  private async sendEncryptedMessage(peerId: string, message: any): Promise<void> {
    // TODO: Implement actual network send
    console.log(`Sending encrypted message to ${peerId}`);
  }
}
```

### 4. **Implement Fingerprint Comparison Coordination** (HIGH PRIORITY)

```typescript
export interface FingerprintComparisonRequest {
  mediaItemId: string;
  fingerprint: Fingerprint;
  fromPeerId: string;
  requestId: string;
}

export interface FingerprintComparisonReport {
  requestId: string;
  mediaItemId: string;
  fromPeerId: string;
  comparison: FingerprintComparison;
  signature: Uint8Array;        // Signed by responder
  timestamp: number;
}

export class MeshTransport {
  /**
   * Request fingerprint comparison from a peer
   */
  async requestFingerprintComparison(
    peerId: string,
    fingerprint: Fingerprint,
    mediaItemId: string,
    crypto: PQCryptoManager
  ): Promise<FingerprintComparisonReport> {
    // Step 1: Ensure connected
    let connection = this.connections.get(peerId);
    if (!connection) {
      connection = await this.connectToPeer(peerId, crypto);
    }
    
    // Step 2: Create request
    const request: FingerprintComparisonRequest = {
      mediaItemId,
      fingerprint,
      fromPeerId: this.getOurPeerId(),
      requestId: generateUUID()
    };
    
    // Step 3: Send request
    const requestBytes = new TextEncoder().encode(JSON.stringify(request));
    await this.sendToPeer(peerId, requestBytes, crypto);
    
    // Step 4: Wait for response (with timeout)
    const response = await this.waitForResponse(request.requestId, 30000); // 30 second timeout
    
    return response;
  }
  
  /**
   * Handle incoming fingerprint comparison request
   */
  async handleComparisonRequest(
    request: FingerprintComparisonRequest,
    extractor: MainsHumExtractor,
    crypto: PQCryptoManager
  ): Promise<void> {
    // Step 1: Get our own fingerprint for similar media
    const ourFingerprint = await this.getOurFingerprintForMedia(request.mediaItemId);
    
    if (!ourFingerprint) {
      // We haven't recorded this media - send negative report
      await this.sendComparisonReport(
        request.fromPeerId,
        request.requestId,
        { similarity: 0, confidence: 'low', sameLocation: false },
        crypto
      );
      return;
    }
    
    // Step 2: Compare fingerprints
    const comparison = await extractor.compare(ourFingerprint, request.fingerprint);
    
    // Step 3: Sign the report with our key
    const reportData = {
      requestId: request.requestId,
      mediaItemId: request.mediaItemId,
      comparison,
      timestamp: Date.now()
    };
    
    const reportBytes = new TextEncoder().encode(JSON.stringify(reportData));
    const ourKeyPair = this.getOurKeyPair();
    const signature = await crypto.sign(reportBytes, ourKeyPair.privateKey);
    
    // Step 4: Send report
    await this.sendComparisonReport(request.fromPeerId, request.requestId, comparison, crypto);
  }
  
  /**
   * Stubs for helper functions
   */
  private async waitForResponse(requestId: string, timeoutMs: number): Promise<FingerprintComparisonReport> {
    // TODO: Implement response waiting with event emitter
    throw new Error('Not implemented');
  }
  
  private async getOurFingerprintForMedia(mediaItemId: string): Promise<Fingerprint | null> {
    // TODO: Query local database for fingerprint
    return null;
  }
  
  private async sendComparisonReport(
    peerId: string,
    requestId: string,
    comparison: FingerprintComparison,
    crypto: PQCryptoManager
  ): Promise<void> {
    // TODO: Send report over mesh
  }
  
  private getOurPeerId(): string {
    // TODO: Return this device's peer ID
    return 'self';
  }
  
  private getOurKeyPair() {
    // TODO: Return our stored key pair
    return { privateKey: new Uint8Array(32), publicKey: new Uint8Array(32) };
  }
}
```

### 5. **Add Event Handling** (MEDIUM PRIORITY)

```typescript
export type MeshEvent = 
  | { type: 'peer-discovered'; peer: Peer }
  | { type: 'peer-lost'; peerId: string }
  | { type: 'connection-established'; peerId: string }
  | { type: 'connection-failed'; peerId: string; error: string }
  | { type: 'message-received'; peerId: string; message: Uint8Array }
  | { type: 'comparison-request'; request: FingerprintComparisonRequest };

export class MeshTransport {
  private eventEmitter = new EventEmitter();
  
  /**
   * Listen for mesh events
   */
  on(eventType: MeshEvent['type'], handler: (event: MeshEvent) => void): void {
    this.eventEmitter.on(eventType, handler);
  }
  
  /**
   * Emit event
   */
  private emit(event: MeshEvent): void {
    this.eventEmitter.emit(event.type, event);
  }
}
```

## How to Use This Module

### Step 1: Initialize Mesh

```typescript
// In orchestrator/index.ts
const mesh = new MeshTransport({
  enabledTransports: ['webrtc'],
  serviceName: 'mesh-media-sync',
  discoveryInterval: 5000,  // Check every 5 seconds
  maxPeers: 50
});

// Listen for peer discovery
mesh.on('peer-discovered', (event) => {
  console.log('Found peer:', event.peer.id);
});

// Start discovering peers
await mesh.startDiscovery();
```

### Step 2: Connect to Peer

```typescript
const peers = mesh.getDiscoveredPeers();
if (peers.length > 0) {
  const connection = await mesh.connectToPeer(peers[0].id, crypto);
  console.log('Connected to peer:', peers[0].id);
}
```

### Step 3: Request Fingerprint Comparison

```typescript
const fingerprint = await extractor.extract(audioSamples);

const report = await mesh.requestFingerprintComparison(
  peerId,
  fingerprint,
  mediaItemId,
  crypto
);

console.log('Peer comparison result:', report.comparison.similarity);
```

## Checklist for Completing This Module

- [ ] Implement peer discovery with mDNS for WebRTC
- [ ] Implement connection establishment with key exchange
- [ ] Implement encrypted message sending/receiving
- [ ] Implement fingerprint comparison request/response
- [ ] Add event emitter for mesh events
- [ ] Add error handling for disconnections
- [ ] Test with multiple local devices
- [ ] Implement Bluetooth LE support (optional)
- [ ] Implement Wi-Fi Direct support (optional)
- [ ] Add reputation/trust scoring for peers

## Simple Starting Point

Start with a local WebSocket server for testing:

```typescript
// mesh/simple-websocket.ts
import WebSocket from 'ws';

export class SimpleWebSocketTransport {
  private wss: WebSocket.Server;
  private clients: Map<string, WebSocket> = new Map();
  
  async start(port = 8080) {
    this.wss = new WebSocket.Server({ port });
    
    this.wss.on('connection', (ws) => {
      const peerId = generateUUID();
      this.clients.set(peerId, ws);
      
      ws.on('message', (data) => {
        // Broadcast to all connected clients
        for (const [id, client] of this.clients) {
          if (id !== peerId && client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(peerId);
      });
    });
    
    console.log(`WebSocket server listening on port ${port}`);
  }
  
  async stop() {
    this.wss.close();
  }
}
```

## Key Takeaways

1. **Peer discovery is essential** - Can't connect without finding peers first
2. **Encryption matters** - All peer communications should be encrypted
3. **Events simplify integration** - Listen for peer-discovered, message-received, etc.
4. **Protocol flexibility** - Supporting multiple transports increases reach

## Next Steps

1. Start with WebRTC/mDNS discovery
2. Implement simple key exchange
3. Test message encryption/decryption
4. Implement fingerprint comparison protocol
5. Test with multiple simulated peers
6. Add Bluetooth LE support later
