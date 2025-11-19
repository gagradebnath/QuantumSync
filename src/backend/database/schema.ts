/**
 * @fileoverview Database schema definitions and migrations for the mesh media sharing framework
 * @module database/schema
 * @description Provides SQL schema definitions compatible with SQLite (mobile) and PostgreSQL (server).
 * Uses a platform-agnostic approach for cross-platform compatibility.
 */

import type { MediaItem, PeerReport, WrappedKey, EphemeralKey } from '../types';

/**
 * SQL schema for media_items table
 * Stores core media file information and fingerprint data
 */
export const MEDIA_ITEMS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS media_items (
    id TEXT PRIMARY KEY,
    local_path TEXT NOT NULL,
    media_cid TEXT NOT NULL,
    fingerprint_hash TEXT NOT NULL UNIQUE,
    fingerprint_vector BLOB NOT NULL,
    metadata_cid TEXT NOT NULL,
    anchor_tx TEXT,
    aggregated_confidence REAL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    media_type TEXT CHECK(media_type IN ('audio', 'video')) NOT NULL,
    file_size INTEGER NOT NULL,
    duration REAL NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_media_items_fingerprint_hash ON media_items(fingerprint_hash);
  CREATE INDEX IF NOT EXISTS idx_media_items_media_cid ON media_items(media_cid);
  CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items(created_at);
  CREATE INDEX IF NOT EXISTS idx_media_items_anchor_tx ON media_items(anchor_tx);
`;

/**
 * SQL schema for peer_reports table
 * Stores signed confidence reports from mesh peers
 */
export const PEER_REPORTS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS peer_reports (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL,
    peer_ephemeral_id TEXT NOT NULL,
    confidence_score REAL NOT NULL CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0),
    signature BLOB NOT NULL,
    ephemeral_pub_key BLOB NOT NULL,
    timestamp TEXT NOT NULL,
    peer_address TEXT NOT NULL,
    proximity_level TEXT CHECK(proximity_level IN ('near', 'medium', 'far')) NOT NULL,
    is_outlier BOOLEAN DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_peer_reports_media_item_id ON peer_reports(media_item_id);
  CREATE INDEX IF NOT EXISTS idx_peer_reports_timestamp ON peer_reports(timestamp);
  CREATE INDEX IF NOT EXISTS idx_peer_reports_peer_ephemeral_id ON peer_reports(peer_ephemeral_id);
`;

/**
 * SQL schema for wrapped_keys table
 * Stores KEM-wrapped encryption keys for authorized recipients
 */
export const WRAPPED_KEYS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS wrapped_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_item_id TEXT NOT NULL,
    recipient_pub BLOB NOT NULL,
    wrapped_key_blob BLOB NOT NULL,
    created_at TEXT NOT NULL,
    salt BLOB NOT NULL,
    purpose TEXT CHECK(purpose IN ('metadata', 'media', 'audit')) NOT NULL,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_wrapped_keys_media_item_id ON wrapped_keys(media_item_id);
  CREATE INDEX IF NOT EXISTS idx_wrapped_keys_purpose ON wrapped_keys(purpose);
`;

/**
 * SQL schema for ephemeral_keys table
 * Stores ephemeral key pairs for anonymous operations
 */
export const EPHEMERAL_KEYS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ephemeral_keys (
    id TEXT PRIMARY KEY,
    public_key BLOB NOT NULL UNIQUE,
    encrypted_private_key BLOB NOT NULL,
    key_type TEXT CHECK(key_type IN ('kyber', 'dilithium', 'x25519')) NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    purpose TEXT CHECK(purpose IN ('signing', 'encryption', 'ring_signature')) NOT NULL,
    ring_group_id TEXT,
    is_revoked BOOLEAN DEFAULT 0,
    revoked_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_ephemeral_keys_expires_at ON ephemeral_keys(expires_at);
  CREATE INDEX IF NOT EXISTS idx_ephemeral_keys_purpose ON ephemeral_keys(purpose);
  CREATE INDEX IF NOT EXISTS idx_ephemeral_keys_ring_group_id ON ephemeral_keys(ring_group_id);
`;

/**
 * SQL schema for mesh_peers table
 * Stores discovered mesh network peers
 */
export const MESH_PEERS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS mesh_peers (
    peer_id TEXT PRIMARY KEY,
    public_key BLOB NOT NULL,
    address TEXT NOT NULL,
    transport TEXT CHECK(transport IN ('wifi_direct', 'webrtc', 'bluetooth')) NOT NULL,
    signal_strength REAL,
    capability_fingerprint_comparison BOOLEAN DEFAULT 0,
    capability_relay_support BOOLEAN DEFAULT 0,
    capability_storage_provider BOOLEAN DEFAULT 0,
    last_seen TEXT NOT NULL,
    first_discovered TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_trusted BOOLEAN DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_mesh_peers_last_seen ON mesh_peers(last_seen);
  CREATE INDEX IF NOT EXISTS idx_mesh_peers_transport ON mesh_peers(transport);
`;

/**
 * SQL schema for relayer_nodes table
 * Stores known relayer node information
 */
export const RELAYER_NODES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS relayer_nodes (
    node_id TEXT PRIMARY KEY,
    onion_address TEXT NOT NULL UNIQUE,
    public_key BLOB NOT NULL,
    supported_chains TEXT NOT NULL, -- JSON array
    reputation_score REAL DEFAULT 0.5 CHECK(reputation_score >= 0.0 AND reputation_score <= 1.0),
    base_fee_satoshis INTEGER NOT NULL,
    per_kb_fee_satoshis INTEGER NOT NULL,
    uptime REAL DEFAULT 1.0,
    last_health_check TEXT,
    is_active BOOLEAN DEFAULT 1,
    added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_relayer_nodes_reputation_score ON relayer_nodes(reputation_score);
  CREATE INDEX IF NOT EXISTS idx_relayer_nodes_is_active ON relayer_nodes(is_active);
`;

/**
 * SQL schema for anchor_submissions table
 * Tracks anchor submission history for audit purposes
 */
export const ANCHOR_SUBMISSIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS anchor_submissions (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL,
    relayer_node_id TEXT NOT NULL,
    submission_timestamp TEXT NOT NULL,
    anchor_tx TEXT,
    status TEXT CHECK(status IN ('pending', 'submitted', 'confirmed', 'failed')) NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
    FOREIGN KEY (relayer_node_id) REFERENCES relayer_nodes(node_id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_anchor_submissions_media_item_id ON anchor_submissions(media_item_id);
  CREATE INDEX IF NOT EXISTS idx_anchor_submissions_status ON anchor_submissions(status);
`;

/**
 * SQL schema for storage_uploads table
 * Tracks media and metadata uploads to public storage
 */
export const STORAGE_UPLOADS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS storage_uploads (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL,
    provider TEXT CHECK(provider IN ('ipfs', 'arweave', 'filecoin')) NOT NULL,
    content_type TEXT CHECK(content_type IN ('media', 'metadata')) NOT NULL,
    cid TEXT NOT NULL,
    upload_timestamp TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT CHECK(status IN ('uploading', 'completed', 'failed')) NOT NULL,
    error_message TEXT,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_storage_uploads_media_item_id ON storage_uploads(media_item_id);
  CREATE INDEX IF NOT EXISTS idx_storage_uploads_cid ON storage_uploads(cid);
`;

/**
 * Complete database initialization
 * Creates all tables and indexes
 */
export const INITIALIZE_DATABASE = `
  ${MEDIA_ITEMS_SCHEMA}
  ${PEER_REPORTS_SCHEMA}
  ${WRAPPED_KEYS_SCHEMA}
  ${EPHEMERAL_KEYS_SCHEMA}
  ${MESH_PEERS_SCHEMA}
  ${RELAYER_NODES_SCHEMA}
  ${ANCHOR_SUBMISSIONS_SCHEMA}
  ${STORAGE_UPLOADS_SCHEMA}
`;

/**
 * Database migration version tracking
 */
export const MIGRATIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL
  );
`;

/**
 * Migration versions
 */
export const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial schema creation',
    sql: INITIALIZE_DATABASE,
  },
  {
    version: 2,
    description: 'Add updated_at to media_items',
    sql: `
      -- Already included in initial schema
      SELECT 1;
    `,
  },
];

/**
 * Database interface for executing queries
 */
export interface DatabaseInterface {
  execute(sql: string, params?: any[]): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  close(): Promise<void>;
}

/**
 * Initialize database with all schemas
 * @param db - Database interface implementation
 */
export async function initializeDatabase(db: DatabaseInterface): Promise<void> {
  // Create migrations table
  await db.execute(MIGRATIONS_SCHEMA);

  // Check current version
  const currentVersion = await db.query<{ version: number }>(
    'SELECT MAX(version) as version FROM schema_migrations'
  );

  const latestApplied = currentVersion[0]?.version || 0;

  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    if (migration.version > latestApplied) {
      console.log(`Applying migration ${migration.version}: ${migration.description}`);
      await db.execute(migration.sql);
      await db.execute(
        'INSERT INTO schema_migrations (version, description) VALUES (?, ?)',
        [migration.version, migration.description]
      );
    }
  }

  console.log('Database initialization complete');
}

/**
 * Prepared statement templates for common queries
 */
export const QUERIES = {
  // Media Items
  INSERT_MEDIA_ITEM: `
    INSERT INTO media_items (
      id, local_path, media_cid, fingerprint_hash, fingerprint_vector,
      metadata_cid, anchor_tx, aggregated_confidence, created_at,
      media_type, file_size, duration
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  SELECT_MEDIA_ITEM_BY_ID: `
    SELECT * FROM media_items WHERE id = ?
  `,

  SELECT_MEDIA_ITEM_BY_FINGERPRINT: `
    SELECT * FROM media_items WHERE fingerprint_hash = ?
  `,

  UPDATE_MEDIA_ITEM_CONFIDENCE: `
    UPDATE media_items 
    SET aggregated_confidence = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  UPDATE_MEDIA_ITEM_ANCHOR: `
    UPDATE media_items 
    SET anchor_tx = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  // Peer Reports
  INSERT_PEER_REPORT: `
    INSERT INTO peer_reports (
      id, media_item_id, peer_ephemeral_id, confidence_score,
      signature, ephemeral_pub_key, timestamp, peer_address, proximity_level
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  SELECT_PEER_REPORTS_BY_MEDIA: `
    SELECT * FROM peer_reports WHERE media_item_id = ? ORDER BY timestamp DESC
  `,

  // Wrapped Keys
  INSERT_WRAPPED_KEY: `
    INSERT INTO wrapped_keys (
      media_item_id, recipient_pub, wrapped_key_blob, created_at, salt, purpose
    ) VALUES (?, ?, ?, ?, ?, ?)
  `,

  SELECT_WRAPPED_KEYS_BY_MEDIA: `
    SELECT * FROM wrapped_keys WHERE media_item_id = ? AND purpose = ?
  `,

  // Ephemeral Keys
  INSERT_EPHEMERAL_KEY: `
    INSERT INTO ephemeral_keys (
      id, public_key, encrypted_private_key, key_type,
      created_at, expires_at, purpose, ring_group_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,

  SELECT_EPHEMERAL_KEY_BY_ID: `
    SELECT * FROM ephemeral_keys WHERE id = ? AND is_revoked = 0
  `,

  SELECT_EPHEMERAL_KEYS_BY_PURPOSE: `
    SELECT * FROM ephemeral_keys 
    WHERE purpose = ? AND is_revoked = 0 AND expires_at > datetime('now')
    ORDER BY created_at DESC
  `,

  REVOKE_EPHEMERAL_KEY: `
    UPDATE ephemeral_keys 
    SET is_revoked = 1, revoked_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
};
