import { EventEmitter } from "node:events";
import { generateKey, encrypt, decrypt, zeroKey } from "./crypto.js";
import { generateAlias } from "./aliases.js";
import type {
  JunctionConfig,
  JunctionEvent,
  PeerSession,
  PeerInfo,
  PeerStatus,
  PeerContext,
  DecodedMessage,
  RegisterResult,
} from "./types.js";

export class Junction {
  private sessions = new Map<string, PeerSession>();
  private aliasBySession = new Map<string, string>();
  private sessionByAlias = new Map<string, string>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private config: JunctionConfig;
  public readonly events = new EventEmitter();

  constructor(config: JunctionConfig) {
    this.config = config;
    this.sweepTimer = setInterval(
      () => this.sweepExpired(),
      config.sweepIntervalMs
    );
  }

  register(sessionId: string, context?: PeerContext): RegisterResult {
    // If already registered, update context and return existing info
    const existing = this.sessions.get(sessionId);
    if (existing) {
      existing.lastActivity = new Date();
      if (context) existing.context = context;
      return {
        alias: existing.alias,
        sessionId,
        peerCount: this.sessions.size - 1,
        context: existing.context,
      };
    }

    const existingAliases = new Set(this.sessionByAlias.keys());
    const alias = generateAlias(existingAliases);
    const encryptionKey = generateKey();

    const session: PeerSession = {
      sessionId,
      alias,
      encryptionKey,
      inbox: [],
      connectedAt: new Date(),
      lastActivity: new Date(),
      context,
    };

    this.sessions.set(sessionId, session);
    this.aliasBySession.set(sessionId, alias);
    this.sessionByAlias.set(alias, sessionId);

    const event: JunctionEvent = {
      type: "peer_joined",
      timestamp: new Date().toISOString(),
      alias,
      context,
    };
    this.events.emit("peer_joined", event);

    return {
      alias,
      sessionId,
      peerCount: this.sessions.size - 1,
      context,
    };
  }

  listPeers(sessionId: string): PeerInfo[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Not registered. Call register first.");
    }
    session.lastActivity = new Date();

    const peers: PeerInfo[] = [];
    for (const [id, peer] of this.sessions) {
      if (id !== sessionId) {
        peers.push({
          alias: peer.alias,
          connectedAt: peer.connectedAt.toISOString(),
          context: peer.context,
        });
      }
    }
    return peers;
  }

  sendMessage(
    senderSessionId: string,
    targetAlias: string,
    message: string
  ): void {
    const sender = this.sessions.get(senderSessionId);
    if (!sender) {
      throw new Error("Not registered. Call register first.");
    }
    sender.lastActivity = new Date();

    const targetSessionId = this.sessionByAlias.get(targetAlias);
    if (!targetSessionId) {
      throw new Error(`Peer "${targetAlias}" not found.`);
    }

    const target = this.sessions.get(targetSessionId);
    if (!target) {
      throw new Error(`Peer "${targetAlias}" not found.`);
    }

    // Encrypt with target's key
    const { ciphertext, iv, authTag } = encrypt(message, target.encryptionKey);

    target.inbox.push({
      fromAlias: sender.alias,
      ciphertext,
      iv,
      authTag,
      timestamp: new Date(),
    });

    const event: JunctionEvent = {
      type: "message_sent",
      timestamp: new Date().toISOString(),
      fromAlias: sender.alias,
      toAlias: targetAlias,
    };
    this.events.emit("message_sent", event);
  }

  readMessages(sessionId: string): DecodedMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Not registered. Call register first.");
    }
    session.lastActivity = new Date();

    const messages: DecodedMessage[] = session.inbox.map((msg) => ({
      from: msg.fromAlias,
      message: decrypt(msg.ciphertext, msg.iv, msg.authTag, session.encryptionKey),
      timestamp: msg.timestamp.toISOString(),
    }));

    // Destructive read — clear inbox
    session.inbox = [];

    return messages;
  }

  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const event: JunctionEvent = {
      type: "peer_left",
      timestamp: new Date().toISOString(),
      alias: session.alias,
    };
    this.events.emit("peer_left", event);

    // Zero the encryption key
    zeroKey(session.encryptionKey);

    // Remove from all maps
    this.sessionByAlias.delete(session.alias);
    this.aliasBySession.delete(sessionId);
    this.sessions.delete(sessionId);
  }

  getStatus(): PeerStatus[] {
    const peers: PeerStatus[] = [];
    for (const session of this.sessions.values()) {
      peers.push({
        alias: session.alias,
        connectedAt: session.connectedAt.toISOString(),
        lastActivity: session.lastActivity.toISOString(),
        context: session.context,
        inboxSize: session.inbox.length,
      });
    }
    return peers;
  }

  getActivePeerCount(): number {
    return this.sessions.size;
  }

  shutdown(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }

    // Zero all keys and clear state
    for (const session of this.sessions.values()) {
      zeroKey(session.encryptionKey);
    }
    this.sessions.clear();
    this.aliasBySession.clear();
    this.sessionByAlias.clear();
  }

  private sweepExpired(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > this.config.sessionTimeoutMs) {
        expired.push(sessionId);
      }
    }

    for (const sessionId of expired) {
      this.disconnect(sessionId);
    }

    if (expired.length > 0) {
      console.log(`Swept ${expired.length} expired session(s)`);
    }
  }
}
