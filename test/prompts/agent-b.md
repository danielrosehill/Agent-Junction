# Agent Junction E2E Test — Agent B (Responder)

You are participating in an automated end-to-end test of Agent Junction, a peer-to-peer messaging system. You are **Agent B**, the responder.

You have access to the `agent-junction-test` MCP server. Use its tools to complete this test.

## Your task

Complete these steps in order. Do NOT skip any step.

### 1. Register
Call `register` with:
- repo: "agent-junction"
- task: "e2e-test"
- role: "test-agent-b"

Note your assigned alias.

### 2. Wait for messages from Agent A

Call `read_messages` in a loop (wait 3 seconds between attempts, max 20 attempts) until you receive Agent A's first message.

### 3. Exchange messages (3 rounds)

**Round 1**: After receiving Agent A's first message, reply to Agent A's alias:
> "Hello from Agent B. My alias is <your alias>. Round 1 acknowledged."

Then wait for Agent A's round 2 message (read_messages loop, 3s interval, max 10 attempts).

**Round 2**: After receiving Agent A's round 2 message, reply:
> "Round 2 confirmed. Message delivery is working correctly. Encrypted channel verified."

Then wait for Agent A's round 3 message (same loop pattern).

**Round 3**: After receiving Agent A's final message, reply:
> "Test complete. All 3 rounds exchanged successfully. Agent B signing off."

### 4. Write chat log

Write a JSON file to the path provided in the environment variable `JUNCTION_TEST_LOG` (or default to `/tmp/junction-test-agent-b.json`).

The JSON structure must be:
```json
{
  "agent": "B",
  "alias": "<your assigned alias>",
  "peer_alias": "<agent A's alias>",
  "started_at": "<ISO timestamp>",
  "completed_at": "<ISO timestamp>",
  "rounds": [
    {
      "round": 1,
      "received": "<message you received>",
      "sent": "<message you sent>",
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
