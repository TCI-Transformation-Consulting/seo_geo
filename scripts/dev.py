#!/usr/bin/env python3
import os
import sys
import subprocess
import time
import threading
import signal
import re
import shlex
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError
import argparse

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT / "backend"
VENV_DIR = BACKEND_DIR / ".venv"
VENV_PY = VENV_DIR / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
REQ_TXT = BACKEND_DIR / "requirements.txt"

backend_proc = None
frontend_proc = None
stop_event = threading.Event()

ANSI_RE = re.compile(r"\x1b\[[0-9;]*[mK]")

def strip_ansi(s: str) -> str:
    return ANSI_RE.sub("", s)

def ensure_backend():
    if not VENV_PY.exists():
        print(f"[backend] Creating venv at {VENV_DIR} ...")
        subprocess.check_call([sys.executable, "-m", "venv", str(VENV_DIR)])
    # install requirements once if not already installed this session
    print("[backend] Ensuring requirements are installed ...")
    subprocess.check_call([str(VENV_PY), "-m", "pip", "install", "--upgrade", "pip"])
    subprocess.check_call([str(VENV_PY), "-m", "pip", "install", "-r", str(REQ_TXT)])

def start_backend():
    global backend_proc
    cmd = [str(VENV_PY), "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"]
    print(f"[backend] Starting: {' '.join(shlex.quote(c) for c in cmd)}")
    backend_proc = subprocess.Popen(
        cmd,
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
    )
    # Reader thread to forward logs
    threading.Thread(target=pipe_output, args=(backend_proc.stdout, "[backend] "), daemon=True).start()

def ensure_frontend():
    node_modules = ROOT / "node_modules"
    if not node_modules.exists():
        print("[frontend] Installing npm dependencies (npm install) ...")
        try:
            if os.name == "nt":
                subprocess.check_call(["cmd", "/c", "npm", "install"], cwd=str(ROOT))
            else:
                subprocess.check_call(["npm", "install"], cwd=str(ROOT))
        except FileNotFoundError:
            print("[error] 'npm' not found in PATH. Please install Node.js and ensure npm is available.")
            raise

def start_frontend(port: int):
    global frontend_proc
    if os.name == "nt":
        cmd = ["cmd", "/c", "npm", "run", "dev", "--", "--port", str(port)]
    else:
        cmd = ["npm", "run", "dev", "--", "--port", str(port)]
    print(f"[frontend] Starting: {' '.join(shlex.quote(c) for c in cmd)}")
    frontend_proc = subprocess.Popen(
        cmd,
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
    )
    threading.Thread(target=pipe_output, args=(frontend_proc.stdout, "[frontend] "), daemon=True).start()

def pipe_output(stream, prefix: str):
    try:
        for line in iter(stream.readline, ""):
            if stop_event.is_set():
                break
            sys.stdout.write(prefix + line)
            sys.stdout.flush()
    except Exception:
        pass

def http_ok(url: str, timeout: float = 2.5) -> bool:
    try:
        req = Request(url, headers={"User-Agent": "dev.py"})
        with urlopen(req, timeout=timeout) as resp:
            return 200 <= getattr(resp, "status", 200) < 400
    except (URLError, HTTPError, ConnectionError, TimeoutError):
        return False

def wait_for_backend(max_wait: float = 30.0) -> bool:
    url = "http://localhost:8000/api/v1/health"
    print(f"[wait] Backend health: {url}")
    t0 = time.time()
    while time.time() - t0 < max_wait:
        if http_ok(url):
            print("[wait] Backend is up")
            return True
        time.sleep(0.8)
    print("[wait] Backend not responding within timeout")
    return False

def parse_vite_urls_from_output(lines: list[str]) -> tuple[str|None, list[str]]:
    local = None
    networks = []
    for raw in lines:
        line = strip_ansi(raw).strip()
        # Typical lines:
        # ➜  Local:   http://localhost:3000/
        # ➜  Network: http://192.168.x.x:3000/
        m_local = re.search(r"Local:\s+(http://[^\s]+)", line)
        if m_local:
            local = m_local.group(1).rstrip("/")
        m_net = re.search(r"Network:\s+(http://[^\s]+)", line)
        if m_net:
            networks.append(m_net.group(1).rstrip("/"))
    return local, networks

def wait_for_frontend(port: int, max_wait: float = 40.0) -> tuple[str|None, list[str]]:
    # Try poll the provided port first
    polled = f"http://localhost:{port}/"
    print(f"[wait] Frontend expected: {polled}")
    t0 = time.time()
    captured: list[str] = []

    while time.time() - t0 < max_wait:
        # Poll the expected port
        if http_ok(polled):
            print(f"[wait] Frontend is up on {polled}")
            return polled.rstrip("/"), []

        # Also inspect process output to catch actual URLs if vite picked a new port
        try:
            if frontend_proc and frontend_proc.stdout:
                # Non-blocking read of available lines
                while True:
                    frontend_proc.stdout.flush()
                    line = frontend_proc.stdout.readline()
                    if not line:
                        break
                    captured.append(line)
                    sys.stdout.write("[frontend] " + line)
                    sys.stdout.flush()
        except Exception:
            pass

        local, networks = parse_vite_urls_from_output(captured)
        if local and http_ok(local):
            print(f"[wait] Frontend is up on {local}")
            return local, networks

        time.sleep(0.8)

    print("[wait] Frontend not responding within timeout")
    # Try best-effort parse
    local, networks = parse_vite_urls_from_output(captured)
    return local, networks

def terminate_children():
    stop_event.set()
    for name, proc in (("frontend", frontend_proc), ("backend", backend_proc)):
        if proc and proc.poll() is None:
            try:
                print(f"[shutdown] Terminating {name} ...")
                if os.name == "nt":
                    proc.terminate()
                else:
                    proc.send_signal(signal.SIGTERM)
            except Exception:
                pass

def main():
    parser = argparse.ArgumentParser(description="Start backend (FastAPI) and frontend (Vite), then print links.")
    parser.add_argument("--frontend-port", type=int, default=3000, help="Preferred Vite port (default: 3000)")
    parser.add_argument("--backend-only", action="store_true")
    parser.add_argument("--frontend-only", action="store_true")
    args = parser.parse_args()

    print(f"[info] Project root: {ROOT}")

    try:
        if not args.frontend_only:
            ensure_backend()
            start_backend()
        if not args.backend_only:
            ensure_frontend()
            start_frontend(args.frontend_port)

        backend_ok = True
        if not args.frontend_only:
            backend_ok = wait_for_backend()

        local_url = None
        networks = []
        if not args.backend_only:
            local_url, networks = wait_for_frontend(args.frontend_port)

        print("\n================= LINKS =================")
        if not args.frontend_only:
            print("Backend health: http://localhost:8000/api/v1/health")
        if not args.backend_only:
            if local_url:
                print(f"Frontend:      {local_url}/")
            else:
                print(f"Frontend:      http://localhost:{args.frontend_port}/ (expected; if Vite changed port, see logs)")
            for n in networks:
                print(f"Network:       {n}/")
        print("=========================================\n")

        # Keep the script alive to keep child processes running
        print("[info] Press Ctrl+C to stop both frontend and backend.")
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[info] KeyboardInterrupt received.")
    except subprocess.CalledProcessError as e:
        print(f"[error] Command failed: {e}")
    finally:
        terminate_children()

if __name__ == "__main__":
    main()
