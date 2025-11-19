# Database Module

## Overview

The **Database module** manages persistent data storage. Think of it as the "memory" of the framework—where all important data is saved so it survives after the application restarts.

**Analogy**: If the framework is a person, the database is their long-term memory. Without it, they'd forget everything when they go to sleep.

## What This Module Does

### Core Responsibilities

1. **Store Media Metadata** - Save information about published media (title, description, fingerprint)
2. **Track Peer Reports** - Record what other devices say about a recording
3. **Persist Encryption Keys** - Store wrapped keys securely for later decryption
4. **Store Blockchain Anchors** - Keep records of what was published to the blockchain
5. **Maintain Relayer Information** - Track which relayers are available and their reputation

## File Structure

```
database/
└── schema.ts          # Database schemas and queries (11.7 KB)
```

## Database Tables Overview

The schema.ts file should define 8 tables:

### 1. **media_items**
Stores core information about published media files

```
Columns:
- id (PRIMARY KEY)           - Unique identifier
- media_cid (UNIQUE)         - IPFS hash of the media file
- metadata_cid               - IPFS hash of encrypted metadata
- fingerprint_hash           - Hash of the audio fingerprint
- created_at                 - When it was published
- confidence_score           - How trustworthy is this media [0.0, 1.0]
```

### 2. **peer_reports**
Stores what other devices said about a recording

```
Columns:
- id (PRIMARY KEY)           - Unique identifier
- media_item_id (FOREIGN KEY) - Links to media_items
- peer_id                    - Which device sent this report
- similarity_score           - How similar their recording is [0.0, 1.0]
- signature                  - Cryptographic signature (proof they did this)
- created_at                 - When report was received
```

### 3. **wrapped_keys**
Stores encrypted decryption keys for different recipients

```
Columns:
- id (PRIMARY KEY)           - Unique identifier
- media_item_id (FOREIGN KEY) - Which media this key unlocks
- recipient_id               - Who can use this key
- wrapped_key                - The encrypted key
- kem_ciphertext             - Kyber encapsulation
```

### 4. **ephemeral_keys**
Stores temporary keys used during publication

```
Columns:
- id (PRIMARY KEY)           - Unique identifier
- media_item_id (FOREIGN KEY) - Associated media
- public_key                 - The temporary public key
- created_at                 - When created
- expires_at                 - When it becomes invalid
```

### 5. **mesh_peers**
Stores information about discovered peers in the local network

```
Columns:
- id (PRIMARY KEY)           - Unique identifier
- peer_id (UNIQUE)           - Network address of the peer
- transport_type             - 'webrtc', 'bluetooth', 'wifi-direct'
- last_seen                  - When we last communicated
- reputation_score           - Trust level [0.0, 1.0]
- verified_reports           - How many correct reports they've made
```

### 6. **relayer_nodes**
Stores information about available relayers

```
Columns:
- id (PRIMARY KEY)           - Unique identifier
- relayer_address (UNIQUE)   - Network address (e.g., onion address)
- public_key                 - Cryptographic key for verification
- reputation_score           - How trustworthy [0.0, 1.0]
- last_used                  - When we last submitted through them
- fees                       - Cost to use this relayer
```

### 7. **anchor_submissions**
Stores records of media published to blockchain

```
Columns:
- id (PRIMARY KEY)           - Unique identifier
- media_item_id (FOREIGN KEY) - Which media was anchored
- transaction_hash           - Blockchain transaction ID
- block_number               - Which block it was in
- ring_signature             - Proof that an anonymous member published it
- created_at                 - When submitted
- confirmed_at               - When blockchain confirmed it
```

### 8. **storage_uploads**
Tracks what has been uploaded to IPFS/Arweave

```
Columns:
- id (PRIMARY KEY)           - Unique identifier
- cid                        - Content ID (IPFS hash)
- storage_provider           - 'ipfs' or 'arweave'
- content_type               - 'media' or 'metadata'
- size_bytes                 - File size
- uploaded_at                - Timestamp
- pinned_at                  - When it was secured for permanence
```

## Current State

⚠️ **PARTIAL**: The file contains SQL schema definitions but:

**What exists** ✅
- Schema DDL statements (CREATE TABLE)
- Column definitions with types
- Primary and foreign keys
- Index definitions

**What's MISSING** ❌
- Abstract database interface (works with SQLite AND PostgreSQL)
- Query helper functions
- Migration system
- Connection pooling
- Error handling

## What Needs to Be Done

### 1. **Create Database Interface** (HIGH PRIORITY)

**What it means**: An abstract layer that works with both SQLite and PostgreSQL.

**Why**: You might use SQLite on mobile but PostgreSQL on servers. The interface lets you swap them without changing code.

