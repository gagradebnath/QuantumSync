# Relayer Network Module

## Overview

The **Relayer Network module** enables anonymous submission to blockchain by routing through privacy-preserving networks. Think of it as "mail forwarding service" that hides who's sending the package.

**Analogy**: Instead of mailing a letter directly (giving away your address), you mail it to a post office, which forwards it anonymously. Observers can't tell who sent it.

## What This Module Does

### Core Responsibilities

1. **Discover Relayers** - Find available relay servers on Tor/mixnet
2. **Route Submissions** - Send anchor data through selected relayer(s)
3. **Prevent Linkage** - Ensure same person can't be linked across submissions
4. **Fund Rotation** - Use different accounts so blockchain can't trace back
5. **Timing Obfuscation** - Add delays to prevent timing-based correlation

## File Structure

```
relayer/
└── network.ts          # Tor/mixnet relay protocol (15.0 KB)
```

## Privacy Mechanisms

### 1. **Tor Integration**
- Route all traffic through Tor network
- Hides your real IP from blockchain/IPFS nodes
- Prevents ISP/network provider from knowing what you're doing

### 2. **Ephemeral Addresses**
- Create new blockchain wallet for each submission
- No wallet reused = cannot link submissions together
- Relayer funds each ephemeral wallet

### 3. **Timing Obfuscation**
- Add random delays between submission and blockchain inclusion
- Prevents attackers from linking "submission sent at 12:34:56" to "transaction at 12:35:07"

### 4. **Relay Redundancy**
- Use multiple relayers in sequence
- None of them know the original sender or final recipient

## Current State

⚠️ **STUB**: Defines `RelayerNetwork` class but no real implementation.

**What exists** ✅
- Class structure
- Method signatures
- Relay node interface

**What's MISSING** ❌
- Tor connection logic
- Relay discovery
- Ephemeral wallet management
- Timing obfuscation
- Funding rotation

## What Needs to Be Done

### 1. **Install Relay Libraries** (HIGH PRIORITY)

```bash
npm install tor-request            # Tor integration
npm install socks5-http-client     # SOCKS proxy support
npm install ethers                 # Wallet creation (already installed)
```

### 2. **Implement Relayer Discovery** (HIGH PRIORITY)

