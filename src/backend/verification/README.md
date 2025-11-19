# Verification Module

## Overview

The **Verification module** aggregates peer reports and computes a tamper-resistance confidence score. Think of it as a "jury system" where multiple witnesses vote on whether the media is authentic.

**Analogy**: Instead of one person saying "I saw this happen", you have 20 people independently verify the same thing. If 19 agree, it's probably true. If only 1 agrees, maybe they're lying.

## What This Module Does

### Core Responsibilities

1. **Aggregate Reports** - Collect fingerprint comparison reports from peers
2. **Verify Signatures** - Check that each report is legitimately signed by the peer
3. **Detect Outliers** - Identify peers giving obviously false reports
4. **Calculate Confidence** - Compute overall confidence score [0.0, 1.0]
5. **Flag Anomalies** - Alert if reports suggest tampering or deepfaking

## File Structure

```
verification/
└── confidence.ts          # Peer report aggregation (10.9 KB)
```

## Confidence Score Calculation

### Example Scenario

20 peers compared your audio fingerprint:

```
Peer 1:  similarity: 0.95 ✅ Valid signature
Peer 2:  similarity: 0.94 ✅ Valid signature
Peer 3:  similarity: 0.96 ✅ Valid signature
...
Peer 18: similarity: 0.05 ❌ OUTLIER (obviously wrong)
Peer 19: similarity: 0.97 ✅ Valid signature
Peer 20: similarity: 0.92 ✅ Valid signature

After filtering outliers (Peer 18):
Average similarity: 0.945

Confidence score: 0.945 = "Very likely authentic"
```

### Confidence Levels

```
Score 0.9-1.0 = "Authentic - High confidence"
  → Recorded at same time/place as claimed
  
Score 0.7-0.9 = "Likely authentic - Medium confidence"
  → Probable authentic, but some doubts
  
Score 0.4-0.7 = "Uncertain - Low confidence"
  → Could be authentic or tampered
  
Score 0.0-0.4 = "Likely inauthentic - Very low confidence"
  → Probably deepfaked or heavily edited
```

## Current State

⚠️ **STUB**: Defines `ConfidenceAggregator` class but no implementation.

**What exists** ✅
- Class structure
- Interface definitions
- Method signatures

**What's MISSING** ❌
- Report collection logic
- Signature verification
- Outlier detection algorithm
- Confidence calculation
- Anomaly detection

## What Needs to Be Done

### 1. **Implement Report Collection** (HIGH PRIORITY)

```typescript
// verification/confidence.ts

export interface PeerReport {
  peerId: string;                  // Which peer gave this report
  mediaItemId: string;             // Which media
  similarity: number;              // How similar [0.0, 1.0]
  confidence: 'high' | 'medium' | 'low';  // Peer's confidence
  signature: Uint8Array;           // Signed by peer (proves authenticity)
  timestamp: number;               // When peer submitted report
}

export interface ConfidenceAnalysis {
  overallConfidence: number;       // [0.0, 1.0]
  confidenceLevel: 'high' | 'medium' | 'low' | 'very-low';
  reportCount: number;             // How many peers reported
  validReportCount: number;        // How many had valid signatures
  averageSimilarity: number;       // Average of all valid reports
  standardDeviation: number;       // How much variance
  outlierCount: number;            // How many obviously wrong reports
  tamperedLikelihood: number;      // Probability [0.0, 1.0] media was edited
  recommendation: string;          // "TRUST" | "CAUTION" | "DISTRUST"
}

export class ConfidenceAggregator {
  /**
   * Add a peer report to the collection
   */
  addReport(report: PeerReport): void {
    // Step 1: Validate report has required fields
    if (!report.peerId || !report.mediaItemId || report.similarity === undefined) {
      throw new Error('Invalid report format');
    }
    
    // Step 2: Check signature is present
    if (!report.signature || report.signature.length === 0) {
      throw new Error('Report must be signed by peer');
    }
    
    // Step 3: Verify signature is valid
    // (Will be done in analyzeReports)
    
    // Step 4: Store report
    this.reports.push(report);
  }
  
  /**
   * Get all collected reports
   */
  getReports(): PeerReport[] {
    return [...this.reports];
  }
  
  /**
   * Clear all reports
   */
  clearReports(): void {
    this.reports = [];
  }
}
```

