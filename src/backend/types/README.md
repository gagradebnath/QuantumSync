# Types Module

## Overview

The **Types module** defines all TypeScript interfaces and type definitions used throughout the framework. Think of it as a "contract" or "blueprint" that tells every other module what shape the data should have.

**Analogy**: If the framework is a building, types are the architectural drawings that every worker must follow.

## What This Module Does

### Core Responsibilities

1. **Defines Data Structures** - Specifies how different pieces of data should be formatted
2. **Ensures Type Safety** - Prevents mixing incompatible data types (TypeScript catches errors before runtime)
3. **Documents Interfaces** - Shows developers exactly what parameters functions expect
4. **Standardizes Communication** - Ensures all modules speak the same "language"

## File Structure

```
types/
└── index.ts          # All type definitions (11 KB)
```

## Current State

✅ **COMPLETE**: The file contains ~200+ type definitions for:
- Media items and metadata
- Cryptographic keys and signatures
- Database schemas
- Network messages
- Configuration objects
- Result/Response types

**Status**: ✅ Production-ready for referencing

## What Needs to Be Done

### 1. **Validate Types Against Actual Implementation** (HIGH PRIORITY)
**What it means**: Check if the types defined here match what the other modules actually use.

**Example**: 
- If `types/index.ts` says "encryption key is 32 bytes"
- But `crypto/pq-crypto.ts` uses 64 bytes
- There's a mismatch that will cause bugs

**Steps to do this**:
```
1. Read types/index.ts completely
2. As you build crypto/pq-crypto.ts, check if the types match
3. If not, UPDATE the types first
4. All other code must follow the types
```

### 2. **Add Runtime Validation** (MEDIUM PRIORITY)
**What it means**: Add code to check if real-world data matches the type definitions.

**Example**:
```typescript
// types/index.ts currently just defines:
interface MediaItem {
  id: string;
  title: string;
  duration: number;
}

// But should also have a validator function:
function validateMediaItem(obj: any): obj is MediaItem {
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.duration === 'number' &&
    obj.duration > 0
  );
}
```

**Why**: TypeScript types disappear when code runs. You need runtime checks.

### 3. **Add JSDoc Comments** (MEDIUM PRIORITY)
**What it means**: Add detailed comments explaining what each type is for.

**Example** (currently missing):
```typescript
/**
 * Represents an audio/video media item
 * @property id - Unique identifier (UUID v4)
 * @property title - User-provided title (max 256 chars)
 * @property duration - Length in seconds
 * @property mediaType - 'audio' or 'video'
 * @example
 * const media: MediaItem = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   title: 'Protest Recording',
 *   duration: 300,
 *   mediaType: 'audio'
 * };
 */
interface MediaItem {
  id: string;
  title: string;
  duration: number;
  mediaType: 'audio' | 'video';
}
```

### 4. **Create Type Guards** (MEDIUM PRIORITY)
**What it means**: Helper functions to check if unknown data is of a specific type.

**Example**:
```typescript
export function isMediaItem(value: unknown): value is MediaItem {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.duration === 'number'
  );
}
```

**Why**: When receiving data from the network or user input, you need to verify it's what you expect.

### 5. **Add Error Type Definitions** (LOW PRIORITY)
**What it means**: Define all possible errors the framework can throw.

**Example**:
```typescript
export class InvalidMediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMediaError';
  }
}

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoError';
  }
}
```

## How to Use This Module

### Step 1: Study the Types
```typescript
// In other modules, you'll import types:
import type { MediaItem, Fingerprint, FrameworkConfig } from '../types';
```

### Step 2: Use Types in Function Parameters
```typescript
// In crypto/pq-crypto.ts:
async function encryptMetadata(
  metadata: MediaMetadata,    // Type from types/index.ts
  recipients: Uint8Array[]
): Promise<EncryptedData> {   // Type from types/index.ts
  // Implementation here
}
```

### Step 3: Return Data with Correct Types
```typescript
function createMediaItem(title: string): MediaItem {
  return {
    id: generateUUID(),      // Must be string
    title,                    // Must be string
    duration: 0,              // Must be number
    mediaType: 'audio'        // Must be 'audio' | 'video'
  };
}
```

## Checklist for Completing This Module

- [ ] **Read** the entire types/index.ts file carefully
- [ ] **List** all types that are defined
- [ ] **Check** if each type has JSDoc comments (most don't - add them)
- [ ] **Create** validator functions for each major type
- [ ] **Create** type guard functions (isMediaItem, isFingerprintValid, etc.)
- [ ] **Define** custom error classes for different failure scenarios
- [ ] **Test** that validators work correctly with sample data

## Example: What a Complete Type Definition Looks Like

```typescript
/**
 * Represents an extracted audio fingerprint for tamper detection
 * 
 * The fingerprint captures the unique electrical grid frequency (50/60 Hz)
 * characteristics at the time of recording, enabling verification that the
 * audio was recorded at a specific time and general location.
 * 
 * @property signature - The frequency domain representation (FFT output)
 * @property timestamp - When the fingerprint was extracted
 * @property quality - Confidence in the fingerprint [0.0, 1.0]
 * 
 * @example
 * const fingerprint: Fingerprint = {
 *   signature: new Float32Array([0.1, 0.2, 0.3, ...]),
 *   timestamp: Date.now(),
 *   quality: 0.85,
 *   sampleRate: 44100,
 *   duration: 300
 * };
 * 
 * if (validateFingerprint(fingerprint)) {
 *   console.log('Valid fingerprint');
 * }
 */
interface Fingerprint {
  signature: Float32Array;
  timestamp: number;
  quality: number;
  sampleRate: number;
  duration: number;
}

/**
 * Validates if the provided value is a valid Fingerprint object
 * 
 * Checks:
 * - signature is a typed array with samples
 * - timestamp is a valid date
 * - quality is between 0 and 1
 * - sampleRate is standard (44100, 48000, etc.)
 * - duration is positive
 */
export function validateFingerprint(value: unknown): value is Fingerprint {
  if (typeof value !== 'object' || value === null) return false;
  
  const fp = value as Record<string, unknown>;
  
  return (
    fp.signature instanceof Float32Array &&
    fp.signature.length > 0 &&
    typeof fp.timestamp === 'number' &&
    fp.timestamp > 0 &&
    typeof fp.quality === 'number' &&
    fp.quality >= 0 && fp.quality <= 1 &&
    typeof fp.sampleRate === 'number' &&
    [44100, 48000, 96000].includes(fp.sampleRate as number) &&
    typeof fp.duration === 'number' &&
    fp.duration > 0
  );
}
```

## Key Takeaways

1. **Types are the foundation** - Get these right before building anything else
2. **Types prevent bugs** - TypeScript catches errors during development
3. **Validators are essential** - Real-world data can be malformed
4. **Documentation matters** - Future you (and others) will thank you for clear comments

## Next Steps

1. Study the current types/index.ts
2. Add JSDoc comments to all types
3. Create validator/guard functions
4. Start building other modules while checking they match these types
