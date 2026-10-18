#!/usr/bin/env python3
"""Run tests with an owned HTTP server and guaranteed teardown."""

import functools
import http.server
import os
from pathlib import Path
import subprocess
import sys
import threading

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    mode = sys.argv[1]
    pattern = "*.test.py" if mode == "unit" else "*-browser.py"
    server = None
    env = os.environ.copy()
    if mode == "browser" and not env.get("VEHICLE_TEST_URL"):
        server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
        )
        threading.Thread(target=server.serve_forever, daemon=True).start()
        env["VEHICLE_TEST_URL"] = f"http://127.0.0.1:{server.server_port}/"
    try:
        for path in sorted((ROOT / "tests").glob(pattern)):
            if path.name == "accessibility-browser.py":
                continue  # Separate npm test:a11y suite.
            print("Running " + path.name, flush=True)
            subprocess.run([sys.executable, str(path)], cwd=ROOT, env=env, check=True)
    finally:
        if server:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    main()
