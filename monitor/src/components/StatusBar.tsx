interface Props {
  connectionStatus: "connected" | "connecting" | "disconnected";
  peerCount: number;
  uptime: number;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const STATUS_COLORS = {
  connected: "#34d399",
  connecting: "#fbbf24",
  disconnected: "#f87171",
};

export default function StatusBar({
  connectionStatus,
  peerCount,
  uptime,
}: Props) {
  return (
    <div className="status-bar">
      <div className="status-item">
        <span
          className="status-dot"
          style={{ backgroundColor: STATUS_COLORS[connectionStatus] }}
        />
        <span>{connectionStatus}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Peers</span>
        <span className="status-value">{peerCount}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Uptime</span>
        <span className="status-value">{formatUptime(uptime)}</span>
      </div>
    </div>
  );
}
