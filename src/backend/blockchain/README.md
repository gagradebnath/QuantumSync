# Blockchain Module

## Overview

The **Blockchain module** anchors published media to a public blockchain. Think of it as creating a "permanent stamp" that proves:
- This media existed at this specific time
- This person (anonymously) published it
- It hasn't been tampered with (content hash is recorded)

**Analogy**: Like registering a copyright with the government, but on a blockchain that anyone can verify.

## What This Module Does

### Core Responsibilities

1. **Create Anchor** - Record media metadata on blockchain
2. **Submit Transaction** - Send the anchor through a relayer (to hide your IP)
3. **Verify Anchor** - Check that blockchain has recorded your anchor
4. **Query Anchors** - Find all media published by a fingerprint
5. **Calculate Costs** - Estimate gas fees for submission

## File Structure

```
blockchain/
└── anchor.ts          # Smart contract interface (8.7 KB)
```

## Blockchain Anchor Structure

What gets stored on blockchain (minimal data for cost efficiency):

```typescript
{
  mediaCid: "QmXxxx...",           // IPFS hash of media (36 bytes)
  metadataCid: "QmYyyy...",        // IPFS hash of encrypted metadata
  fingerprintHash: "abc123...",    // SHA256 of fingerprint (32 bytes)
  timestamp: 1700000000,           // Unix timestamp (4 bytes)
  verificationBlob: "0x...",       // Ring signature proof (128 bytes)
  publisher: "0x0000000000000000000000000000000000000000"  // Anonymous address
}
```

**Total on-chain: ~300 bytes = ~$0.005-0.01 at Polygon mainnet rates**

## Supported Blockchains

- **Polygon** - Cheap, fast, EVM-compatible
- **Ethereum Sepolia Testnet** - For testing
- **Avalanche** - Alternative L1
- **Any EVM-compatible chain** - Extensible

## Current State

⚠️ **STUB**: Defines `BlockchainAnchor` class but no implementation.

**What exists** ✅
- Type definitions
- Configuration interface
- Method signatures

**What's MISSING** ❌
- Smart contract ABI
- Transaction creation
- Gas estimation
- Verification logic
- Query logic

## What Needs to Be Done

### 1. **Install Blockchain Libraries** (HIGH PRIORITY)

```bash
npm install ethers           # Ethereum/Polygon client
npm install dotenv          # Environment variables
```

### 2. **Create Smart Contract** (HIGH PRIORITY - But Optional for MVP)

**For MVP**: You can just write to transaction data (no contract needed).

**For production**: Create a simple smart contract to index anchors.

```solidity
// blockchain/MediaAnchor.sol (optional for production)

pragma solidity ^0.8.0;

contract MediaAnchor {
  struct Anchor {
    bytes32 fingerprintHash;
    string mediaCid;
    string metadataCid;
    uint256 timestamp;
    bytes verificationBlob;
  }
  
  mapping(bytes32 => Anchor) public anchors;
  
  event MediaAnchored(
    bytes32 indexed fingerprintHash,
    string mediaCid,
    uint256 timestamp
  );
  
  function submitAnchor(
    bytes32 fingerprintHash,
    string memory mediaCid,
    string memory metadataCid,
    bytes memory verificationBlob
  ) public {
    require(anchors[fingerprintHash].timestamp == 0, "Already anchored");
    
    anchors[fingerprintHash] = Anchor({
      fingerprintHash: fingerprintHash,
      mediaCid: mediaCic,
      metadataCid: metadataCid,
      timestamp: block.timestamp,
      verificationBlob: verificationBlob
    });
    
    emit MediaAnchored(fingerprintHash, mediaCid, block.timestamp);
  }
  
  function getAnchor(bytes32 fingerprintHash) public view returns (Anchor memory) {
    return anchors[fingerprintHash];
  }
}
```

### 3. **Implement Blockchain Manager** (HIGH PRIORITY)

