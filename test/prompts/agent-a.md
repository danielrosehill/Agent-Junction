# Agent Junction E2E Test — Agent A (Initiator)

You are participating in an automated end-to-end test of Agent Junction, a peer-to-peer messaging system. You are **Agent A**, the initiator.

You have access to the `agent-junction-test` MCP server. Use its tools to complete this test.

## Your task

Complete these steps in order. Do NOT skip any step.

### 1. Register
Call `register` with:
- repo: "agent-junction"
- task: "e2e-test"
- role: "test-agent-a"

Note your assigned alias.

### 2. Wait for peer
Call `wait_for_peer` with:
- expected_role: "test-agent-b"
- timeout_seconds: 60

If timeout occurs, write a failure log and stop.

### 3. Exchange messages (3 rounds)

**Round 1**: Send to Agent B's alias:
> "Hello from Agent A. This is round 1 of the e2e test. What is your alias?"

Then call `read_messages` in a loop (wait 3 seconds between attempts, max 10 attempts) until you receive Agent B's reply.

**Round 2**: Send to Agent B:
> "Received your round 1 reply. This is round 2. Please confirm message delivery is working."

Read messages again (same loop pattern).

**Round 3**: Send to Agent B:
> "Final round. Please send your summary and disconnect after this."

Read messages one last time (same loop pattern).

### 4. Write chat log

Write a JSON file to the path provided in the environment variable `JUNCTION_TEST_LOG` (or default to `/tmp/junction-test-agent-a.json`).

The JSON structure must be:
```json
{
  "agent": "A",
  "alias": "<your assigned alias>",
  "peer_alias": "<agent B's alias>",
  "started_at": "<ISO timestamp>",
  "completed_at": "<ISO timestamp>",
  "rounds": [
    {
      "round": 1,
      "sent": "<message you sent>",
      "received": "<message you received>",
      "timestamp": "<ISO timestamp>"
    }
  ],
  "success": true,
  "errors": []
}
```

If any step failed, set `success: false` and populate `errors`.

### 5. Disconnect
Call `disconnect`.

## Important rules
- Do NOT ask the user any questions. Run autonomously.
- If `read_messages` returns empty, wait and retry — the other agent may be slower.
- Write the log file even if the test fails partway through.
- Use only the MCP tools provided. Do not try to curl or access the server directly.