### 2. **Implement Signature Verification** (HIGH PRIORITY)

```typescript
export class ConfidenceAggregator {
  /**
   * Verify a peer's signature on their report
   */
  async verifyReportSignature(
    report: PeerReport,
    peerPublicKey: Uint8Array,
    crypto: PQCryptoManager
  ): Promise<boolean> {
    try {
      // Step 1: Reconstruct the data that was signed
      const reportData = {
        peerId: report.peerId,
        mediaItemId: report.mediaItemId,
        similarity: report.similarity,
        confidence: report.confidence,
        timestamp: report.timestamp
      };
      
      const reportBytes = new TextEncoder().encode(JSON.stringify(reportData));
      
      // Step 2: Verify signature with peer's public key
      const isValid = await crypto.verify(
        reportBytes,
        report.signature,
        peerPublicKey
      );
      
      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }
  
  /**
   * Verify all reports and filter out invalid ones
   */
  async verifyAllReports(
    peerPublicKeys: Map<string, Uint8Array>,  // peerId → publicKey
    crypto: PQCryptoManager
  ): Promise<PeerReport[]> {
    const validReports: PeerReport[] = [];
    
    for (const report of this.reports) {
      const publicKey = peerPublicKeys.get(report.peerId);
      
      if (!publicKey) {
        console.warn(`No public key for peer: ${report.peerId}`);
        continue;
      }
      
      const isValid = await this.verifyReportSignature(report, publicKey, crypto);
      
      if (isValid) {
        validReports.push(report);
      } else {
        console.warn(`Invalid signature from peer: ${report.peerId}`);
      }
    }
    
    return validReports;
  }
}
```

### 3. **Implement Outlier Detection** (HIGH PRIORITY)

```typescript
export class ConfidenceAggregator {
  /**
   * Detect outliers using statistical methods
   */
  private detectOutliers(
    reports: PeerReport[],
    method: 'trimmed-mean' | 'z-score' = 'z-score'
  ): {
    inliers: PeerReport[];
    outliers: PeerReport[];
  } {
    if (reports.length < 3) {
      // Too few reports to detect outliers
      return { inliers: reports, outliers: [] };
    }
    
    if (method === 'z-score') {
      return this.detectOutliersZScore(reports);
    } else {
      return this.detectOutliersTrimmedMean(reports);
    }
  }
  
  /**
   * Z-score method: Mark points > 2 standard deviations away
   */
  private detectOutliersZScore(reports: PeerReport[]): {
    inliers: PeerReport[];
    outliers: PeerReport[];
  } {
    const similarities = reports.map(r => r.similarity);
    
    // Step 1: Calculate mean
    const mean = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    
    // Step 2: Calculate standard deviation
    const variance = similarities.reduce((sum, x) => sum + (x - mean) ** 2, 0) / similarities.length;
    const stdDev = Math.sqrt(variance);
    
    // Step 3: Calculate z-score for each report
    const zScores = similarities.map(x => Math.abs((x - mean) / (stdDev + 1e-10)));
    
    // Step 4: Split inliers/outliers (threshold = 2)
    const inliers: PeerReport[] = [];
    const outliers: PeerReport[] = [];
    
    for (let i = 0; i < reports.length; i++) {
      if (zScores[i] > 2.0) {
        outliers.push(reports[i]);
      } else {
        inliers.push(reports[i]);
      }
    }
    
    return { inliers, outliers };
  }
  
  /**
   * Trimmed mean: Remove extreme 20% on each side
   */
  private detectOutliersTrimmedMean(reports: PeerReport[]): {
    inliers: PeerReport[];
    outliers: PeerReport[];
  } {
    // Sort by similarity
    const sorted = [...reports].sort((a, b) => a.similarity - b.similarity);
    
    // Trim bottom and top 20%
    const trimCount = Math.floor(reports.length * 0.2);
    
    const inliers = sorted.slice(trimCount, sorted.length - trimCount);
    const outliers = [
      ...sorted.slice(0, trimCount),
      ...sorted.slice(sorted.length - trimCount)
    ];
    
    return { inliers, outliers };
  }
}
```

