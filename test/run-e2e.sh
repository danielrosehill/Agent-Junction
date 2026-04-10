#!/usr/bin/env bash
# Agent Junction E2E Test Launcher
# Spawns the junction server + 2 Claude Code instances in Konsole tabs
# that communicate via the junction and save chat logs.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DIR="$REPO_DIR/test"
TEST_PORT="${JUNCTION_TEST_PORT:-4299}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="$TEST_DIR/logs/$TIMESTAMP"
PROMPT_A="$TEST_DIR/prompts/agent-a.md"
PROMPT_B="$TEST_DIR/prompts/agent-b.md"
MCP_CONFIG="$TEST_DIR/mcp-config.json"
SERVER_PID=""

mkdir -p "$LOG_DIR"

cleanup() {
  echo ""
  echo "=== Cleaning up ==="
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "Stopping junction server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  echo "Done."
}
trap cleanup EXIT

echo "=== Agent Junction E2E Test ==="
echo "Repo:      $REPO_DIR"
echo "Port:      $TEST_PORT"
echo "Log dir:   $LOG_DIR"
echo ""

# --- Step 1: Build ---
echo "--- Building project ---"
cd "$REPO_DIR"
npm run build
echo ""

# --- Step 2: Start junction server ---
echo "--- Starting junction server on port $TEST_PORT ---"
JUNCTION_PORT="$TEST_PORT" node "$REPO_DIR/dist/index.js" &
SERVER_PID=$!

# Wait for server to be ready
for i in $(seq 1 15); do
  if curl -sf "http://127.0.0.1:$TEST_PORT/health" >/dev/null 2>&1; then
    echo "Server ready."
    break
  fi
  if [[ $i -eq 15 ]]; then
    echo "ERROR: Server failed to start after 15 seconds."
    exit 1
  fi
  sleep 1
done
echo ""

# --- Step 3: Read prompts ---
PROMPT_A_CONTENT="$(cat "$PROMPT_A")"
PROMPT_B_CONTENT="$(cat "$PROMPT_B")"

# --- Step 4: Create wrapper scripts for each agent ---
# These run claude in print mode with the MCP config and prompt,
# then signal completion via a marker file.

AGENT_A_SCRIPT="$LOG_DIR/run-agent-a.sh"
cat > "$AGENT_A_SCRIPT" << 'AGENT_A_EOF'
#!/usr/bin/env bash
set -euo pipefail
LOG_FILE="$1"
MCP_CFG="$2"
PROMPT_FILE="$3"
DONE_MARKER="$4"

export JUNCTION_TEST_LOG="$LOG_FILE"

echo "=== Agent A starting ==="
echo "Log file: $LOG_FILE"
echo ""

PROMPT="$(cat "$PROMPT_FILE")

Write your chat log JSON to: $LOG_FILE"

claude -p "$PROMPT" \
  --mcp-config "$MCP_CFG" \
  --allowedTools "mcp__agent-junction-test__*,Write,Bash,Read" \
  --model sonnet \
  2>&1 | tee "$LOG_FILE.stdout"

touch "$DONE_MARKER"
echo ""
echo "=== Agent A finished. Press Enter to close. ==="
read -r
AGENT_A_EOF
chmod +x "$AGENT_A_SCRIPT"

AGENT_B_SCRIPT="$LOG_DIR/run-agent-b.sh"
cat > "$AGENT_B_SCRIPT" << 'AGENT_B_EOF'
#!/usr/bin/env bash
set -euo pipefail
LOG_FILE="$1"
MCP_CFG="$2"
PROMPT_FILE="$3"
DONE_MARKER="$4"

export JUNCTION_TEST_LOG="$LOG_FILE"

echo "=== Agent B starting ==="
echo "Log file: $LOG_FILE"
echo ""

PROMPT="$(cat "$PROMPT_FILE")

Write your chat log JSON to: $LOG_FILE"

claude -p "$PROMPT" \
  --mcp-config "$MCP_CFG" \
  --allowedTools "mcp__agent-junction-test__*,Write,Bash,Read" \
  --model sonnet \
  2>&1 | tee "$LOG_FILE.stdout"

touch "$DONE_MARKER"
echo ""
echo "=== Agent B finished. Press Enter to close. ==="
read -r
AGENT_B_EOF
chmod +x "$AGENT_B_SCRIPT"

# --- Step 5: Launch agents in Konsole tabs ---
echo "--- Launching agents in Konsole ---"

DONE_A="$LOG_DIR/.done-a"
DONE_B="$LOG_DIR/.done-b"

konsole --new-tab -e bash "$AGENT_A_SCRIPT" \
  "$LOG_DIR/agent-a.json" "$MCP_CONFIG" "$PROMPT_A" "$DONE_A" &

# Small delay so Agent A registers first (it uses wait_for_peer)
sleep 2

konsole --new-tab -e bash "$AGENT_B_SCRIPT" \
  "$LOG_DIR/agent-b.json" "$MCP_CONFIG" "$PROMPT_B" "$DONE_B" &

echo "Agents launched. Waiting for completion..."
echo "(Watching for marker files in $LOG_DIR)"
echo ""

# --- Step 6: Wait for both agents to finish ---
TIMEOUT=300  # 5 minutes max
ELAPSED=0
while [[ $ELAPSED -lt $TIMEOUT ]]; do
  if [[ -f "$DONE_A" && -f "$DONE_B" ]]; then
    echo "Both agents completed!"
    break
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  if (( ELAPSED % 30 == 0 )); then
    echo "  ...still waiting ($ELAPSED seconds elapsed)"
  fi
done

if [[ $ELAPSED -ge $TIMEOUT ]]; then
  echo "WARNING: Timed out after $TIMEOUT seconds."
fi

# --- Step 7: Report ---
echo ""
echo "=== Test Results ==="
echo "Log directory: $LOG_DIR"
echo ""

for LOG in "$LOG_DIR"/agent-*.json; do
  if [[ -f "$LOG" ]]; then
    AGENT_NAME="$(basename "$LOG" .json)"
    SUCCESS="$(python3 -c "import json,sys; d=json.load(open('$LOG')); print(d.get('success','unknown'))" 2>/dev/null || echo "parse-error")"
    echo "  $AGENT_NAME: success=$SUCCESS"
  fi
done

echo ""
echo "Full logs:"
ls -la "$LOG_DIR/"
echo ""
echo "=== Done ==="
