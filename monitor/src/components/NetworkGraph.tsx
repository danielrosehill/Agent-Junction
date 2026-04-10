import { useRef, useEffect, useCallback } from "react";
import type { PeerStatus, MessageAnimation, NodePosition } from "../types";

const NODE_RADIUS = 28;
const PULSE_DURATION_MS = 2500;
const PULSE_MAX_RADIUS = 60;

const ROLE_COLORS: Record<string, string> = {
  coordinator: "#f0b429",
  researcher: "#4a9eff",
  reviewer: "#34d399",
  worker: "#a78bfa",
  "handover-sender": "#f97316",
  "handover-receiver": "#06b6d4",
};

const DEFAULT_NODE_COLOR = "#2dd4bf";
const ARC_COLOR = "#38bdf8";
const BG_COLOR = "#0d1117";
const TEXT_COLOR = "#e6edf3";
const SUBTLE_COLOR = "#484f58";

// Junction hub — the central node
const HUB_COLOR = "#8b5cf6";
const HUB_RADIUS = 22;

interface Props {
  peers: Map<string, PeerStatus>;
  activeMessages: MessageAnimation[];
  positions: Map<string, NodePosition>;
  width: number;
  height: number;
  selectedPeer: string | null;
  onSelectPeer: (alias: string | null) => void;
}