```typescript
// blockchain/anchor.ts

import { ethers } from 'ethers';
import { createHash } from 'crypto';

export interface BlockchainConfig {
  network: 'polygon' | 'ethereum-sepolia' | 'avalanche';
  rpcUrl: string;
  chainId: number;
  gasPrice?: 'slow' | 'standard' | 'fast';
}

export interface AnchorData {
  mediaCid: string;
  metadataCid: string;
  fingerprintHash: string;
  timestamp: number;
  verificationBlob: Uint8Array;  // Ring signature
}

export interface AnchorReceipt {
  transactionHash: string;
  blockNumber: number;
  confirmations: number;
  gasUsed: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export class BlockchainAnchor {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private config: BlockchainConfig;
  private contract: ethers.Contract | null = null;
  
  constructor(config: BlockchainConfig) {
    this.config = config;
  }
  
  /**
   * Initialize blockchain connection
   */
  async initialize(relayerPrivateKey?: string): Promise<void> {
    // Step 1: Connect to RPC provider
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    
    // Step 2: Set up signer (from relayer private key)
    if (relayerPrivateKey) {
      this.signer = new ethers.Wallet(relayerPrivateKey, this.provider);
      console.log('Using relayer wallet:', await this.signer.getAddress());
    } else {
      // For testing without a real wallet
      console.log('No signer provided - read-only mode');
    }
    
    // Step 3: Initialize contract interface (if contract exists)
    if (this.config.network === 'polygon') {
      // In production, deploy contract and use its address
      const contractAddress = process.env.MEDIA_ANCHOR_CONTRACT;
      if (contractAddress && this.signer) {
        // Load contract ABI
        const abi = [ /* contract ABI */ ];
        this.contract = new ethers.Contract(contractAddress, abi, this.signer);
      }
    }
  }
  
  /**
   * Submit media anchor to blockchain (via transaction data)
   * 
   * This writes to blockchain without needing a smart contract
   */
  async submitAnchor(anchor: AnchorData): Promise<AnchorReceipt> {
    if (!this.signer || !this.provider) {
      throw new Error('Blockchain not initialized');
    }
    
    try {
      // Step 1: Encode anchor data as JSON
      const anchorJson = JSON.stringify({
        mediaCid: anchor.mediaCid,
        metadataCid: anchor.metadataCid,
        fingerprintHash: anchor.fingerprintHash,
        timestamp: anchor.timestamp
      });
      
      // Step 2: Create transaction that includes this data
      const tx = {
        to: ethers.ZeroAddress,  // Transaction to null address
        value: 0,                 // No funds transferred
        data: ethers.toBeHex(ethers.toUtf8Bytes(anchorJson))  // Anchor data in tx
      };
      
      // Step 3: Estimate gas
      const gasEstimate = await this.provider.estimateGas(tx);
      console.log('Estimated gas:', gasEstimate.toString());
      
      // Step 4: Submit transaction
      console.log('Submitting anchor transaction...');
      const response = await this.signer.sendTransaction(tx);
      
      console.log('Transaction sent:', response.hash);
      
      // Step 5: Wait for confirmation
      const receipt = await response.wait(1);  // Wait for 1 confirmation
      
      if (!receipt) {
        throw new Error('Transaction failed');
      }
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        confirmations: 1,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'confirmed' : 'failed'
      };
    } catch (error) {
      throw new Error(`Anchor submission failed: ${error.message}`);
    }
  }
  
  /**
   * Submit anchor using smart contract (if deployed)
   */
  async submitAnchorViaContract(anchor: AnchorData): Promise<AnchorReceipt> {
    if (!this.contract) {
      throw new Error('Smart contract not available');
    }
    
    try {
      // Call contract's submitAnchor function
      const tx = await this.contract.submitAnchor(
        anchor.fingerprintHash,
        anchor.mediaCid,
        anchor.metadataCid,
        anchor.verificationBlob
      );
      
      console.log('Contract transaction sent:', tx.hash);
      
      const receipt = await tx.wait(1);
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        confirmations: 1,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'confirmed' : 'failed'
      };
    } catch (error) {
      throw new Error(`Contract submission failed: ${error.message}`);
    }
  }
  
  /**
   * Query anchors by fingerprint hash
   */
  async queryAnchorByFingerprint(
    fingerprintHash: string
  ): Promise<AnchorData | null> {
    if (!this.provider) {
      throw new Error('Blockchain not initialized');
    }
    
    try {
      // Query blockchain history for transactions containing this fingerprint
      // This is a simplification - in production, use smart contract events
      
      console.log(`Querying for fingerprint: ${fingerprintHash}`);
      
      // Would need to:
      // 1. Search transaction history
      // 2. Decode transaction data
      // 3. Match fingerprint hash
      
      // For now, return null (not implemented)
      return null;
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }
  
  /**
   * Verify anchor exists on blockchain
   */
  async verifyAnchor(transactionHash: string): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Blockchain not initialized');
    }
    
    try {
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
      if (!receipt) {
        return false;  // Transaction not found
      }
      
      // Check if confirmed
      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;
      
      console.log(`Transaction has ${confirmations} confirmations`);
      return confirmations >= 1;  // At least 1 confirmation
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }
  
  /**
   * Estimate gas cost for anchor submission
   */
  async estimateAnchorCost(): Promise<{
    gasPrice: string;
    gasLimit: string;
    totalCost: string;
  }> {
    if (!this.provider) {
      throw new Error('Blockchain not initialized');
    }
    
    try {
      // Step 1: Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice!;
      
      // Step 2: Estimate gas for typical anchor (rough estimate)
      const gasLimit = ethers.parseUnits('100000', 'wei');  // ~100k wei
      
      // Step 3: Calculate total cost
      const totalCost = gasPrice * gasLimit;
      
      return {
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
        gasLimit: gasLimit.toString(),
        totalCost: ethers.formatEther(totalCost) + ' ETH/MATIC'
      };
    } catch (error) {
      throw new Error(`Cost estimation failed: ${error.message}`);
    }
  }
  
  /**
   * Get chain information
   */
  async getChainInfo() {
    if (!this.provider) {
      throw new Error('Blockchain not initialized');
    }
    
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const balance = this.signer ? 
        await this.provider.getBalance(await this.signer.getAddress()) : 
        null;
      
      return {
        chainId: network.chainId,
        chainName: network.name,
        blockNumber,
        relayerBalance: balance ? ethers.formatEther(balance) + ' ETH' : 'N/A'
      };
    } catch (error) {
      throw new Error(`Failed to get chain info: ${error.message}`);
    }
  }
}
```

