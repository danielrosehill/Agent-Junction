export interface PeerContext {
  repo?: string;
  task?: string;
  role?: string;
}

export interface PeerStatus {
  alias: string;
  connectedAt: string;
  lastActivity: string;
  context?: PeerContext;
  inboxSize: number;
}

export interface JunctionEvent {
  type: "peer_joined" | "peer_left" | "message_sent";
  timestamp: string;
  alias?: string;
  fromAlias?: string;
  toAlias?: string;
  context?: PeerContext;
}

export interface Snapshot {
  activePeers: number;
  uptime: number;
  peers: PeerStatus[];
}

export interface MessageAnimation {
  id: string;
  fromAlias: string;
  toAlias: string;
  startTime: number;
}

export interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
