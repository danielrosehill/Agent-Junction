export interface JunctionConfig {
  port: number;
  host: string;
  sessionTimeoutMs: number;
  sweepIntervalMs: number;
  knownHosts: KnownHost[];
}

export interface KnownHost {
  name: string;
  address: string;
  port: number;
}

export interface PeerSession {
  sessionId: string;
  alias: string;
  encryptionKey: Buffer;
  inbox: EncryptedMessage[];
  connectedAt: Date;
  lastActivity: Date;
  context?: PeerContext;
}

export interface PeerContext {
  repo?: string;
  task?: string;
  role?: string;
}

export interface EncryptedMessage {
  fromAlias: string;
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  timestamp: Date;
}

export interface PeerInfo {
  alias: string;
  connectedAt: string;
  context?: PeerContext;
}

export interface DecodedMessage {
  from: string;
  message: string;
  timestamp: string;
}

export interface RegisterResult {
  alias: string;
  sessionId: string;
  peerCount: number;
  context?: PeerContext;
}