### 4. **Implement Confidence Calculation** (HIGH PRIORITY)

```typescript
export class ConfidenceAggregator {
  /**
   * Analyze all reports and calculate confidence
   */
  async analyzeReports(
    peerPublicKeys: Map<string, Uint8Array>,
    crypto: PQCryptoManager
  ): Promise<ConfidenceAnalysis> {
    // Step 1: Verify all signatures
    const validReports = await this.verifyAllReports(peerPublicKeys, crypto);
    
    if (validReports.length === 0) {
      return this.createLowConfidenceResult('No valid reports');
    }
    
    // Step 2: Detect outliers
    const { inliers, outliers } = this.detectOutliers(validReports);
    
    // Step 3: Calculate statistics from inliers
    const similarities = inliers.map(r => r.similarity);
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const variance = similarities.reduce(
      (sum, x) => sum + (x - avgSimilarity) ** 2,
      0
    ) / similarities.length;
    const stdDev = Math.sqrt(variance);
    
    // Step 4: Calculate base confidence
    // High similarity + low variance = high confidence
    const similarityComponent = avgSimilarity;  // 0-1
    const consistencyComponent = 1 - Math.min(1, stdDev);  // Lower stdDev = higher confidence
    const baseConfidence = (similarityComponent * 0.7) + (consistencyComponent * 0.3);
    
    // Step 5: Adjust for outliers
    const outlierRatio = outliers.length / validReports.length;
    const outlierPenalty = outlierRatio * 0.2;  // Max 20% penalty
    const finalConfidence = Math.max(0, baseConfidence - outlierPenalty);
    
    // Step 6: Detect tampering indicators
    const tamperingLikelihood = this.assessTamperingLikelihood(
      validReports,
      stdDev,
      outliers.length
    );
    
    // Step 7: Generate recommendation
    const recommendation = this.generateRecommendation(finalConfidence, tamperingLikelihood);
    
    return {
      overallConfidence: finalConfidence,
      confidenceLevel: this.getConfidenceLevel(finalConfidence),
      reportCount: validReports.length,
      validReportCount: validReports.length,
      averageSimilarity: avgSimilarity,
      standardDeviation: stdDev,
      outlierCount: outliers.length,
      tamperedLikelihood: tamperingLikelihood,
      recommendation
    };
  }
  
  /**
   * Assess likelihood that media was tampered with
   */
  private assessTamperingLikelihood(
    reports: PeerReport[],
    stdDev: number,
    outlierCount: number
  ): number {
    // Tampering indicators:
    // 1. High variance in similarity scores
    // 2. Many outliers
    // 3. Some reports saying "very different"
    
    const hasLowScores = reports.some(r => r.similarity < 0.3);
    const hasHighVariance = stdDev > 0.3;
    const hasHighOutlierRatio = outlierCount > reports.length * 0.3;
    
    let likelihood = 0;
    
    if (hasLowScores) likelihood += 0.4;
    if (hasHighVariance) likelihood += 0.3;
    if (hasHighOutlierRatio) likelihood += 0.3;
    
    return Math.min(1.0, likelihood);
  }
  
  /**
   * Convert confidence score to level
   */
  private getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' | 'very-low' {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    if (confidence >= 0.4) return 'low';
    return 'very-low';
  }
  
  /**
   * Generate recommendation based on analysis
   */
  private generateRecommendation(confidence: number, tampering: number): string {
    if (confidence >= 0.85 && tampering <= 0.1) {
      return 'TRUST - Media appears authentic';
    } else if (confidence >= 0.6 && tampering <= 0.3) {
      return 'CAUTION - Some concerns but likely authentic';
    } else if (tampering >= 0.6) {
      return 'DISTRUST - Likely deepfaked or heavily edited';
    } else {
      return 'UNCERTAIN - Insufficient data';
    }
  }
  
  private createLowConfidenceResult(reason: string): ConfidenceAnalysis {
    return {
      overallConfidence: 0,
      confidenceLevel: 'very-low',
      reportCount: 0,
      validReportCount: 0,
      averageSimilarity: 0,
      standardDeviation: 0,
      outlierCount: 0,
      tamperedLikelihood: 1,
      recommendation: `DISTRUST - ${reason}`
    };
  }
}
```

