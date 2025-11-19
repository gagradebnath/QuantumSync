/**
 * @fileoverview Confidence Aggregation and Verification
 * @module verification/confidence
 * @description Aggregates peer-signed fingerprint comparison reports and computes
 * tamper-resilience confidence scores. Implements outlier detection and signature
 * verification.
 */

import type { PeerReport, ConfidenceAggregation } from '../types';
import type { PQCryptoManager } from '../crypto/pq-crypto';

/**
 * Confidence Aggregation Manager
 * 
 * Aggregates peer comparison reports using statistical methods to derive
 * a robust confidence score resistant to malicious or faulty peers.
 * 
 * **Aggregation Strategy:**
 * 1. Verify signatures on all peer reports
 * 2. Detect and exclude outliers (trimmed mean)
 * 3. Compute aggregated confidence score
 * 4. Assess consensus level
 * 
 * @example
 * ```typescript
 * const aggregator = new ConfidenceAggregator(cryptoManager);
 * 
 * const peerReports: PeerReport[] = [...]; // From mesh network
 * const result = await aggregator.aggregate(peerReports);
 * 
 * console.log('Aggregated confidence:', result.aggregatedScore);
 * console.log('Consensus level:', result.consensusLevel);
 * console.log('Outliers excluded:', result.outlierCount);
 * ```
 */
export class ConfidenceAggregator {
  constructor(private crypto: PQCryptoManager) {}

  /**
   * Aggregate peer reports into confidence score
   * 
   * @param reports - Array of peer-signed reports
   * @param options - Aggregation options
   * @returns Aggregated confidence result
   */
  async aggregate(
    reports: PeerReport[],
    options: {
      outlierThreshold?: number; // Standard deviations for outlier detection
      minPeers?: number; // Minimum number of peer reports required
      verifySignatures?: boolean; // Whether to verify peer signatures
    } = {}
  ): Promise<ConfidenceAggregation> {
    const {
      outlierThreshold = 2.0,
      minPeers = 3,
      verifySignatures = true,
    } = options;

    console.log(`[Confidence] Aggregating ${reports.length} peer reports...`);

    // Validate minimum reports
    if (reports.length < minPeers) {
      throw new Error(`Insufficient peer reports: ${reports.length} < ${minPeers}`);
    }

    // Verify signatures
    if (verifySignatures) {
      const validReports = await this.verifyReportSignatures(reports);
      console.log(`[Confidence] ${validReports.length}/${reports.length} reports have valid signatures`);
      reports = validReports;
    }

    // Extract confidence scores
    const scores = reports.map(r => r.confidenceScore);

    // Compute statistics
    const mean = this.computeMean(scores);
    const stdDev = this.computeStdDev(scores, mean);

    // Detect outliers
    const outlierMask = this.detectOutliers(scores, mean, stdDev, outlierThreshold);
    const outlierCount = outlierMask.filter(isOutlier => isOutlier).length;

    // Filter out outliers
    const filteredScores = scores.filter((_, i) => !outlierMask[i]);
    const filteredReports = reports.filter((_, i) => !outlierMask[i]);

    // Compute trimmed mean
    const aggregatedScore = this.computeMean(filteredScores);

    // Assess consensus
    const consensusLevel = this.assessConsensus(filteredScores, aggregatedScore);

    // Build peer score details
    const peerScores = reports.map((report, i) => ({
      peerId: report.peerEphemeralId,
      score: report.confidenceScore,
      included: !outlierMask[i],
    }));

    const result: ConfidenceAggregation = {
      aggregatedScore,
      reportCount: filteredReports.length,
      outlierCount,
      standardDeviation: stdDev,
      consensusLevel,
      peerScores,
    };

    console.log(`[Confidence] Aggregated score: ${aggregatedScore.toFixed(3)} (${consensusLevel} consensus)`);
    return result;
  }

  /**
   * Verify signatures on peer reports
   * @private
   */
  private async verifyReportSignatures(reports: PeerReport[]): Promise<PeerReport[]> {
    const validReports: PeerReport[] = [];

    for (const report of reports) {
      try {
        // Reconstruct signed message
        const message = this.serializeReportForSigning(report);

        // Verify Dilithium signature
        const isValid = await this.crypto.verify(
          message,
          report.signature,
          report.ephemeralPubKey
        );

        if (isValid) {
          validReports.push(report);
        } else {
          console.warn(`[Confidence] Invalid signature from peer ${report.peerEphemeralId}`);
        }
      } catch (error) {
        console.error(`[Confidence] Signature verification error:`, error);
      }
    }

    return validReports;
  }

  /**
   * Serialize report for signing (canonical format)
   * @private
   */
  private serializeReportForSigning(report: PeerReport): Uint8Array {
    const data = {
      mediaItemId: report.mediaItemId,
      confidenceScore: report.confidenceScore,
      timestamp: report.timestamp,
    };

    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
  }

