---
name: test-junction
description: Run the Agent Junction e2e test — spawns 2 Claude Code instances in Konsole that talk to each other via the junction
---

# Test Agent Junction

Run the end-to-end integration test for Agent Junction.

## What this does

1. Builds the project (`npm run build`)
2. Starts the Junction server on port 4299
3. Opens 2 Konsole tabs, each running a Claude Code instance in print mode
4. Agent A (initiator) and Agent B (responder) register, discover each other, and exchange 3 rounds of encrypted messages
5. Both agents write structured JSON chat logs to `test/logs/<timestamp>/`
6. The server shuts down after both agents finish

## Steps

1. Run the launcher script:

```bash
bash test/run-e2e.sh
```

2. Watch the two Konsole tabs — each shows the agent's stdout as it works through the test protocol.

3. When both tabs show "finished", check the results:

```bash
# Find the latest test run
LATEST=$(ls -td test/logs/*/ | head -1)

# Check success status
cat "$LATEST/agent-a.json" | python3 -m json.tool
cat "$LATEST/agent-b.json" | python3 -m json.tool
```

4. If a test failed, check the raw stdout logs:

```bash
cat "$LATEST/agent-a.json.stdout"
cat "$LATEST/agent-b.json.stdout"
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `JUNCTION_TEST_PORT` | 4299 | Port for the test junction server |

## Interpreting results

Each agent writes a JSON log with this structure:
- `success: true/false` — did all 3 rounds complete?
- `rounds[]` — sent/received messages per round
- `errors[]` — any errors encountered

A passing test has both `agent-a.json` and `agent-b.json` with `success: true` and 3 rounds each.
