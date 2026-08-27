#!/usr/bin/env python3
"""
Append prompts and final responses to .agent-logs/ for the 8x assignment.

Wired to two Claude Code lifecycle events in .claude/settings.json:

    UserPromptSubmit -> capture_agent_log.py prompt
    Stop             -> capture_agent_log.py response

Both receive a JSON payload on stdin. UserPromptSubmit carries the prompt text
directly; Stop carries only a path to the session transcript, so the response is
read back out of that JSONL.

What is captured, deliberately: the prompt verbatim, and the final assistant
message of the turn. Not thinking, not tool calls, not the intermediate
narration between them.
"""

import hashlib
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

AUTHOR = "thisisanubhav"
PROJECT = "sideshift"
TOOL = "claude-code"


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + \
        f"{datetime.now(timezone.utc).microsecond // 1000:03d}Z"


def log_dir(payload: dict) -> Path:
    root = os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or os.getcwd()
    d = Path(root) / ".agent-logs"
    d.mkdir(parents=True, exist_ok=True)
    return d


def session_file(payload: dict) -> Path:
    """One file per session. Found again on later turns by its session-id suffix."""
    d = log_dir(payload)
    sid = payload.get("session_id") or "unknown-session"
    existing = sorted(d.glob(f"*_{sid}.md"))
    if existing:
        return existing[0]
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    return d / f"{stamp}_{sid}.md"


def read_transcript_tail(path: str):
    """Return (text, model) of the last assistant message carrying real text."""
    if not path or not os.path.exists(path):
        return None, None

    records = []
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    for rec in reversed(records):
        if rec.get("type") != "assistant":
            continue
        msg = rec.get("message") or {}
        chunks = []
        for block in msg.get("content") or []:
            # Text only. Thinking blocks and tool_use blocks are skipped on
            # purpose - the brief asks for the answer, not the working.
            if isinstance(block, dict) and block.get("type") == "text":
                t = (block.get("text") or "").strip()
                if t:
                    chunks.append(t)
        if chunks:
            return "\n\n".join(chunks), msg.get("model")
    return None, None


FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)


def render_frontmatter(meta: dict) -> str:
    order = ["session_id", "date", "author", "model", "tool", "project",
             "total_exchanges", "first_prompt_time", "last_prompt_time"]
    lines = [f"{k}: {meta[k]}" for k in order if k in meta]
    return "---\n" + "\n".join(lines) + "\n---\n"


def load(path: Path):
    if not path.exists():
        return None, ""
    raw = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(raw)
    if not m:
        return None, raw
    meta = {}
    for line in m.group(1).split("\n"):
        if ": " in line:
            k, v = line.split(": ", 1)
            meta[k.strip()] = v.strip()
    return meta, raw[m.end():]


def save(path: Path, meta: dict, body: str):
    path.write_text(render_frontmatter(meta) + body, encoding="utf-8")


def append_entry(payload: dict, kind: str, text: str, model: str):
    path = session_file(payload)
    sid = payload.get("session_id") or "unknown-session"
    short = sid.split("-")[0]
    ts = utc_now()
    meta, body = load(path)

    if meta is None:
        meta = {
            "session_id": sid,
            "date": ts[:10],
            "author": AUTHOR,
            "model": model or "claude-opus-5",
            "tool": TOOL,
            "project": PROJECT,
            "total_exchanges": "0",
            "first_prompt_time": ts,
            "last_prompt_time": ts,
        }
        body = (f"\n# Session Log - {ts[:10]}\n\n"
                f"Session: `{short}` | Project: `{PROJECT}` | Author: `{AUTHOR}`\n\n---\n")

    count = int(meta.get("total_exchanges", "0") or 0)
    if kind == "PROMPT":
        count += 1
        meta["last_prompt_time"] = ts
    meta["total_exchanges"] = str(count)
    if model:
        meta["model"] = model

    body += (f"\n[LOG_ENTRY type={kind} num={count} session={short}]\n"
             f"timestamp: {ts}\n"
             f"model: {model or meta.get('model')}\n\n"
             f"{text}\n\n")

    save(path, meta, body)
    return path


def main():
    kind = (sys.argv[1] if len(sys.argv) > 1 else "").lower()
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    if kind == "prompt":
        prompt = payload.get("prompt")
        if prompt is None:
            return
        append_entry(payload, "PROMPT", prompt, payload.get("model"))

    elif kind == "response":
        text, model = read_transcript_tail(payload.get("transcript_path", ""))
        if not text:
            return
        # The Stop hook can fire more than once for a turn. Only log new text.
        # State lives outside .agent-logs: that directory ships with the repo and
        # should hold nothing but the log itself. sha256, not hash(), because
        # PYTHONHASHSEED makes hash() differ between processes.
        sid = payload.get("session_id") or "unknown-session"
        seen = Path(tempfile.gettempdir()) / f"claude-agentlog-{sid}.sha"
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        try:
            if seen.exists() and seen.read_text(encoding="utf-8").strip() == digest:
                return
            seen.write_text(digest, encoding="utf-8")
        except OSError:
            pass  # never let dedup bookkeeping cost us a log entry
        append_entry(payload, "RESPONSE", text, model)


if __name__ == "__main__":
    main()
