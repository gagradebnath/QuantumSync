# Fingerprint Module

## Overview

The **Fingerprint module** extracts unique electrical grid frequency signatures from audio recordings. Think of it as the "voice print" of a recording that proves:
- When it was recorded (down to timezone)
- General geographic location (which power grid it was on)
- That it hasn't been edited/deepfaked

**Analogy**: Like how every voice has unique characteristics, every power grid has a unique hum at 50Hz or 60Hz. This module finds that hum.

## What This Module Does

### Core Responsibilities

1. **Extract Fingerprint** - Analyze audio to find the mains-hum frequency signature
2. **Compare Fingerprints** - Determine if two recordings were made at the same time/place
3. **Quality Assessment** - Rate how confident we are in the fingerprint
4. **Tamper Detection** - Identify if audio has been edited or deepfaked

## File Structure

```
fingerprint/
└── mains-hum.ts          # FFT-based fingerprint extraction (15.8 KB)
```

## Technical Background

### What is Mains-Hum?

Every electrical power grid produces a 50Hz or 60Hz frequency:
- **USA, Canada, Japan**: 60 Hz (60 electrical cycles per second)
- **Europe, Asia, Africa**: 50 Hz (50 electrical cycles per second)

This frequency is picked up by:
- Microphones (they're sensitive to electromagnetic interference)
- Audio recording devices
- Ambient recordings in buildings

### Why It Matters

When you record audio with a microphone:
1. The power grid hum becomes part of the recording
2. The specific frequency varies slightly based on grid load
3. Different power grids have different patterns
4. These patterns are **difficult to fake** without knowing the exact grid characteristics

**Example**:
```
Authentic recording:    Contains USA 60Hz hum signature
Deepfaked recording:    Would need to regenerate exact hum pattern (hard!)
Edited recording:       Cutting/splicing breaks the hum pattern
```

## Current State

⚠️ **STUB**: Defines `MainsHumExtractor` class but missing implementation.

**What exists** ✅
- Class definition
- Method signatures
- Configuration interface

**What's MISSING** ❌
- FFT (Fast Fourier Transform) implementation
- Frequency analysis logic
- Cross-correlation algorithm
- Comparison logic
- Quality assessment

## What Needs to Be Done

### 1. **Install FFT Libraries** (HIGH PRIORITY)

```bash
npm install fft-js          # FFT computation
npm install meyda           # High-level audio analysis
npm install numpy-like      # Numerical operations
```

### 2. **Understand FFT Basics** (HIGH PRIORITY)

**What is FFT?**
FFT = Fast Fourier Transform. It converts audio from "time domain" to "frequency domain".

**Simple explanation**:
```
Time Domain (what you hear):
[0.1, -0.05, 0.08, -0.03, ...] ← Audio samples over time

↓ Apply FFT ↓

Frequency Domain (what instruments measure):
[
  0.5 Hz: 0.01,
  1 Hz: 0.02,
  50 Hz: 0.95,     ← MAINS HUM! (strong signal)
  51 Hz: 0.01,
  60 Hz: 0.005,
  ...
]
```

### 3. **Implement Fingerprint Extraction** (HIGH PRIORITY)

```typescript
// fingerprint/mains-hum.ts

import FFT from 'fft-js';

export interface FingerprintConfig {
  sampleRate: number;          // Usually 44100 or 48000 Hz
  fftWindowSize: number;       // Size of analysis window (2048, 4096, etc.)
  targetFrequency: number;     // 50 or 60 Hz depending on region
  minDuration: number;         // Minimum audio length in seconds
}

export interface Fingerprint {
  signature: Float32Array;     // The extracted signature
  quality: number;             // Confidence [0.0, 1.0]
  timestamp: number;           // When extracted
  sampleRate: number;          // Audio sample rate
  duration: number;            // Duration of audio analyzed
  targetFrequency: number;     // Which frequency this targets
}

export class MainsHumExtractor {
  constructor(private config: FingerprintConfig) {}
  
  /**
   * Extract mains-hum fingerprint from audio
   * 
   * Steps:
   * 1. Validate audio length
   * 2. Apply FFT to small windows
   * 3. Extract frequency components around mains-hum
   * 4. Combine into signature
   * 5. Assess quality
   */
  async extract(audioSamples: Float32Array): Promise<Fingerprint> {
    // Step 1: Validate audio
    const durationSeconds = audioSamples.length / this.config.sampleRate;
    if (durationSeconds < this.config.minDuration) {
      throw new Error(
        `Audio too short: ${durationSeconds}s < ${this.config.minDuration}s`
      );
    }
    
    // Step 2: Split audio into overlapping windows
    const windowSize = this.config.fftWindowSize;
    const hopSize = Math.floor(windowSize / 2); // 50% overlap
    
    const signatures: Float32Array[] = [];
    
    for (let i = 0; i <= audioSamples.length - windowSize; i += hopSize) {
      const window = audioSamples.slice(i, i + windowSize);
      
      // Step 3: Apply Hann window (smoothing)
      const hannWindow = this.applyHannWindow(window);
      
      // Step 4: Compute FFT
      const fft = new FFT(hannWindow);
      const spectrum = fft.realTransform([...hannWindow]);
      
      // Step 5: Extract mains-hum region
      const signature = this.extractMainsHumRegion(spectrum);
      signatures.push(signature);
    }
    
    // Step 6: Combine all window signatures
    const combinedSignature = this.combineSignatures(signatures);
    
    // Step 7: Assess quality
    const quality = this.assessQuality(combinedSignature, signatures);
    
    return {
      signature: combinedSignature,
      quality,
      timestamp: Date.now(),
      sampleRate: this.config.sampleRate,
      duration: durationSeconds,
      targetFrequency: this.config.targetFrequency
    };
  }
  
  /**
   * Apply Hann window to reduce spectral leakage
   * 
   * This smooths the edges of the audio window so FFT doesn't
   * create artificial frequencies
   */
  private applyHannWindow(samples: Float32Array): Float32Array {
    const windowed = new Float32Array(samples.length);
    
    for (let i = 0; i < samples.length; i++) {
      // Hann window formula
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (samples.length - 1)));
      windowed[i] = samples[i] * w;
    }
    
    return windowed;
  }
  
  /**
   * Extract the region around mains-hum frequency
   * 
   * Example: If target is 60 Hz, extract 55-65 Hz band
   */
  private extractMainsHumRegion(spectrum: number[]): Float32Array {
    const binWidth = this.config.sampleRate / this.config.fftWindowSize;
    const targetBin = Math.round(this.config.targetFrequency / binWidth);
    const bandwidth = Math.ceil(10 / binWidth); // ±5 Hz around target
    
    const region = new Float32Array(bandwidth * 2);
    
    for (let i = -bandwidth; i <= bandwidth; i++) {
      const bin = targetBin + i;
      if (bin >= 0 && bin < spectrum.length) {
        // Get magnitude (amplitude) of this frequency bin
        const magnitude = Math.sqrt(
          spectrum[bin * 2] ** 2 + spectrum[bin * 2 + 1] ** 2
        );
        region[i + bandwidth] = magnitude;
      }
    }
    
    return region;
  }
  
  /**
   * Combine signatures from multiple windows
   * 
   * Creates a robust overall signature by averaging
   */
  private combineSignatures(signatures: Float32Array[]): Float32Array {
    if (signatures.length === 0) {
      throw new Error('No valid windows for fingerprinting');
    }
    
    const combined = new Float32Array(signatures[0].length);
    
    for (let i = 0; i < combined.length; i++) {
      let sum = 0;
      for (const sig of signatures) {
        sum += sig[i];
      }
      combined[i] = sum / signatures.length;
    }
    
    return combined;
  }
  
  /**
   * Assess quality of fingerprint
   * 
   * Returns how confident we are [0.0, 1.0]
   */
  private assessQuality(
    combined: Float32Array,
    signatures: Float32Array[]
  ): number {
    // Step 1: Find the mains-hum peak
    let maxValue = 0;
    let maxIndex = 0;
    for (let i = 0; i < combined.length; i++) {
      if (combined[i] > maxValue) {
        maxValue = combined[i];
        maxIndex = i;
      }
    }
    
    // Step 2: Calculate peak prominence (how much higher than neighbors)
    const leftValue = maxIndex > 0 ? combined[maxIndex - 1] : 0;
    const rightValue = maxIndex < combined.length - 1 ? combined[maxIndex + 1] : 0;
    const avgNeighbor = (leftValue + rightValue) / 2;
    const prominence = maxValue - avgNeighbor;
    
    // Step 3: Normalize prominence to [0.0, 1.0]
    const quality = Math.min(1.0, prominence / maxValue);
    
    // Step 4: Penalize if many windows have low correlation
    let consistencyScore = 0;
    for (let i = 0; i < signatures.length - 1; i++) {
      const correlation = this.correlate(signatures[i], signatures[i + 1]);
      consistencyScore += correlation;
    }
    consistencyScore /= Math.max(1, signatures.length - 1);
    
    // Final quality is average of peak quality and consistency
    return (quality + consistencyScore) / 2;
  }
  
  /**
   * Calculate correlation between two signatures
   */
  private correlate(sig1: Float32Array, sig2: Float32Array): number {
    let correlation = 0;
    for (let i = 0; i < sig1.length; i++) {
      correlation += sig1[i] * sig2[i];
    }
    // Normalize
    const norm1 = Math.sqrt(this.dotProduct(sig1, sig1));
    const norm2 = Math.sqrt(this.dotProduct(sig2, sig2));
    return (correlation / (norm1 * norm2 + 1e-10));
  }
  
  private dotProduct(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }
}
```

### 4. **Implement Fingerprint Comparison** (HIGH PRIORITY)

```typescript
export interface FingerprintComparison {
  similarity: number;           // How alike [0.0, 1.0]
  confidence: 'high' | 'medium' | 'low';  // How sure are we
  sameLocation: boolean;        // Likely same power grid
  timingAnalysis: {
    estimatedTimeDifference: number; // Seconds between recordings
    sameGridRegion: boolean;
  };
}

export class MainsHumExtractor {
  /**
   * Compare two fingerprints
   * 
   * Returns how similar they are and if from same location
   */
  async compare(
    fp1: Fingerprint,
    fp2: Fingerprint
  ): Promise<FingerprintComparison> {
    // Step 1: Check if from same power grid region
    if (fp1.targetFrequency !== fp2.targetFrequency) {
      return {
        similarity: 0,
        confidence: 'high',
        sameLocation: false,
        timingAnalysis: {
          estimatedTimeDifference: 0,
          sameGridRegion: false
        }
      };
    }
    
    // Step 2: Compute similarity (0.0 = different, 1.0 = identical)
    const similarity = this.computeSimilarity(fp1.signature, fp2.signature);
    
    // Step 3: Determine confidence based on both quality scores
    const avgQuality = (fp1.quality + fp2.quality) / 2;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (avgQuality > 0.7) confidence = 'high';
    else if (avgQuality > 0.4) confidence = 'medium';
    
    // Step 4: Check if likely same location
    const sameLocation = similarity > 0.7;
    
    // Step 5: Estimate time difference (advanced, can stub for now)
    const timingAnalysis = {
      estimatedTimeDifference: 0,
      sameGridRegion: sameLocation
    };
    
    return {
      similarity,
      confidence,
      sameLocation,
      timingAnalysis
    };
  }
  
  /**
   * Compute cross-correlation between two signatures
   */
  private computeSimilarity(sig1: Float32Array, sig2: Float32Array): number {
    // Find peak of cross-correlation with different time shifts
    let maxCorrelation = 0;
    
    for (let shift = -20; shift <= 20; shift++) {
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < Math.min(sig1.length, sig2.length); i++) {
        const idx2 = i + shift;
        if (idx2 >= 0 && idx2 < sig2.length) {
          correlation += sig1[i] * sig2[idx2];
          count++;
        }
      }
      
      correlation /= count;
      maxCorrelation = Math.max(maxCorrelation, correlation);
    }
    
    // Normalize to [0.0, 1.0]
    return Math.min(1.0, Math.max(0.0, maxCorrelation));
  }
}
```

### 5. **Add Tamper Detection** (MEDIUM PRIORITY)

```typescript
export interface TamperAnalysis {
  likelyTampered: boolean;
  indicators: {
    editingArtifacts: boolean;  // Discontinuities in hum
    spliceDetected: boolean;    // Jump in frequency
    deepfakeScore: number;      // 0.0 = likely real, 1.0 = likely fake
  };
}

export class MainsHumExtractor {
  async analyzeTamperingRisk(fp: Fingerprint): Promise<TamperAnalysis> {
    // Step 1: Check for discontinuities
    const editingArtifacts = this.detectDiscontinuities(fp.signature);
    
    // Step 2: Check for frequency jumps (indicates splicing)
    const spliceDetected = this.detectSplices(fp.signature);
    
    // Step 3: Compute deepfake likelihood
    const deepfakeScore = editingArtifacts ? 0.8 : 0.2;
    
    return {
      likelyTampered: editingArtifacts || spliceDetected,
      indicators: {
        editingArtifacts,
        spliceDetected,
        deepfakeScore
      }
    };
  }
  
  private detectDiscontinuities(signature: Float32Array): boolean {
    // Look for sudden jumps in the signature
    for (let i = 1; i < signature.length; i++) {
      const jump = Math.abs(signature[i] - signature[i - 1]);
      if (jump > 0.5) {  // Threshold
        return true;
      }
    }
    return false;
  }
  
  private detectSplices(signature: Float32Array): boolean {
    // Look for frequency discontinuities (bin shifts)
    const diffs: number[] = [];
    for (let i = 1; i < signature.length; i++) {
      diffs.push(Math.abs(signature[i] - signature[i - 1]));
    }
    
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const outliers = diffs.filter(d => d > meanDiff * 2).length;
    
    return outliers > 5;  // Many discontinuities suggest splicing
  }
}
```

## How to Use This Module

### Step 1: Extract Fingerprint from Recording

```typescript
// In orchestrator/index.ts
const extractor = new MainsHumExtractor({
  sampleRate: 44100,
  fftWindowSize: 4096,
  targetFrequency: 60,  // Or 50 for Europe/Asia
  minDuration: 5
});

// Get audio samples (from microphone, file, etc.)
const audioSamples = await loadAudioFile('recording.wav');

// Extract fingerprint
const fingerprint = await extractor.extract(audioSamples);
console.log('Fingerprint quality:', fingerprint.quality);

if (fingerprint.quality < 0.5) {
  console.warn('Poor fingerprint quality - may not be reliable for verification');
}
```

### Step 2: Compare Fingerprints

```typescript
// When receiving a peer report
const peerAudio = await getPeerAudioRecording();
const peerFingerprint = await extractor.extract(peerAudio);

const comparison = await extractor.compare(fingerprint, peerFingerprint);

if (comparison.sameLocation && comparison.similarity > 0.8) {
  console.log('✅ Same location and time - recordings likely authentic');
} else {
  console.log('❌ Different location/time - recordings not synchronized');
}
```

### Step 3: Detect Tampering

```typescript
// Before publishing
const tamper = await extractor.analyzeTamperingRisk(fingerprint);

if (tamper.likelyTampered) {
  console.warn('⚠️ Audio may have been edited or deepfaked');
  console.warn('Indicators:', tamper.indicators);
}
```

## Checklist for Completing This Module

- [ ] Install fft-js library
- [ ] Implement FFT extraction with Hann windowing
- [ ] Implement mains-hum region extraction
- [ ] Implement fingerprint combination from multiple windows
- [ ] Implement quality assessment
- [ ] Implement fingerprint comparison (cross-correlation)
- [ ] Implement tampering detection
- [ ] Test with real audio files (50Hz and 60Hz regions)
- [ ] Add error handling for invalid audio
- [ ] Document frequency thresholds and detection parameters

## Real-World Example

```
Recording 1: Made in New York with iPhone mic
  → Fingerprint: 60Hz signature with quality 0.92
  
Recording 2: Made in same location, same time with Android mic
  → Fingerprint: 60Hz signature with quality 0.88
  
Compare: Similarity 0.94, confidence "high", sameLocation true
  ✅ These are authentic recordings from the same event

Recording 3: Deepfaked/edited version of Recording 1
  → Fingerprint: 60Hz with quality 0.45 (low quality)
  → Tampering analysis: editingArtifacts detected
  ✅ System detects this is likely not authentic
```

## Key Takeaways

1. **Mains-hum is powerful** - Almost impossible to fake without knowing exact grid characteristics
2. **FFT is essential** - Converting to frequency domain reveals the hum clearly
3. **Quality assessment matters** - Poor quality fingerprints can give false results
4. **Multiple windows improve accuracy** - Averaging multiple FFT windows makes it robust

## Next Steps

1. Install FFT library and test basic FFT on sample audio
2. Implement Hann windowing and FFT extraction
3. Extract the 50/60 Hz region from test audio
4. Implement quality assessment
5. Test comparison function with recorded audio pairs
6. Add tampering detection
