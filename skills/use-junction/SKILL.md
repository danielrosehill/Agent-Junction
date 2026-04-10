---
name: use-junction
description: Use Agent Junction for real-time inter-agent communication. Register on the junction, discover peers, and exchange encrypted messages between Claude Code instances. Use when coordinating multiple agents, handing off context to a peer, or broadcasting information. Triggers on phrases like "use the junction", "talk to the other agent", "inter-agent comms", "junction message".
---

# Use Agent Junction

Agent Junction is a streamable-HTTP MCP server providing encrypted peer-to-peer messaging between Claude Code instances. Default port: **4200**.

## Prerequisites

1. The Agent Junction server must be running (`npx agent-junction` or from the repo with `npm start`).
2. Your Claude Code instance must have the MCP connection configured:

```json
{
  "mcpServers": {
    "agent-junction": {
      "type": "streamable-http",
      "url": "http://localhost:4200/mcp"
    }
  }
}
```

Verify the server is reachable by checking `http://localhost:4200/health`.

## Available Tools

| Tool | Parameters | Returns |
|------|-----------|---------|
| `register` | `repo?`, `task?`, `role?` | `{ alias, sessionId, peerCount, context }` |
| `list_peers` | _(none)_ | `[{ alias, connectedAt, context }]` |
| `send_message` | `target_alias`, `message` | `{ delivered, to }` |
| `read_messages` | _(none)_ | `[{ from, message, timestamp }]` -- **DESTRUCTIVE READ** |
| `wait_for_peer` | `timeout_seconds?`, `expected_role?` | `{ found, peers, waited_seconds }` |
| `known_hosts` | _(none)_ | `[{ name, mcpUrl, healthUrl }]` |
| `disconnect` | _(none)_ | `{ disconnected }` |

## Step-by-Step Usage

### 1. Register with Context

Always register with all three context fields so other agents can discover you:

```
register(repo: "my-project", task: "refactoring auth module", role: "worker")
```

You receive a unique alias (e.g. `alpha-fox`) and can see how many peers are already connected.

### 2. Discover Peers

Use `list_peers` to see who else is on the junction. Each peer entry includes their alias and context (repo, task, role).

If you need to wait for a specific peer (e.g. a spawned agent that hasn't connected yet), use `wait_for_peer`:

```
wait_for_peer(timeout_seconds: 60, expected_role: "handover-receiver")
```

This blocks until a matching peer appears or the timeout expires (max 120s).

### 3. Send Messages

Send structured JSON payloads for machine-readable inter-agent communication:

```
send_message(
  target_alias: "bravo-owl",
  message: JSON.stringify({
    type: "task_assignment",
    repo: "my-project",
    branch: "feature/auth",
    instructions: "Review the auth middleware changes and run tests"
  })
)
```

Recommended message types:
- `task_assignment` -- delegate work to a peer
- `status_update` -- report progress
- `handover_ready` -- signal that a handover document is available
- `query` -- ask a peer a question
- `response` -- reply to a query
- `broadcast` -- information for all peers (send to each individually)

### 4. Read Messages

`read_messages` returns all pending messages and **clears your inbox**. Messages are gone after reading. Parse the JSON payloads immediately and act on them:

```
read_messages()
// Returns: [{ from: "alpha-fox", message: "{\"type\":\"status_update\",...}", timestamp: "..." }]
```

Poll periodically if waiting for a response. There is no push notification -- you must pull.

### 5. Disconnect When Done

Always call `disconnect` at the end of your workflow. This zeros your encryption key and purges session data:

```
disconnect()
```

## Common Patterns

### Coordinator / Worker

1. **Coordinator** registers with `role: "coordinator"`, spawns worker agents.
2. Each **worker** registers with `role: "worker"` and a descriptive `task`.
3. Coordinator uses `list_peers` to track workers, sends task assignments via `send_message`.
4. Workers send `status_update` messages back. Coordinator polls with `read_messages`.

### Handoff

1. **Sender** registers with `role: "handover-sender"`, does investigation work.
2. Sender writes a HANDOVER.md, then sends a notification:
   ```json
   {"type": "handover_ready", "repo": "my-project", "branch": "main", "handover_path": "HANDOVER.md"}
   ```
3. **Receiver** registers with `role: "handover-receiver"`, calls `read_messages`, picks up the handover path, and resumes work.

### Broadcast

There is no broadcast primitive. To notify all peers, call `list_peers`, then `send_message` to each alias individually.

### Cross-Machine Communication

Use `known_hosts` to discover other Junction servers on the LAN. Each entry provides an `mcpUrl` you can configure as a second MCP connection to talk to agents on a different machine:

```
known_hosts()
// Returns: [{ name: "workstation", mcpUrl: "http://10.0.0.5:4200/mcp", healthUrl: "http://10.0.0.5:4200/health" }]
```

Configure the remote junction as an additional MCP server to bridge agents across machines.

## Junction vs File-Based Handover

| | Agent Junction | File-based (HANDOVER.md) |
|---|---|---|
| **Timing** | Real-time, ephemeral | Async, persistent |
| **Best for** | Live coordination, parallel agents, quick pings | Session boundaries, complex context transfer |
| **Durability** | Messages disappear after read | File persists on disk |
| **Scope** | Any connected agent, including cross-machine | Same repo / filesystem |

Use **junction** when agents are running concurrently and need real-time coordination. Use **file-based handover** when passing work across session boundaries or when the full context is too large for a message.

## Error Handling

- If you get "Not registered", call `register` first.
- If `send_message` fails with an unknown alias, call `list_peers` to refresh your view.
- If `wait_for_peer` times out, the expected agent may not have started yet -- retry or check server health.
