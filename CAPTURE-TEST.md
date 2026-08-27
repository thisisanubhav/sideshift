# Capture setup

## 1. Tool and model

| | |
|---|---|
| **Tool** | Claude Code (VS Code extension, running on the Claude Agent SDK) |
| **Model** | `claude-opus-5` — one model, both planning and execution. No planner/executor split, no mid-build model switch. If one happens it will show up in the `model:` field of the affected log entries. |
| **Automatic capture mechanism?** | Yes. Claude Code supports lifecycle hooks declared in `.claude/settings.json`. The two that matter here are `UserPromptSubmit` (fires when a prompt is submitted, and receives the prompt text on stdin) and `Stop` (fires at end of turn, and receives a path to the session transcript on stdin). Both fire on their own — nothing has to be remembered. |

## 2. The mechanism, and what I changed

**Config file changed:** [.claude/settings.json](.claude/settings.json)

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command",
      "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/capture_agent_log.py\" prompt" }] }],
    "Stop":             [{ "hooks": [{ "type": "command",
      "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/capture_agent_log.py\" response" }] }]
  }
}
```

**Script:** [.claude/hooks/capture_agent_log.py](.claude/hooks/capture_agent_log.py)

- `UserPromptSubmit` hands the script the prompt verbatim. It is written verbatim.
- `Stop` hands the script only `transcript_path`. The script reads that JSONL,
  walks it backwards to the last assistant message carrying text, and writes
  that. It keeps `type: "text"` blocks and **drops `thinking` and `tool_use`
  blocks**, so no reasoning, no tool calls, no file reads, no diffs land in the log.
- One file per session, `YYYY-MM-DD_HH-MM-SS_<session-id>.md`, in the format the
  brief specifies. Frontmatter `total_exchanges` and `last_prompt_time` are
  rewritten on each append.

**Log location:** `.agent-logs/` — committed, and explicitly *not* in `.gitignore`
(verified with `git check-ignore`).

## 3. Canary log file

<!-- PENDING: filled in once the canaries land. See section 5. -->

## 4. What I tried first that did not work

**`hash(text)` for the Stop-hook dedup guard.** The `Stop` event can fire more
than once per turn, so the script keeps a digest of the last response written and
skips a repeat. I used Python's builtin `hash()`. It failed the moment I tested it
across three separate process invocations: `PYTHONHASHSEED` is randomised per
process, so every run produced a different digest and every run appended a
duplicate `RESPONSE` entry. Test showed 2 entries where 1 was wanted. Replaced
with `hashlib.sha256`, retested, 1 entry.

**Dedup state file written into `.agent-logs/`.** First version dropped a
`.last-<session-id>` marker next to the log. That directory ships with the repo
and should contain the log and nothing else, so the state moved to the OS temp
directory.

**A zsh footgun that made me misread a test.** My cleanup line was
`rm -rf "$T/.agent-logs" /tmp/claude-agentlog-*.sha`. The glob matched nothing, and
zsh's `nomatch` aborts the whole command rather than passing the pattern through —
so `rm` never ran, the test executed against stale state, and I briefly thought the
sha256 fix hadn't worked. It had. Re-ran with the cleanup fixed.

**Verification before wiring anything up.** I pipe-tested the raw script with a
synthetic transcript containing a thinking block, an intermediate `"Let me check
that."` text block, a `tool_use` block, and a final answer — then grepped the
output to confirm only the final answer survived. It did; the string planted in the
thinking block appears zero times.

## 5. Honest note on when this was installed

**Capture was installed partway through the build, not before it.** The capture
brief reached me after Phase 0 (planning and design) and Phase 1 (schema, RLS,
auth, first deploy) were already done and committed, and partway into Phase 2
(seed data).

So `.agent-logs/` will not contain those turns — the hook cannot retroactively
capture prompts it never saw, and fabricating them after the fact would be worse
than the gap. What covers that period instead:

- `.agent-logs/phase-1.md` — a hand-written decision log for Phase 1, committed at
  the time, including the deviations and the open blocker.
- The commit history, which is granular and was written as the work happened.

Everything from the turn that installed this hook onward is captured automatically.

There is one Claude Code caveat that affects the first canary: the settings watcher
only watches directories that already had a settings file when the session started.
`.claude/` did not exist when this session began, so the hooks are written correctly
but are not yet loaded in *this* session. Opening `/hooks` once reloads them; a
restart also does it. That is a user action — I cannot trigger it from inside the
turn.