  /**
   * Compute mean of array
   * @private
   */
  private computeMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Compute standard deviation
   * @private
   */
  private computeStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const variance = values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Detect outliers using z-score method
   * @private
   */
  private detectOutliers(
    values: number[],
    mean: number,
    stdDev: number,
    threshold: number
  ): boolean[] {
    return values.map(val => {
      const zScore = stdDev > 0 ? Math.abs((val - mean) / stdDev) : 0;
      return zScore > threshold;
    });
  }

  /**
   * Assess consensus level based on score distribution
   * @private
   */
  private assessConsensus(
    scores: number[],
    aggregatedScore: number
  ): 'high' | 'medium' | 'low' {
    if (scores.length === 0) return 'low';

    // Compute coefficient of variation
    const mean = this.computeMean(scores);
    const stdDev = this.computeStdDev(scores, mean);
    const cv = mean > 0 ? stdDev / mean : 1;

    // Consensus thresholds
    if (cv < 0.1 && aggregatedScore >= 0.7) return 'high';
    if (cv < 0.3 && aggregatedScore >= 0.5) return 'medium';
    return 'low';
  }
}

/**
 * Peer report validator
 * 
 * Validates peer reports for completeness and correctness before aggregation.
 */
export class PeerReportValidator {
  /**
   * Validate peer report structure
   */
  validateReport(report: PeerReport): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!report.id) errors.push('Missing report ID');
    if (!report.mediaItemId) errors.push('Missing media item ID');
    if (!report.peerEphemeralId) errors.push('Missing peer ephemeral ID');
    if (!report.signature || report.signature.length === 0) errors.push('Missing signature');
    if (!report.ephemeralPubKey || report.ephemeralPubKey.length === 0) errors.push('Missing public key');
    if (!report.timestamp) errors.push('Missing timestamp');

    // Check confidence score range
    if (report.confidenceScore < 0 || report.confidenceScore > 1) {
      errors.push(`Invalid confidence score: ${report.confidenceScore} (must be [0, 1])`);
    }

    // Check proximity level
    const validProximity = ['near', 'medium', 'far'];
    if (!validProximity.includes(report.proximityLevel)) {
      errors.push(`Invalid proximity level: ${report.proximityLevel}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate batch of reports
   */
  validateReports(reports: PeerReport[]): PeerReport[] {
    const validReports: PeerReport[] = [];

    for (const report of reports) {
      const validation = this.validateReport(report);
      
      if (validation.valid) {
        validReports.push(report);
      } else {
        console.warn(`[Validator] Invalid report from ${report.peerEphemeralId}:`, validation.errors);
      }
    }

    console.log(`[Validator] ${validReports.length}/${reports.length} reports passed validation`);
    return validReports;
  }
}

/**
 * Tamper detection analyzer
 * 
 * Analyzes confidence patterns to detect potential tampering or anomalies.
 */
export class TamperDetectionAnalyzer {
  /**
   * Analyze aggregated confidence for tampering indicators
   * 
   * @param aggregation - Confidence aggregation result
   * @returns Tamper detection result
   */
  analyzeTampering(aggregation: ConfidenceAggregation): {
    tamperingLikely: boolean;
    indicators: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const indicators: string[] = [];

    // Check aggregated score
    if (aggregation.aggregatedScore < 0.3) {
      indicators.push('Very low confidence score');
    }

    // Check consensus
    if (aggregation.consensusLevel === 'low') {
      indicators.push('Low peer consensus');
    }

    // Check outlier ratio
    const outlierRatio = aggregation.outlierCount / (aggregation.reportCount + aggregation.outlierCount);
    if (outlierRatio > 0.3) {
      indicators.push(`High outlier ratio: ${(outlierRatio * 100).toFixed(1)}%`);
    }

    // Check standard deviation
    if (aggregation.standardDeviation > 0.3) {
      indicators.push('High variance in peer scores');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (indicators.length === 0) {
      riskLevel = 'low';
    } else if (indicators.length <= 2) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    const tamperingLikely = indicators.length >= 2;

    return {
      tamperingLikely,
      indicators,
      riskLevel,
    };
  }

  /**
   * Generate tamper detection report
   */
  generateReport(aggregation: ConfidenceAggregation): string {
    const analysis = this.analyzeTampering(aggregation);

    const report = `
=== Tamper Detection Report ===

Aggregated Confidence: ${(aggregation.aggregatedScore * 100).toFixed(1)}%
Consensus Level: ${aggregation.consensusLevel}
Peer Reports: ${aggregation.reportCount} (${aggregation.outlierCount} outliers excluded)
Standard Deviation: ${aggregation.standardDeviation.toFixed(3)}

Risk Level: ${analysis.riskLevel.toUpperCase()}
Tampering Likely: ${analysis.tamperingLikely ? 'YES' : 'NO'}

Indicators:
${analysis.indicators.length > 0 ? analysis.indicators.map(i => `  - ${i}`).join('\n') : '  (none)'}

Peer Scores:
${aggregation.peerScores.map(ps => 
  `  ${ps.peerId}: ${(ps.score * 100).toFixed(1)}% ${ps.included ? '✓' : '✗ (outlier)'}`
).join('\n')}

=== End Report ===
    `.trim();

    return report;
  }
}
