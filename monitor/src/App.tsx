import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useJunctionEvents } from "./hooks/useJunctionEvents";
import { useGraphLayout } from "./hooks/useGraphLayout";
import NetworkGraph from "./components/NetworkGraph";
import PeerDetail from "./components/PeerDetail";
import StatusBar from "./components/StatusBar";

declare global {
  interface Window {
    junction?: {
      onUrl: (cb: (url: string) => void) => void;
      defaultUrl: string;
    };
  }
}

function useJunctionUrl(): string {
  const [url, setUrl] = useState(
    window.junction?.defaultUrl ?? "http://localhost:4200"
  );

  useEffect(() => {
    window.junction?.onUrl((u) => setUrl(u));
  }, []);

  return url;
}

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export default function App() {
  const junctionUrl = useJunctionUrl();
  const { peers, activeMessages, connectionStatus, uptime } =
    useJunctionEvents(junctionUrl);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useContainerSize(containerRef);

  const aliases = useMemo(() => Array.from(peers.keys()), [peers]);
  const positions = useGraphLayout(aliases, width, height);

  const handleSelectPeer = useCallback((alias: string | null) => {
    setSelectedPeer(alias);
  }, []);

  const selectedPeerData = selectedPeer ? peers.get(selectedPeer) ?? null : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Agent Junction Monitor</h1>
        <span className="header-url">{junctionUrl}</span>
      </header>
      <div className="app-body">
        <div className="graph-container" ref={containerRef}>
          <NetworkGraph
            peers={peers}
            activeMessages={activeMessages}
            positions={positions}
            width={width}
            height={height}
            selectedPeer={selectedPeer}
            onSelectPeer={handleSelectPeer}
          />
        </div>
        <PeerDetail
          peer={selectedPeerData}
          onClose={() => setSelectedPeer(null)}
        />
      </div>
      <StatusBar
        connectionStatus={connectionStatus}
        peerCount={peers.size}
        uptime={uptime}
      />
    </div>
  );
}
