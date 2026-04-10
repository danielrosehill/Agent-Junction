---
name: inject-junction
description: Modify an existing Claude Code skill to add Agent Junction awareness — registration, peer discovery, and message exchange. Injects junction blocks at appropriate points in the skill workflow. Primary use case is junction-enabling handover skills. Triggers on phrases like "inject junction", "junction-enable this skill", "add junction to handover", "make this skill junction-aware".
---

# Inject Junction Awareness into a Skill

This skill modifies existing Claude Code skill files in-place to add Agent Junction registration, peer discovery, and messaging at appropriate workflow points.

## Input

`$ARGUMENTS` is the path to the target skill file.

**Default target:** `~/.claude/skills/handover-with-tasks/SKILL.md`

If `$ARGUMENTS` is empty, use the default. If a path is provided, use that instead.

## Procedure

### 1. Back Up the Original

Before making any changes, copy the target file to a `.bak` alongside it:

```bash
cp "$TARGET" "${TARGET}.bak"
```

Confirm the backup exists before proceeding.

### 2. Read and Analyze the Skill

Read the target skill file fully. Identify its structure -- most skills follow a pattern like:

1. **Investigation / setup phase** -- gathering context, reading files, understanding the repo
2. **Action phase** -- performing the core work (writing files, running commands)
3. **Output phase** -- producing artifacts (HANDOVER.md, reports, summaries)
4. **Handoff phase** -- spawning a new session, notifying the user, or completing

Map each section of the skill to one of these phases. Note the exact markdown headings or numbered steps that delineate them.

### 3. Inject Junction Blocks

All injected content MUST be wrapped in markers:

```markdown
<!-- JUNCTION: begin -->
(injected content here)
<!-- JUNCTION: end -->
```

#### For Handover Skills Specifically

These injection points apply to handover-style skills (like `handover-with-tasks`):

**After the investigation/setup phase**, inject a registration block:

```markdown
<!-- JUNCTION: begin -->
### Register on Agent Junction

After completing the investigation phase, register on the junction so peers can discover this session:

\`\`\`
register(repo: "<current repo>", task: "handover-sender preparing handover", role: "handover-sender")
\`\`\`

Note your assigned alias for later messaging.
<!-- JUNCTION: end -->
```

**After writing HANDOVER.md** (or the skill's primary output artifact), inject a peer notification block:

```markdown
<!-- JUNCTION: begin -->
### Notify Peers via Junction

After writing the handover document, check for connected peers and send a structured notification:

1. Call `list_peers` to see if any agents are already waiting.
2. If peers are present, send a notification to each:
   ```
   send_message(target_alias: "<peer_alias>", message: JSON.stringify({
     type: "handover_ready",
     repo: "<current repo>",
     branch: "<current branch>",
     handover_path: "HANDOVER.md"
   }))
   ```
3. If no peers are connected, the handover document on disk is sufficient -- the next agent will pick it up from the filesystem.
<!-- JUNCTION: end -->
```

**At the spawn/new-session step**, inject receiver guidance:

```markdown
<!-- JUNCTION: begin -->
### Junction-Aware Session Startup

When spawning or guiding the new session, include these instructions in the prompt or HANDOVER.md:

> On startup, register on Agent Junction with `role: "handover-receiver"`. Then call `read_messages` to pick up any pending notifications from the sender. After completing the handover tasks, call `disconnect`.

If the sender is still connected, the receiver can use `send_message` to ask clarifying questions in real time before the sender disconnects.
<!-- JUNCTION: end -->
```

**At the end of the workflow**, inject a disconnect block:

```markdown
<!-- JUNCTION: begin -->
### Disconnect from Junction

Call `disconnect` to zero the encryption key and purge session data. Do this as the final step, after all messaging is complete.
<!-- JUNCTION: end -->
```

#### Generic Injection Rules (Any Skill Type)

When the target is not a handover skill, follow these general rules:

1. **Register at the start of the investigation/setup phase.** Place the registration block after any initial file reads or context gathering, with `role` set to something descriptive of the skill's purpose.

2. **Notify peers after producing artifacts.** Whenever the skill writes an output file, generates a report, or completes a major action, inject a notification block that sends a structured JSON message to connected peers describing what was produced.

3. **Disconnect at the end of the workflow.** Place a disconnect block as the final step before the skill completes.

4. **Do not inject messaging into purely local/solo skills.** If the skill has no handoff, no spawned sessions, and no multi-agent coordination, registration and disconnect alone are sufficient (skip send/receive blocks). Only add messaging when the skill naturally involves peer interaction.

### 4. Show Diff to User

After preparing the injected version, show a summary of changes to the user before writing:

- List each injection point (heading or step number where content was added)
- Show the injected blocks
- Ask for confirmation before writing the modified file

Only write the changes after the user confirms.

### 5. Write the Modified Skill

Apply all injected blocks to the target file using the Edit tool. Preserve all original content -- only add new blocks at the identified injection points.

## Removing Junction Blocks

To remove previously injected junction awareness from a skill, search for all `<!-- JUNCTION: begin -->` / `<!-- JUNCTION: end -->` comment pairs and delete everything between them (inclusive). Alternatively, restore from the `.bak` file.

## Example: Handover-with-Tasks Injection Summary

For the default target `~/.claude/skills/handover-with-tasks/SKILL.md`, expect four injection points:

1. After the "investigate the current state" step -- **register**
2. After "write HANDOVER.md" step -- **notify peers**
3. At the "spawn new session" step -- **receiver guidance**
4. At the end -- **disconnect**

The original skill behavior is fully preserved. Junction blocks are additive only.
