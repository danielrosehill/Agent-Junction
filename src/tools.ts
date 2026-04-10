import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Junction } from "./junction.js";
import type { JunctionConfig } from "./types.js";

export function registerTools(
  server: McpServer,
  junction: Junction,
  sessionId: string,
  config: JunctionConfig
): void {
  server.tool(
    "register",
    "Join the Agent Junction. Optionally provide context about what you're working on so other peers can discover you by role/task. Returns your unique alias and how many other peers are connected.",
    {
      repo: z.string().optional().describe("The repository or project you are working in"),
      task: z.string().optional().describe("What you are currently doing"),
      role: z.string().optional().describe("Your role in a multi-agent workflow (e.g. 'researcher', 'orchestrator', 'reviewer')"),
    },
    async ({ repo, task, role }) => {
      const context = (repo || task || role) ? { repo, task, role } : undefined;
      const result = junction.register(sessionId, context);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "list_peers",
    "List all other peers currently connected to this Junction.",
    {},
    async () => {
      try {
        const peers = junction.listPeers(sessionId);
        return {
          content: [
            {
              type: "text" as const,
              text:
                peers.length === 0
                  ? "No other peers connected."
                  : JSON.stringify(peers, null, 2),
            },
          ],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "send_message",
    "Send an encrypted message to another peer by their alias.",
    {
      target_alias: z.string().describe("The alias of the peer to send the message to"),
      message: z.string().describe("The message content to send"),
    },
    async ({ target_alias, message }) => {
      try {
        junction.sendMessage(sessionId, target_alias, message);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ delivered: true, to: target_alias }),
            },
          ],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "read_messages",
    "Read and clear all pending messages in your inbox. Messages are deleted after reading.",
    {},
    async () => {
      try {
        const messages = junction.readMessages(sessionId);
        return {
          content: [
            {
              type: "text" as const,
              text:
                messages.length === 0
                  ? "No messages."
                  : JSON.stringify(messages, null, 2),
            },
          ],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "known_hosts",
    "List known Junction hosts on the LAN. These are pre-configured machines that may be running their own Junction server. Use their address to configure a remote Junction MCP connection.",
    {},
    async () => {
      if (config.knownHosts.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No known hosts configured. Set JUNCTION_KNOWN_HOSTS in the server environment to define LAN peers.",
            },
          ],
        };
      }

      const hosts = config.knownHosts.map((h) => ({
        name: h.name,
        mcpUrl: `http://${h.address}:${h.port}/mcp`,
        healthUrl: `http://${h.address}:${h.port}/health`,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(hosts, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "wait_for_peer",
    "Block until at least one other peer connects to the Junction, or until timeout. Useful when a spawned agent needs to wait for its parent to register before exchanging messages.",
    {
      timeout_seconds: z.number().optional().describe("Max seconds to wait (default 30, max 120)"),
      expected_role: z.string().optional().describe("If set, only match peers with this role in their context"),
    },
    async ({ timeout_seconds, expected_role }) => {
      const timeout = Math.min(timeout_seconds ?? 30, 120) * 1000;
      const start = Date.now();
      const pollInterval = 1000;

      while (Date.now() - start < timeout) {
        try {
          const peers = junction.listPeers(sessionId);
          const matched = expected_role
            ? peers.filter((p) => p.context?.role === expected_role)
            : peers;
          if (matched.length > 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({ found: true, peers: matched }, null, 2),
                },
              ],
            };
          }
        } catch (e) {
          return {
            content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
            isError: true,
          };
        }
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ found: false, reason: "timeout", waited_seconds: Math.floor((Date.now() - start) / 1000) }),
          },
        ],
      };
    }
  );

  server.tool(
    "disconnect",
    "Leave the Junction. Your encryption key is zeroed and all session data is purged.",
    {},
    async () => {
      junction.disconnect(sessionId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ disconnected: true }),
          },
        ],
      };
    }
  );
}
