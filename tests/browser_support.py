"""Portable, pinned Playwright Chromium; optional local executable override."""

import os
from pathlib import Path


def launch_options():
    options = {"args": ["--no-sandbox"]}
    executable = os.environ.get("BROWSER_EXECUTABLE")
    if executable:
        if not Path(executable).is_file():
            raise ValueError("BROWSER_EXECUTABLE does not exist")
        options["executable_path"] = executable
    return options


class TestServer:
    """Own a temporary local server unless an external test URL was supplied."""

    def __enter__(self):
        import functools
        import http.server
        import threading

        self.server = None
        base = os.environ.get("VEHICLE_TEST_URL")
        if base:
            return base.rstrip("/") + "/"

        class Handler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *_args):
                pass

        root = Path(__file__).resolve().parents[1]
        self.server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), functools.partial(Handler, directory=str(root))
        )
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        return f"http://127.0.0.1:{self.server.server_port}/"

    def __exit__(self, *_args):
        if self.server:
            self.server.shutdown()
            self.server.server_close()
