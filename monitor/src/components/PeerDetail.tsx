import type { PeerStatus } from "../types";

interface Props {
  peer: PeerStatus | null;
  onClose: () => void;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

export default function PeerDetail({ peer, onClose }: Props) {
  if (!peer) return null;

  return (
    <div className="peer-detail">
      <div className="peer-detail-header">
        <h3>{peer.alias}</h3>
        <button onClick={onClose} className="close-btn">
          x
        </button>
      </div>
      <div className="peer-detail-body">
        <div className="detail-row">
          <span className="detail-label">Connected</span>
          <span className="detail-value">{timeAgo(peer.connectedAt)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Last active</span>
          <span className="detail-value">{timeAgo(peer.lastActivity)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Inbox</span>
          <span className="detail-value">
            {peer.inboxSize} message{peer.inboxSize !== 1 ? "s" : ""}
          </span>
        </div>
        {peer.context?.role && (
          <div className="detail-row">
            <span className="detail-label">Role</span>
            <span className="detail-value">{peer.context.role}</span>
          </div>
        )}
        {peer.context?.repo && (
          <div className="detail-row">
            <span className="detail-label">Repo</span>
            <span className="detail-value">{peer.context.repo}</span>
          </div>
        )}
        {peer.context?.task && (
          <div className="detail-row">
            <span className="detail-label">Task</span>
            <span className="detail-value">{peer.context.task}</span>
          </div>
        )}
      </div>
    </div>
  );
}