## How to Use This Module

### Step 1: Collect Reports

```typescript
// As peers send fingerprint comparison reports
const aggregator = new ConfidenceAggregator();

for (const peerReport of incomingReports) {
  aggregator.addReport(peerReport);
}

console.log('Collected', aggregator.getReports().length, 'peer reports');
```

### Step 2: Analyze Reports

```typescript
// After collecting enough reports (e.g., 10+ peers)
const peerPublicKeys = new Map([
  ['peer1', publicKeyBytes1],
  ['peer2', publicKeyBytes2],
  // ... more peers
]);

const analysis = await aggregator.analyzeReports(peerPublicKeys, crypto);

console.log('Confidence:', analysis.overallConfidence);
console.log('Level:', analysis.confidenceLevel);
console.log('Recommendation:', analysis.recommendation);
```

### Step 3: Use Confidence in Publishing

```typescript
if (analysis.overallConfidence >= 0.85) {
  // High confidence - safe to publish
  await publishMedia({ ...mediaData, confidence: analysis.overallConfidence });
} else if (analysis.overallConfidence >= 0.5) {
  // Medium confidence - publish with warning
  await publishMedia({ ...mediaData, confidence: analysis.overallConfidence, flagged: true });
} else {
  // Low confidence - don't publish
  throw new Error('Confidence too low - likely inauthentic');
}
```

## Checklist for Completing This Module

- [ ] Implement report collection
- [ ] Implement signature verification
- [ ] Implement Z-score outlier detection
- [ ] Implement trimmed mean outlier detection
- [ ] Implement confidence score calculation
- [ ] Implement tampering likelihood assessment
- [ ] Implement recommendation generation
- [ ] Add detailed analysis logging
- [ ] Test with synthetic report sets
- [ ] Document interpretation of confidence scores
- [ ] Add visualization of report distribution
- [ ] Test with real peer reports

## Confidence Interpretation Guide

| Confidence | Meaning | Action |
|-----------|---------|--------|
| 0.95+ | Nearly certain authentic | Publish safely |
| 0.85-0.95 | Very likely authentic | Publish, high credibility |
| 0.70-0.85 | Probably authentic | Publish, medium credibility |
| 0.50-0.70 | Uncertain | Publish with warning |
| 0.30-0.50 | Probably not authentic | Don't publish |
| < 0.30 | Almost certainly inauthentic | Reject |

## Key Takeaways

1. **Multiple witnesses > single witness** - More peer reports = higher confidence
2. **Outliers matter** - Some peers will lie; statistical methods filter them
3. **Variance indicates problems** - If peers strongly disagree, something's wrong
4. **Signatures prevent cheating** - Peers can't make false reports without being identified

## Next Steps

1. Implement report collection
2. Implement signature verification
3. Test outlier detection with sample data
4. Implement confidence calculation
5. Test with synthetic peer reports
6. Integrate with publishing workflow
