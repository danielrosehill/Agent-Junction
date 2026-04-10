import { useState, useEffect, useRef, useCallback } from "react";
import type {
  PeerStatus,
  JunctionEvent,
  Snapshot,
  MessageAnimation,
} from "../types";

const ANIMATION_DURATION_MS = 2500;

export interface JunctionState {
  peers: Map<string, PeerStatus>;
  activeMessages: MessageAnimation[];
  connectionStatus: "connected" | "connecting" | "disconnected";
  uptime: number;
}

export function useJunctionEvents(baseUrl: string): JunctionState {
  const [peers, setPeers] = useState<Map<string, PeerStatus>>(new Map());
  const [activeMessages, setActiveMessages] = useState<MessageAnimation[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("connecting");
  const [uptime, setUptime] = useState(0);
  const animIdRef = useRef(0);

  const addMessageAnimation = useCallback(
    (fromAlias: string, toAlias: string) => {
      const id = `msg-${++animIdRef.current}`;
      const anim: MessageAnimation = {
        id,
        fromAlias,
        toAlias,
        startTime: performance.now(),
      };
      setActiveMessages((prev) => [...prev, anim]);
      setTimeout(() => {
        setActiveMessages((prev) => prev.filter((m) => m.id !== id));
      }, ANIMATION_DURATION_MS);
    },
    []
  );

  useEffect(() => {
    const eventsUrl = `${baseUrl}/events`;
    let es: EventSource;

    function connect() {
      setConnectionStatus("connecting");
      es = new EventSource(eventsUrl);

      es.addEventListener("snapshot", (e: MessageEvent) => {
        const data: Snapshot = JSON.parse(e.data);
        const map = new Map<string, PeerStatus>();
        for (const peer of data.peers) {
          map.set(peer.alias, peer);
        }
        setPeers(map);
        setUptime(data.uptime);
        setConnectionStatus("connected");
      });

      es.addEventListener("peer_joined", (e: MessageEvent) => {
        const event: JunctionEvent = JSON.parse(e.data);
        if (event.alias) {
          setPeers((prev) => {
            const next = new Map(prev);
            next.set(event.alias!, {
              alias: event.alias!,
              connectedAt: event.timestamp,
              lastActivity: event.timestamp,
              context: event.context,
              inboxSize: 0,
            });
            return next;
          });
        }
      });

      es.addEventListener("peer_left", (e: MessageEvent) => {
        const event: JunctionEvent = JSON.parse(e.data);
        if (event.alias) {
          setPeers((prev) => {
            const next = new Map(prev);
            next.delete(event.alias!);
            return next;
          });
        }
      });

      es.addEventListener("message_sent", (e: MessageEvent) => {
        const event: JunctionEvent = JSON.parse(e.data);
        if (event.fromAlias && event.toAlias) {
          addMessageAnimation(event.fromAlias, event.toAlias);
        }
      });

      es.onerror = () => {
        setConnectionStatus("disconnected");
        es.close();
        // Auto-reconnect after 3s
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      es?.close();
    };
  }, [baseUrl, addMessageAnimation]);

  // Update uptime every second when connected
  useEffect(() => {
    if (connectionStatus !== "connected") return;
    const timer = setInterval(() => {
      setUptime((u) => u + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [connectionStatus]);

  return { peers, activeMessages, connectionStatus, uptime };
}