**Example**:
```typescript
// database/interface.ts
export interface DatabaseInterface {
  // Queries
  execute(sql: string, params?: any[]): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  get<T>(sql: string, params?: any[]): Promise<T | null>;
  
  // Transactions
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
```

### 2. **Implement SQLite Adapter** (HIGH PRIORITY)

**What it means**: Make SQLite work with your interface.

**Steps**:
```typescript
// database/sqlite.ts
import Database from 'better-sqlite3';

export class SQLiteDatabase implements DatabaseInterface {
  private db: Database.Database;
  
  async connect() {
    this.db = new Database('./data/media_sharing.db');
    // Create tables if they don't exist
  }
  
  async execute(sql: string, params?: any[]) {
    const stmt = this.db.prepare(sql);
    stmt.run(...(params || []));
  }
  
  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...(params || [])) as T[];
  }
  
  // ... implement other methods
}
```

### 3. **Implement PostgreSQL Adapter** (MEDIUM PRIORITY)

**What it means**: Make PostgreSQL work with your interface.

**Steps**:
```typescript
// database/postgres.ts
import pg from 'pg';

export class PostgresDatabase implements DatabaseInterface {
  private pool: pg.Pool;
  
  async connect() {
    this.pool = new pg.Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    
    // Create tables if they don't exist
    await this.initializeSchema();
  }
  
  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }
  
  // ... implement other methods
}
```

### 4. **Create Query Helpers** (HIGH PRIORITY)

**What it means**: Functions that make common operations easier.

**Example**:
```typescript
// database/queries.ts
export class MediaQueries {
  constructor(private db: DatabaseInterface) {}
  
  async saveMediaItem(item: MediaItem): Promise<string> {
    const id = generateUUID();
    await this.db.execute(
      `INSERT INTO media_items (id, media_cid, metadata_cid, fingerprint_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, item.mediaCid, item.metadataCid, item.fingerprintHash, Date.now()]
    );
    return id;
  }
  
  async getMediaItem(id: string): Promise<MediaItem | null> {
    return this.db.get<MediaItem>(
      'SELECT * FROM media_items WHERE id = ?',
      [id]
    );
  }
  
  async getMediaByFingerprint(hash: string): Promise<MediaItem[]> {
    return this.db.query<MediaItem>(
      'SELECT * FROM media_items WHERE fingerprint_hash = ?',
      [hash]
    );
  }
}
```

### 5. **Implement Migration System** (MEDIUM PRIORITY)

**What it means**: Version control for your database schema.

**Why**: When you add new features, you need to change table structure. Migrations track these changes.

**Example**:
```typescript
// database/migrations.ts
export const migrations = [
  {
    version: 1,
    up: async (db: DatabaseInterface) => {
      await db.execute(`CREATE TABLE media_items (...)`);
      await db.execute(`CREATE TABLE peer_reports (...)`);
    },
    down: async (db: DatabaseInterface) => {
      await db.execute('DROP TABLE media_items');
      await db.execute('DROP TABLE peer_reports');
    }
  },
  {
    version: 2,
    up: async (db: DatabaseInterface) => {
      // Add new column for new feature
      await db.execute(
        'ALTER TABLE media_items ADD COLUMN verified_at TIMESTAMP'
      );
    },
    down: async (db: DatabaseInterface) => {
      await db.execute(
        'ALTER TABLE media_items DROP COLUMN verified_at'
      );
    }
  }
];

export async function runMigrations(db: DatabaseInterface) {
  const currentVersion = await db.get(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );
  
  const targetVersion = migrations.length;
  
  for (let v = (currentVersion?.version || 0) + 1; v <= targetVersion; v++) {
    await migrations[v - 1].up(db);
    await db.execute(
      'INSERT INTO schema_version (version) VALUES (?)',
      [v]
    );
  }
}
```

### 6. **Add Connection Pooling** (MEDIUM PRIORITY)

**What it means**: Reuse database connections for better performance.

**Why**: Creating new connections is slow. Pooling keeps them open and reuses them.

**Example**:
```typescript
// database/pool.ts
export class DatabasePool {
  private connections: DatabaseInterface[] = [];
  private available: DatabaseInterface[] = [];
  
  async init(size: number = 10) {
    for (let i = 0; i < size; i++) {
      const db = createDatabaseInstance();
      await db.connect();
      this.connections.push(db);
      this.available.push(db);
    }
  }
  
