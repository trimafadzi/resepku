import http.server
import os
import socketserver
import threading
import time
import pytest
import requests

FIXTURE_HOST = "127.0.0.1"
FIXTURE_PORT = 8765

RECIPE_HTML = """<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Nasi Goreng Spesial</title>
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Recipe",
  "name": "Nasi Goreng Spesial",
  "image": ["https://example.com/nasi-goreng.jpg"],
  "recipeIngredient": [
    "3 cangkir nasi putih dingin",
    "2 siung bawang putih cincang",
    "2 sdm kecap manis",
    "1 butir telur"
  ],
  "recipeInstructions": [
    {"@type": "HowToStep", "text": "Panaskan minyak di wajan besar."},
    {"@type": "HowToStep", "text": "Tumis bawang putih hingga harum."},
    {"@type": "HowToStep", "text": "Masukkan nasi dan kecap, aduk rata."},
    {"@type": "HowToStep", "text": "Tambahkan telur, aduk hingga matang."}
  ],
  "cookTime": "PT30M",
  "recipeYield": "4"
}
</script>
</head>
<body><h1>Nasi Goreng Spesial</h1></body>
</html>
"""

EMPTY_HTML = """<!doctype html>
<html><head></head><body><p>Just a blog post, no recipe schema here.</p></body></html>
"""


class FixtureHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        if self.path == "/recipe":
            body = RECIPE_HTML.encode("utf-8")
        elif self.path == "/empty":
            body = EMPTY_HTML.encode("utf-8")
        else:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):  # noqa: A002
        return  # silence


@pytest.fixture(scope="session", autouse=True)
def fixture_server():
    socketserver.TCPServer.allow_reuse_address = True
    try:
        httpd = socketserver.TCPServer((FIXTURE_HOST, FIXTURE_PORT), FixtureHandler)
    except OSError:
        # Port already taken by a leftover fixture server — assume it serves the same content.
        yield {"recipe_url": f"http://{FIXTURE_HOST}:{FIXTURE_PORT}/recipe",
               "empty_url": f"http://{FIXTURE_HOST}:{FIXTURE_PORT}/empty"}
        return
    httpd.allow_reuse_address = True
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    # readiness probe
    deadline = time.time() + 5
    while time.time() < deadline:
        try:
            r = requests.get(f"http://{FIXTURE_HOST}:{FIXTURE_PORT}/recipe", timeout=1)
            if r.status_code == 200:
                break
        except requests.RequestException:
            time.sleep(0.1)
    yield {"recipe_url": f"http://{FIXTURE_HOST}:{FIXTURE_PORT}/recipe",
           "empty_url": f"http://{FIXTURE_HOST}:{FIXTURE_PORT}/empty"}
    httpd.shutdown()
    httpd.server_close()


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def base_url():
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or _read_frontend_env()
    if not url:
        pytest.skip("No public backend URL available")
    return url.rstrip("/")


def _read_frontend_env():
    from pathlib import Path
    paths = [
        "/app/frontend/.env",
        str(Path(__file__).parent.parent.parent / "frontend" / ".env")
    ]
    for p in paths:
        try:
            with open(p) as f:
                for line in f:
                    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                        return line.split("=", 1)[1].strip().strip('"')
        except FileNotFoundError:
            continue
    return None