### 4. **Add Testnet Support** (HIGH PRIORITY)

For MVP, use **Polygon Mumbai Testnet** (free test MATIC):

```typescript
// blockchain/testnet-config.ts

export const TESTNET_CONFIG = {
  'polygon-mumbai': {
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    chainId: 80001,
    faucet: 'https://faucet.polygon.technology/',
    explorer: 'https://mumbai.polygonscan.com/'
  },
  'ethereum-sepolia': {
    rpcUrl: 'https://sepolia.infura.io/v3/' + process.env.INFURA_KEY,
    chainId: 11155111,
    faucet: 'https://www.sepoliaethfaucet.com/',
    explorer: 'https://sepolia.etherscan.io/'
  }
};

// Get free testnet tokens:
// 1. Go to faucet URL
// 2. Paste your relayer wallet address
// 3. Request tokens (takes ~2 minutes)
```

### 5. **Add Error Handling** (MEDIUM PRIORITY)

```typescript
export class BlockchainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockchainError';
  }
}

export class InsufficientFundsError extends BlockchainError {
  constructor() {
    super('Relayer wallet has insufficient funds for gas');
    this.name = 'InsufficientFundsError';
  }
}

export class TransactionFailedError extends BlockchainError {
  constructor(txHash: string) {
    super(`Transaction failed: ${txHash}`);
    this.name = 'TransactionFailedError';
  }
}

// In submitAnchor:
try {
  const balance = await this.provider.getBalance(await this.signer.getAddress());
  const costs = await this.estimateAnchorCost();
  
  if (balance < ethers.parseEther(costs.totalCost)) {
    throw new InsufficientFundsError();
  }
  
  // Proceed with submission
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    // Handle fund shortage
  }
  throw error;
}
```

