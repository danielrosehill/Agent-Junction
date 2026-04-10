import { useRef, useEffect, useCallback } from "react";
import type { NodePosition } from "../types";

const REPULSION = 8000;
const CENTER_GRAVITY = 0.02;
const DAMPING = 0.85;
const MIN_DISTANCE = 80;

export function useGraphLayout(
  aliases: string[],
  width: number,
  height: number
): Map<string, NodePosition> {
  const positionsRef = useRef<Map<string, NodePosition>>(new Map());

  // Add new nodes at random positions, remove stale ones
  useEffect(() => {
    const current = positionsRef.current;
    const aliasSet = new Set(aliases);

    // Remove nodes that are no longer present
    for (const key of current.keys()) {
      if (!aliasSet.has(key)) {
        current.delete(key);
      }
    }

    // Add new nodes
    const cx = width / 2;
    const cy = height / 2;
    for (const alias of aliases) {
      if (!current.has(alias)) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 50 + Math.random() * 100;
        current.set(alias, {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        });
      }
    }
  }, [aliases, width, height]);

  const tick = useCallback(() => {
    const positions = positionsRef.current;
    const nodes = Array.from(positions.entries());
    const cx = width / 2;
    const cy = height / 2;

    // Apply forces
    for (let i = 0; i < nodes.length; i++) {
      const [, a] = nodes[i];
      let fx = 0;
      let fy = 0;

      // Center gravity
      fx += (cx - a.x) * CENTER_GRAVITY;
      fy += (cy - a.y) * CENTER_GRAVITY;

      // Repulsion from other nodes
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const [, b] = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIN_DISTANCE) dist = MIN_DISTANCE;
        const force = REPULSION / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      a.vx = (a.vx + fx) * DAMPING;
      a.vy = (a.vy + fy) * DAMPING;
      a.x += a.vx;
      a.y += a.vy;

      // Clamp to canvas bounds
      const margin = 60;
      a.x = Math.max(margin, Math.min(width - margin, a.x));
      a.y = Math.max(margin, Math.min(height - margin, a.y));
    }

    return new Map(positions);
  }, [width, height]);

  return tick();
}