```typescript
// relayer/network.ts

export interface RelayerNode {
  id: string;                      // Unique identifier
  address: string;                 // Onion address or IP:port
  reputation: number;              // Trust score [0.0, 1.0]
  fees: {
    submissionFee: string;         // Percentage or flat fee
    currency: 'MATIC' | 'ETH' | 'other'
  };
  lastUsed: number;                // Timestamp of last use
  publicKey: Uint8Array;           // For encryption
  discoveredAt: number;            // When we found this relayer
}

export interface RelayerConfig {
  torEnabled: boolean;             // Use Tor for routing
  minRelayerReputation: number;    // Minimum trust threshold
  useMultipleRelayers: boolean;    // Chain through multiple
  timingObfuscation: number;       // Delay range in milliseconds
}

export class RelayerNetwork {
  private relayers: Map<string, RelayerNode> = new Map();
  private config: RelayerConfig;
  private torSocksPort = 9050;     // Default Tor SOCKS port
  
  constructor(config: RelayerConfig) {
    this.config = config;
  }
  
  /**
   * Initialize relayer network
   */
  async initialize(): Promise<void> {
    if (this.config.torEnabled) {
      // Step 1: Check Tor connection
      try {
        await this.verifyTorConnection();
        console.log('✓ Tor connection verified');
      } catch (error) {
        throw new Error('Tor not available - install and run Tor daemon');
      }
    }
    
    // Step 2: Discover relayers
    await this.discoverRelayers();
  }
  
  /**
   * Verify Tor is running and working
   */
  private async verifyTorConnection(): Promise<void> {
    // Make test request through Tor
    // Should return an onion address
    
    try {
      const response = await fetch(
        'https://check.torproject.org/api/ip',
        {
          agent: new (require('https').Agent)({
            socksHost: 'localhost',
            socksPort: this.torSocksPort
          })
        }
      );
      
      const data = await response.json();
      
      if (!data.IsTor) {
        throw new Error('Tor not active - connection not routed through Tor');
      }
      
      console.log('Connected through Tor - IP:', data.IP);
    } catch (error) {
      throw new Error(`Tor verification failed: ${error.message}`);
    }
  }
  
  /**
   * Discover available relayers
   */
  private async discoverRelayers(): Promise<void> {
    console.log('Discovering relayers...');
    
    // In production, would:
    // 1. Connect to a relayer registry (on-chain, decentralized, etc.)
    // 2. Fetch list of active relayers
    // 3. Verify each relayer's reputation
    
    // For MVP, use hardcoded list of test relayers
    const testRelayers: RelayerNode[] = [
      {
        id: 'relayer-1',
        address: 'relayer1.onion',
        reputation: 0.95,
        fees: { submissionFee: '1%', currency: 'MATIC' },
        lastUsed: 0,
        publicKey: new Uint8Array(32),
        discoveredAt: Date.now()
      },
      {
        id: 'relayer-2',
        address: 'relayer2.onion',
        reputation: 0.87,
        fees: { submissionFee: '2%', currency: 'MATIC' },
        lastUsed: 0,
        publicKey: new Uint8Array(32),
        discoveredAt: Date.now()
      }
    ];
    
    for (const relayer of testRelayers) {
      if (relayer.reputation >= this.config.minRelayerReputation) {
        this.relayers.set(relayer.id, relayer);
      }
    }
    
    console.log(`Found ${this.relayers.size} trusted relayers`);
  }
  
  /**
   * Get list of available relayers
   */
  getAvailableRelayers(): RelayerNode[] {
    return Array.from(this.relayers.values()).sort(
      (a, b) => b.reputation - a.reputation
    );
  }
  
  /**
   * Select best relayer(s) for submission
   */
  private selectRelayers(): RelayerNode[] {
    const available = this.getAvailableRelayers();
    
    if (available.length === 0) {
      throw new Error('No available relayers');
    }
    
    if (this.config.useMultipleRelayers && available.length >= 2) {
      // Select top 2 relayers for chaining
      return [available[0], available[1]];
    }
    
    // Select single best relayer
    return [available[0]];
  }
}
```

### 3. **Implement Ephemeral Wallet Management** (HIGH PRIORITY)

```typescript
export interface EphemeralWallet {
  address: string;                 // Blockchain address
  privateKey: string;              // Private key (to be deleted after use)
  fundingAmount: string;           // How much funded
  funded: boolean;
  usedAt?: number;                 // When it was used for submission
  deletedAt?: number;              // When private key was destroyed
}

export class RelayerNetwork {
  private ephemeralWallets: Map<string, EphemeralWallet> = new Map();
  
  /**
   * Create ephemeral wallet for single-use submission
   */
  async createEphemeralWallet(): Promise<EphemeralWallet> {
    // Step 1: Generate random private key
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const wallet = ethers.Wallet.fromPrivateKey('0x' + Buffer.from(randomBytes).toString('hex'));
    
    const ephemeralWallet: EphemeralWallet = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      fundingAmount: '0',
      funded: false
    };
    
    this.ephemeralWallets.set(wallet.address, ephemeralWallet);
    
    console.log('Created ephemeral wallet:', wallet.address);
    return ephemeralWallet;
  }
  
  /**
   * Request relayer to fund ephemeral wallet
   */
  async requestFunding(
    relayer: RelayerNode,
    walletAddress: string,
    amount: string  // In MATIC or ETH
  ): Promise<boolean> {
    try {
      // Step 1: Send funding request to relayer
      // (In production: encrypt request with relayer's public key)
      
      const fundingRequest = {
        walletAddress,
        amount,
        timestamp: Date.now()
      };
      
      // Step 2: Submit through Tor to relayer
      const response = await this.sendToRelayerViaTor(relayer, fundingRequest);
      
      if (response.success) {
        const ephemeralWallet = this.ephemeralWallets.get(walletAddress);
        if (ephemeralWallet) {
          ephemeralWallet.funded = true;
          ephemeralWallet.fundingAmount = amount;
        }
        
        console.log(`Wallet ${walletAddress} funded with ${amount}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Funding request failed:', error);
      return false;
    }
  }
  
  /**
   * Securely delete ephemeral wallet after use
   */
  deleteEphemeralWallet(walletAddress: string): void {
    const ephemeralWallet = this.ephemeralWallets.get(walletAddress);
    
    if (ephemeralWallet) {
      // Overwrite private key with zeros
      ephemeralWallet.privateKey = '\x00'.repeat(64);
      
      // Mark as deleted
      ephemeralWallet.deletedAt = Date.now();
      
      // Remove from memory
      this.ephemeralWallets.delete(walletAddress);
      
      console.log('Ephemeral wallet deleted:', walletAddress);
    }
  }
  
  private async sendToRelayerViaTor(relayer: RelayerNode, data: any): Promise<any> {
    // TODO: Implement actual relayer communication
    return { success: true };
  }
}
```

### 4. **Implement Anchor Submission Through Relayer** (HIGH PRIORITY)

```typescript
export interface RelayerSubmissionResult {
  relayerId: string;
  walletAddress: string;
  transactionHash: string;
  confirmations: number;
  status: 'submitted' | 'pending' | 'confirmed' | 'failed';
}