## How to Use This Module

### Step 1: Initialize with Testnet

```typescript
// In orchestrator/index.ts
import { BlockchainAnchor } from './blockchain/anchor';

const blockchain = new BlockchainAnchor({
  network: 'polygon',
  rpcUrl: 'https://rpc-mumbai.maticvigil.com',  // Mumbai testnet
  chainId: 80001
});

// Load relayer wallet (from environment variable)
await blockchain.initialize(process.env.RELAYER_PRIVATE_KEY);

// Check wallet balance
const info = await blockchain.getChainInfo();
console.log('Relayer balance:', info.relayerBalance);
```

### Step 2: Estimate Costs

```typescript
const costs = await blockchain.estimateAnchorCost();
console.log('Gas price:', costs.gasPrice);
console.log('Total cost:', costs.totalCost);
```

### Step 3: Submit Anchor

```typescript
const anchor = {
  mediaCid: 'QmXxxx...',
  metadataCid: 'QmYyyy...',
  fingerprintHash: 'abc123...',
  timestamp: Date.now(),
  verificationBlob: new Uint8Array([...])
};

const receipt = await blockchain.submitAnchor(anchor);
console.log('Anchored to blockchain:', receipt.transactionHash);
console.log('Status:', receipt.status);
```

### Step 4: Verify Anchor

```typescript
// Later, verify it was recorded
const isVerified = await blockchain.verifyAnchor(receipt.transactionHash);
console.log('Anchor verified:', isVerified);
```

## Checklist for Completing This Module

- [ ] Install ethers.js library
- [ ] Implement blockchain provider connection
- [ ] Implement signer/wallet setup
- [ ] Implement anchor data encoding
- [ ] Implement transaction submission (via transaction data)
- [ ] Implement gas estimation
- [ ] Implement transaction verification
- [ ] Add error handling for insufficient funds
- [ ] Test with Mumbai testnet
- [ ] Document how to get testnet MATIC
- [ ] Optionally: Deploy smart contract
- [ ] Optionally: Implement contract-based submissions

## Getting Testnet Funds

**For Polygon Mumbai:**
1. Go to https://faucet.polygon.technology/
2. Paste your wallet address
3. Click "Submit" to receive 0.5 MATIC
4. Wait 2-3 minutes for confirmation

**For Ethereum Sepolia:**
1. Go to https://www.sepoliaethfaucet.com/
2. Paste your wallet address
3. Claim 0.05 ETH
4. Wait for confirmation

## Cost Analysis (Mainnet)

| Chain | Cost per Anchor | Est. Monthly (1000 anchors) |
|-------|-----------------|---------------------------|
| Polygon | $0.005-0.01 | $5-10 |
| Ethereum | $0.50-2.00 | $500-2000 |
| Avalanche | $0.02-0.05 | $20-50 |

**Recommendation**: Use Polygon for MVP, cheapest option.

## Key Takeaways

1. **Blockchain is immutable** - Once anchored, cannot be deleted or changed
2. **Testnet is free** - Use Mumbai/Sepolia for development
3. **Keep on-chain data minimal** - Just store hashes, not full data
4. **Anonymity via relayers** - Submit via relayer to hide IP/wallet

## Next Steps

1. Set up testnet wallet
2. Get testnet funds (MATIC or ETH)
3. Implement blockchain connection
4. Test anchor submission on testnet
5. Verify anchor on blockchain explorer
6. Plan for mainnet deployment (costs money)
