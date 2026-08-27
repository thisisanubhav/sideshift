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

## 3. Canary log files

Two sessions, two canaries, both captured automatically with no manual step.

### Canary 1 — the session that installed the hook

`.agent-logs/2026-08-27_07-36-37_5b96c281-f978-48d1-8286-8ff7e9a3ec28.md`

```
[LOG_ENTRY type=PROMPT num=1 session=5b96c281]
timestamp: 2026-08-27T07:36:37.023Z
model: claude-opus-5

CAPTURE TEST — 8x assignment, Anubhav


[LOG_ENTRY type=RESPONSE num=1 session=5b96c281]
timestamp: 2026-08-27T07:37:14.612Z
model: claude-opus-5

Canary #1 landed. `/hooks` wasn't available in this environment, but the settings
watcher picked up `.claude/settings.json` on its own — the hook fired without any
reload.
[... full response continues in the log file ...]
```

### Canary 2 — a second, independent session

`.agent-logs/2026-08-27_07-38-27_50f09b8e-0e51-4f3a-a2e9-cf04b84e912f.md`

```
---
session_id: 50f09b8e-0e51-4f3a-a2e9-cf04b84e912f
date: 2026-08-27
author: thisisanubhav
model: claude-opus-5
tool: claude-code
project: sideshift
total_exchanges: 1
first_prompt_time: 2026-08-27T07:38:27.792Z
last_prompt_time: 2026-08-27T07:38:27.792Z
---

# Session Log - 2026-08-27

Session: `50f09b8e` | Project: `sideshift` | Author: `thisisanubhav`

---

[LOG_ENTRY type=PROMPT num=1 session=50f09b8e]
timestamp: 2026-08-27T07:38:27.792Z
model: claude-opus-5

CAPTURE TEST — 8x assignment, Anubhav


[LOG_ENTRY type=RESPONSE num=1 session=50f09b8e]
timestamp: 2026-08-27T07:38:48.259Z
model: claude-opus-5

Capture confirmed working in this session.

This is the fresh canary session (`50f09b8e`), and the hook fired on its own —
`.agent-logs/2026-08-27_07-38-27_50f09b8e-....md` already exists with correct
frontmatter and one entry:
[... full response continues in the log file ...]
```

Session 2 is the one that matters: it is a session that did **not** install the
hook, started cold with no knowledge of it, and was captured anyway. A hook that
only works in the session that created it would have produced nothing here.

### A note on the nesting you will see

Some `[LOG_ENTRY` lines inside these files are *quoted*, not real — my responses
about the capture system contain log excerpts, and those are captured verbatim
along with everything else. `grep -c` over-counts as a result. The authoritative
count is the `total_exchanges` field in the frontmatter. Nothing was tidied up to
avoid this; the log is what it is.

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

## 6. A prediction I got wrong

Before running the canaries I wrote here that the settings watcher would not pick
up `.claude/` in a session that started before the directory existed, and that
`/hooks` or a restart would be needed to load it.

Both halves were wrong, and I am leaving the correction visible rather than
editing the claim away:

- `/hooks` **is not available in this environment at all** — it returned
  "`/hooks` isn't available in this environment."
- The hook **fired anyway**, in the installing session, with no reload. Canary 1
  landed seconds later.

So the watcher does pick up a `.claude/settings.json` created mid-session, at
least in the VS Code extension. The caveat I inherited was either wrong or does
not apply here. Worth knowing if you hit the same thing.