export class RelayerNetwork {
  /**
   * Submit anchor to blockchain through relayer
   * 
   * This ensures the actual blockchain submission
   * cannot be linked to you
   */
  async submitAnchorThroughRelayer(
    anchor: AnchorData,
    blockchain: BlockchainAnchor
  ): Promise<RelayerSubmissionResult> {
    // Step 1: Select relayer
    const relayers = this.selectRelayers();
    const relayer = relayers[0];
    
    console.log('Submitting through relayer:', relayer.address);
    
    // Step 2: Create ephemeral wallet
    const ephemeralWallet = await this.createEphemeralWallet();
    
    // Step 3: Request funding
    const funded = await this.requestFunding(
      relayer,
      ephemeralWallet.address,
      '0.1'  // 0.1 MATIC for gas
    );
    
    if (!funded) {
      throw new Error('Failed to fund ephemeral wallet');
    }
    
    // Step 4: Apply timing obfuscation
    const delay = Math.random() * this.config.timingObfuscation;
    console.log(`Waiting ${Math.round(delay)}ms before submission...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Step 5: Submit through relayer
    const result = await this.submitViaRelayer(
      relayer,
      anchor,
      ephemeralWallet
    );
    
    // Step 6: Delete ephemeral wallet private key
    this.deleteEphemeralWallet(ephemeralWallet.address);
    
    return result;
  }
  
  /**
   * Actually submit anchor data through relayer
   */
  private async submitViaRelayer(
    relayer: RelayerNode,
    anchor: AnchorData,
    wallet: EphemeralWallet
  ): Promise<RelayerSubmissionResult> {
    try {
      // In real implementation, would:
      // 1. Connect to relayer through Tor
      // 2. Send anchor data (encrypted with relayer's public key)
      // 3. Include ephemeral wallet address for funding
      // 4. Relayer publishes to blockchain using ephemeral wallet
      // 5. Return transaction hash
      
      // For MVP, simulate:
      console.log('Submitting to relayer...');
      
      const result: RelayerSubmissionResult = {
        relayerId: relayer.id,
        walletAddress: wallet.address,
        transactionHash: '0x' + Math.random().toString(16).slice(2),
        confirmations: 0,
        status: 'submitted'
      };
      
      return result;
    } catch (error) {
      throw new Error(`Relayer submission failed: ${error.message}`);
    }
  }
}
```

### 5. **Add Timing Obfuscation** (MEDIUM PRIORITY)

```typescript
export class RelayerNetwork {
  /**
   * Apply random delay to break timing correlation
   */
  private async applyTimingObfuscation(): Promise<void> {
    // Random delay between 0 and configurable max
    const delayMs = Math.random() * this.config.timingObfuscation;
    
    console.log(`Applying timing obfuscation: ${Math.round(delayMs)}ms`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  /**
   * Add padding to messages to prevent size-based correlation
   */
  private padMessage(message: Uint8Array): Uint8Array {
    // Round message size to nearest kilobyte
    const targetSize = Math.ceil(message.length / 1024) * 1024;
    const padding = new Uint8Array(targetSize - message.length);
    
    crypto.getRandomValues(padding);
    
    return new Uint8Array([...message, ...padding]);
  }
}
```

## How to Use This Module

### Step 1: Install Tor

**On Linux:**
```bash
sudo apt-get install tor
sudo systemctl start tor
```

**On macOS:**
```bash
brew install tor
brew services start tor
```

**On Windows:**
Download from https://www.torproject.org/download/

### Step 2: Initialize Relayer Network

```typescript
// In orchestrator/index.ts
const relayerNetwork = new RelayerNetwork({
  torEnabled: true,
  minRelayerReputation: 0.8,
  useMultipleRelayers: true,
  timingObfuscation: 5000  // 0-5 second random delay
});

await relayerNetwork.initialize();
```

### Step 3: Submit Anchor Anonymously

```typescript
const result = await relayerNetwork.submitAnchorThroughRelayer(
  anchor,
  blockchain
);

console.log('Submitted through relayer:', result.relayerId);
console.log('Ephemeral wallet:', result.walletAddress);
console.log('Transaction:', result.transactionHash);
```

## Checklist for Completing This Module

- [ ] Install Tor and verify connection
- [ ] Implement relayer discovery
- [ ] Implement relayer reputation checking
- [ ] Create ephemeral wallet generation
- [ ] Implement ephemeral wallet funding request
- [ ] Implement secure private key deletion
- [ ] Implement anchor submission through relayer
- [ ] Add timing obfuscation
- [ ] Add message padding
- [ ] Test with actual Tor connection
- [ ] Document relayer setup for operators
- [ ] Implement relayer registry (optional)

## How to Run Your Own Relayer

For advanced users - run your own relayer:

```typescript
// relayer/operator.ts
export class RelayerOperator {
  async start(port = 8080) {
    // Step 1: Set up wallet with funding
    const wallet = ethers.Wallet.createRandom();
    console.log('Relayer address:', wallet.address);
    
    // Step 2: Fund the wallet (for gas)
    // Transfer MATIC/ETH to the wallet
    
    // Step 3: Start HTTP server
    const server = express();
    
    server.post('/submit-anchor', async (req, res) => {
      // Receive anchor from client
      const { anchor, ephemeralWallet } = req.body;
      
      // Fund ephemeral wallet
      const fundTx = await wallet.sendTransaction({
        to: ephemeralWallet,
        value: ethers.parseEther('0.1')
      });
      
      await fundTx.wait();
      
      // Submit anchor using ephemeral wallet
      // (Client provides signed transaction)
      
      res.json({ success: true });
    });
    
    server.listen(port);
    console.log(`Relayer listening on port ${port}`);
  }
}
```

## Key Takeaways

1. **Tor hides your IP** - Nobody can see your real network location
2. **Ephemeral wallets prevent linking** - Each submission uses fresh wallet
3. **Timing obfuscation breaks correlation** - Delays prevent "X submitted at 12:34, transaction at 12:35"
4. **Relayers are untrusted but useful** - They see requests but can't link back without Tor + ephemeral wallets

## Privacy Comparison

| Method | IP Hidden | Wallet Hidden | Timing Hidden |
|--------|-----------|---------------|---------------|
| Direct submission | ❌ | ❌ | ❌ |
| Single relayer | ✓ | ✓ | ❌ |
| Single relayer + Tor | ✓ | ✓ | ❌ |
| Multiple relayers + Tor + timing | ✓ | ✓ | ✓ |

## Next Steps

1. Install Tor locally
2. Verify Tor connection
3. Implement relayer discovery
4. Create ephemeral wallet generation
5. Test funding and submission
6. Add timing obfuscation
7. Test with actual blockchain submission
