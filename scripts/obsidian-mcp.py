#!/usr/bin/env python3
"""Bridge stdio <-> Streamable HTTP para o MCP embutido no plugin Obsidian
Local REST API.

Usado pelo OpenCode como MCP local (ver opencode.json). Roda nativamente no
Windows (Python) e faz o proxy síncrono das mensagens JSON-RPC, preservando o
`initialize` enviado imediatamente.

Host e API key são resolvidos em tempo de start (localhost + data.json), sem
depender de variáveis de ambiente do shell que iniciou o OpenCode.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(
    ROOT, "docs", "brain", ".obsidian", "plugins",
    "obsidian-local-rest-api", "data.json",
)


def obsidian_host() -> str:
    host = os.environ.get("OBSIDIAN_HOST")
    if host:
        return host
    if os.name == "nt":
        return "127.0.0.1"
    try:
        out = subprocess.check_output(["ip", "route", "show", "default"], text=True)
        return out.split()[2]
    except Exception:
        return ""


def api_key() -> str:
    key = os.environ.get("OBSIDIAN_API_KEY")
    if key:
        return key
    try:
        with open(DATA, encoding="utf-8") as fh:
            return json.load(fh).get("apiKey", "")
    except Exception:
        return ""


HOST = obsidian_host()
KEY = api_key()
URL = f"http://{HOST}:27123/mcp/"

if not HOST or not KEY:
    sys.stderr.write(f"obsidian-mcp: host='{HOST}' key_len={len(KEY)}\n")
    sys.exit(1)

session_id: str | None = None


def emit(msg: dict) -> None:
    sys.stdout.write(json.dumps(msg, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def post(message: dict) -> None:
    global session_id
    body = json.dumps(message).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session_id:
        headers["Mcp-Session-Id"] = session_id
    req = urllib.request.Request(URL, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            sid = resp.headers.get("mcp-session-id")
            if sid:
                session_id = sid
            ctype = resp.headers.get("content-type", "")
            raw = resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        sys.stderr.write(f"obsidian-mcp: HTTP {exc.code} {exc.reason}\n")
        return
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"obsidian-mcp: {exc}\n")
        return

    if "text/event-stream" in ctype:
        for line in raw.splitlines():
            if line.startswith("data:"):
                payload = line[5:].strip()
                if payload:
                    try:
                        emit(json.loads(payload))
                    except json.JSONDecodeError:
                        pass
    elif raw.strip():
        try:
            emit(json.loads(raw))
        except json.JSONDecodeError:
            pass


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            continue
        post(message)


if __name__ == "__main__":
    main()