  async acquire(): Promise<DatabaseInterface> {
    while (this.available.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return this.available.pop()!;
  }
  
  release(db: DatabaseInterface) {
    this.available.push(db);
  }
}
```

### 7. **Error Handling** (MEDIUM PRIORITY)

**What it means**: Handle database errors gracefully.

**Example**:
```typescript
// database/errors.ts
export class DatabaseError extends Error {
  constructor(message: string, public query: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class UniqueConstraintError extends DatabaseError {
  constructor(query: string) {
    super('Unique constraint violated', query);
    this.name = 'UniqueConstraintError';
  }
}

export class ForeignKeyError extends DatabaseError {
  constructor(query: string) {
    super('Foreign key constraint violated', query);
    this.name = 'ForeignKeyError';
  }
}

// In your query functions:
try {
  await db.execute(sql, params);
} catch (error) {
  if (error.code === 'UNIQUE_VIOLATION') {
    throw new UniqueConstraintError(sql);
  }
  throw new DatabaseError(error.message, sql);
}
```

## How to Use This Module

### Step 1: Initialize Database
```typescript
// In main.ts or app.ts
import { SQLiteDatabase } from './database/sqlite';

const db = new SQLiteDatabase();
await db.connect();
// Database is now ready to use
```

### Step 2: Use Query Helpers
```typescript
import { MediaQueries } from './database/queries';

const queries = new MediaQueries(db);
const mediaId = await queries.saveMediaItem({
  mediaCid: 'QmXxxx...',
  metadataCid: 'QmYyyy...',
  fingerprintHash: 'abcd1234...',
});
```

### Step 3: Retrieve Data
```typescript
const media = await queries.getMediaItem(mediaId);
console.log('Published:', media.created_at);

const matches = await queries.getMediaByFingerprint(fingerprintHash);
console.log('Found', matches.length, 'matching recordings');
```

## Checklist for Completing This Module

- [ ] **Create** database interface (works with SQLite and PostgreSQL)
- [ ] **Implement** SQLite adapter with connection handling
- [ ] **Implement** PostgreSQL adapter with connection pooling
- [ ] **Write** query helper functions for all main operations
- [ ] **Create** migration system for schema versioning
- [ ] **Add** error handling and custom error classes
- [ ] **Test** database operations with sample data
- [ ] **Document** how to switch between SQLite and PostgreSQL

## Simple Starting Point

If you're completely new, start with just SQLite:

```typescript
// database/simple-sqlite.ts
import Database from 'better-sqlite3';
import { MediaItem, PeerReport } from '../types';

export class SimpleDatabase {
  private db: Database.Database;
  
  constructor(filePath = './data/media.db') {
    this.db = new Database(filePath);
    this.initTables();
  }
  
  private initTables() {
    // Create all tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_items (
        id TEXT PRIMARY KEY,
        media_cid TEXT NOT NULL,
        metadata_cid TEXT,
        fingerprint_hash TEXT,
        created_at INTEGER NOT NULL,
        confidence_score REAL DEFAULT 0.5
      );
      
      CREATE TABLE IF NOT EXISTS peer_reports (
        id TEXT PRIMARY KEY,
        media_item_id TEXT NOT NULL,
        peer_id TEXT NOT NULL,
        similarity_score REAL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (media_item_id) REFERENCES media_items(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_media_cid ON media_items(media_cid);
      CREATE INDEX IF NOT EXISTS idx_fingerprint ON media_items(fingerprint_hash);
    `);
  }
  
  // Save a media item
  saveMedia(item: MediaItem) {
    const stmt = this.db.prepare(`
      INSERT INTO media_items (id, media_cid, metadata_cid, fingerprint_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(item.id, item.mediaCid, item.metadataCid, item.fingerprintHash, Date.now());
  }
  
  // Get a media item
  getMedia(id: string): MediaItem | null {
    const stmt = this.db.prepare('SELECT * FROM media_items WHERE id = ?');
    return stmt.get(id) as MediaItem | null;
  }
  
  // Get all peer reports for a media item
  getPeerReports(mediaItemId: string): PeerReport[] {
    const stmt = this.db.prepare('SELECT * FROM peer_reports WHERE media_item_id = ?');
    return stmt.all(mediaItemId) as PeerReport[];
  }
  
  // Close connection
  close() {
    this.db.close();
  }
}
```

Then use it:
```typescript
const db = new SimpleDatabase();
db.saveMedia({
  id: '123',
  mediaCid: 'QmXxx',
  metadata_cid: 'QmYyy',
  fingerprintHash: 'abc123'
});

const media = db.getMedia('123');
console.log(media);
db.close();
```

## Key Takeaways

1. **Database is your source of truth** - All important data lives here
2. **Interfaces enable flexibility** - You can swap SQLite for PostgreSQL easily
3. **Migrations are essential** - Plan for schema changes from day one
4. **Error handling matters** - Database errors can be cryptic; handle them clearly

## Next Steps

1. Decide: SQLite for MVP, PostgreSQL for production
2. Create the database interface
3. Implement one adapter (SQLite first)
4. Write query helpers for media storage
5. Test with real data
