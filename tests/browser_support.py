"""Portable, pinned Playwright Chromium; optional local executable override."""

import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode


def reference_vehicle_url(url):
    """Keep contour/zoom regression journeys on the explicit historical 2D mode.

    The primary #vehicle route is now the shared 3D explorer, exercised by the
    portal integration suite. Existing geometry assertions still test all 37
    supplied contours and the historical consultation journeys here.
    """
    parts = urlsplit(url)
    route, separator, query = parts.fragment.partition("?")
    if route != "vehicle":
        return url
    values = dict(parse_qsl(query, keep_blank_values=True))
    values["view"] = "reference"
    return urlunsplit(parts._replace(fragment="vehicle?" + urlencode(values)))


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


async def wait_for_route(page):
    await page.wait_for_function("""()=>{
        const main=document.querySelector('#main');
        return main?.dataset.renderedRoute===location.hash && main.getAttribute('aria-busy')==='false';
    }""")


async def open_preferences(page):
    """Secondary routes and theme controls share the approved compact menu."""
    toggle = page.locator("#navigationToggle")
    if await toggle.get_attribute("aria-expanded") != "true":
        await toggle.click()


async def select_theme(page, theme):
    await open_preferences(page)
    await page.get_by_label("Tema", exact=True).select_option(theme)
    await page.locator("#navigationToggle").click()


async def click_navigation(page, view):
    link = page.locator(f'[data-nav="{view}"]')
    if not await link.is_visible():
        await open_preferences(page)
    group = link.locator("xpath=ancestor::details")
    if await group.count() and await group.get_attribute("open") is None:
        await group.locator("summary").click()
    await link.click()