export default function NetworkGraph({
  peers,
  activeMessages,
  positions,
  width,
  height,
  selectedPeer,
  onSelectPeer,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const getNodeColor = useCallback((peer: PeerStatus) => {
    const role = peer.context?.role;
    if (role && ROLE_COLORS[role]) return ROLE_COLORS[role];
    return DEFAULT_NODE_COLOR;
  }, []);

  // Click detection
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const [alias, pos] of positions) {
        const dx = mx - pos.x;
        const dy = my - pos.y;
        if (dx * dx + dy * dy < NODE_RADIUS * NODE_RADIUS) {
          onSelectPeer(alias === selectedPeer ? null : alias);
          return;
        }
      }
      onSelectPeer(null);
    },
    [positions, selectedPeer, onSelectPeer]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      const now = performance.now();
      ctx!.clearRect(0, 0, width, height);

      // Background
      ctx!.fillStyle = BG_COLOR;
      ctx!.fillRect(0, 0, width, height);

      // Subtle grid
      ctx!.strokeStyle = "#161b22";
      ctx!.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, height);
        ctx!.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(width, y);
        ctx!.stroke();
      }

      const cx = width / 2;
      const cy = height / 2;

      // Draw hub (junction center)
      ctx!.beginPath();
      ctx!.arc(cx, cy, HUB_RADIUS, 0, Math.PI * 2);
      ctx!.fillStyle = HUB_COLOR + "30";
      ctx!.fill();
      ctx!.strokeStyle = HUB_COLOR;
      ctx!.lineWidth = 2;
      ctx!.stroke();

      // Hub label
      ctx!.fillStyle = HUB_COLOR;
      ctx!.font = "10px monospace";
      ctx!.textAlign = "center";
      ctx!.fillText("JUNCTION", cx, cy + 4);

      // Hub pulse when any messages are active
      if (activeMessages.length > 0) {
        const pulsePhase = (now % 1000) / 1000;
        const pulseR = HUB_RADIUS + pulsePhase * 20;
        ctx!.beginPath();
        ctx!.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx!.strokeStyle =
          HUB_COLOR + Math.round((1 - pulsePhase) * 80).toString(16).padStart(2, "0");
        ctx!.lineWidth = 2;
        ctx!.stroke();
      }

      // Draw spokes from hub to each peer
      for (const [, pos] of positions) {
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(pos.x, pos.y);
        ctx!.strokeStyle = SUBTLE_COLOR + "40";
        ctx!.lineWidth = 1;
        ctx!.setLineDash([4, 8]);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }

      // Determine which aliases are "active" (involved in current messages)
      const activeAliases = new Set<string>();
      for (const msg of activeMessages) {
        activeAliases.add(msg.fromAlias);
        activeAliases.add(msg.toAlias);
      }

      // Draw message arcs
      for (const msg of activeMessages) {
        const fromPos = positions.get(msg.fromAlias);
        const toPos = positions.get(msg.toAlias);
        if (!fromPos || !toPos) continue;

        const progress = (now - msg.startTime) / PULSE_DURATION_MS;
        if (progress > 1) continue;

        const alpha = 1 - progress;

        // Arc line
        ctx!.beginPath();
        ctx!.moveTo(fromPos.x, fromPos.y);
        // Curve through the hub
        ctx!.quadraticCurveTo(cx, cy, toPos.x, toPos.y);
        ctx!.strokeStyle =
          ARC_COLOR +
          Math.round(alpha * 200)
            .toString(16)
            .padStart(2, "0");
        ctx!.lineWidth = 3;
        ctx!.stroke();

        // Traveling particle
        const t = Math.min(progress * 1.5, 1); // particle moves faster than fade
        const px =
          (1 - t) * (1 - t) * fromPos.x +
          2 * (1 - t) * t * cx +
          t * t * toPos.x;
        const py =
          (1 - t) * (1 - t) * fromPos.y +
          2 * (1 - t) * t * cy +
          t * t * toPos.y;

        ctx!.beginPath();
        ctx!.arc(px, py, 5, 0, Math.PI * 2);
        ctx!.fillStyle = "#ffffff";
        ctx!.shadowColor = ARC_COLOR;
        ctx!.shadowBlur = 12;
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }

      // Draw peer nodes
      for (const [alias, pos] of positions) {
        const peer = peers.get(alias);
        if (!peer) continue;

        const color = getNodeColor(peer);
        const isActive = activeAliases.has(alias);
        const isSelected = alias === selectedPeer;

        // Pulse rings for active nodes
        if (isActive) {
          for (const msg of activeMessages) {
            if (msg.fromAlias !== alias && msg.toAlias !== alias) continue;
            const progress = (now - msg.startTime) / PULSE_DURATION_MS;
            if (progress > 1) continue;

            const ringRadius =
              NODE_RADIUS + progress * (PULSE_MAX_RADIUS - NODE_RADIUS);
            const ringAlpha = 1 - progress;

            ctx!.beginPath();
            ctx!.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2);
            ctx!.strokeStyle =
              color +
              Math.round(ringAlpha * 150)
                .toString(16)
                .padStart(2, "0");
            ctx!.lineWidth = 2;
            ctx!.stroke();
          }
        }

        // Node glow
        if (isActive) {
          ctx!.shadowColor = color;
          ctx!.shadowBlur = 20;
        }

        // Node circle
        ctx!.beginPath();
        ctx!.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);
        ctx!.fillStyle = isActive ? color + "40" : color + "20";
        ctx!.fill();
        ctx!.strokeStyle = isSelected ? "#ffffff" : color;
        ctx!.lineWidth = isSelected ? 3 : 2;
        ctx!.stroke();
        ctx!.shadowBlur = 0;

        // Alias label
        ctx!.fillStyle = TEXT_COLOR;
        ctx!.font = "bold 11px monospace";
        ctx!.textAlign = "center";
        ctx!.fillText(alias, pos.x, pos.y + 4);

        // Role badge below
        const role = peer.context?.role;
        if (role) {
          ctx!.fillStyle = SUBTLE_COLOR;
          ctx!.font = "9px monospace";
          ctx!.fillText(role, pos.x, pos.y + NODE_RADIUS + 14);
        }
      }

      // "No peers" state
      if (peers.size === 0) {
        ctx!.fillStyle = SUBTLE_COLOR;
        ctx!.font = "14px monospace";
        ctx!.textAlign = "center";
        ctx!.fillText(
          "Waiting for agents to connect...",
          cx,
          cy + HUB_RADIUS + 50
        );
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [
    peers,
    activeMessages,
    positions,
    width,
    height,
    selectedPeer,
    getNodeColor,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      style={{ display: "block", cursor: "pointer" }}
    />
  );
}
