import os
import sys
import socket
import ipaddress
from pathlib import Path
from urllib.parse import urlparse, urljoin
from typing import Optional, Tuple, List
import httpx
from dotenv import load_dotenv

# Load .env from project root if present
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

# Network & Host configuration
YOMI_HOST = os.getenv("YOMI_HOST", "127.0.0.1")
YOMI_PORT = int(os.getenv("YOMI_PORT", "8765"))

# CORS Allowed Origins (Loopback dev by default, configurable via ALLOWED_ORIGINS)
_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8765,http://localhost:8765"
)
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

# Security & Execution Gates
# Arbitrary Python execution runner is strictly disabled by default
ENABLE_DEV_CODE_RUNNER = os.getenv("YOMI_ENABLE_DEV_RUNNER", "false").lower() in ("true", "1", "yes")

# Designated Workspace Root
WORKSPACE_ROOT = Path(os.getenv("YOMI_WORKSPACE_ROOT", str(Path.home() / ".yomi"))).expanduser().resolve()
EXPORTS_DIR = (WORKSPACE_ROOT / "exports").resolve()
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

# LLM Endpoints
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


def validate_workspace_path(target_path: str, base_dir: Optional[Path] = None) -> Path:
    """
    Validates that target_path strictly resolves within the workspace root.
    Handles relative paths, absolute paths, directory traversal attempts,
    Windows case sensitivity, and cross-drive access.
    Raises PermissionError if the target resolves outside base_dir.
    """
    if not target_path or not str(target_path).strip():
        raise PermissionError("Access denied: empty path provided.")

    clean_str = str(target_path).strip()
    if "\x00" in clean_str:
        raise PermissionError("Access denied: null byte in path.")

    if base_dir is None:
        base_dir = WORKSPACE_ROOT

    resolved_base = Path(base_dir).resolve()
    target_p = Path(clean_str)

    if target_p.is_absolute():
        resolved_target = target_p.resolve()
    else:
        resolved_target = (resolved_base / target_p).resolve()

    # Case-insensitive resolution check on Windows, standard on POSIX
    try:
        resolved_target.relative_to(resolved_base)
    except ValueError:
        # Additional check on Windows for drive letter mismatches or case differences
        base_str = str(resolved_base).lower().rstrip("\\/") + os.sep
        target_str = str(resolved_target).lower()
        if not target_str.startswith(base_str) and target_str != str(resolved_base).lower():
            raise PermissionError(
                f"Access denied: path '{clean_str}' resolves to '{resolved_target}', "
                f"which is outside designated workspace root '{resolved_base}'."
            )

    return resolved_target


def validate_safe_subfolder(subfolder: str) -> str:
    """
    Validates that a subfolder name does not attempt directory traversal.
    Only allows alphanumeric characters, underscores, and hyphens.
    """
    if not subfolder or not subfolder.strip():
        return "default"

    clean = subfolder.strip()
    if any(sep in clean for sep in ("/", "\\", "..", ":", "\x00")):
        raise PermissionError(f"Access denied: invalid subfolder name '{subfolder}'.")

    # Sanitize to safe characters
    sanitized = "".join(c for c in clean if c.isalnum() or c in ("_", "-"))
    if not sanitized:
        raise PermissionError(f"Access denied: subfolder name contains no valid characters.")

    return sanitized


def validate_safe_url(url: str) -> bool:
    """
    Validates that a web URL is a public HTTP/HTTPS URL and does not target
    private, loopback, link-local, multicast, or cloud metadata addresses (SSRF prevention).
    Performs full DNS resolution and checks every resolved IPv4 and IPv6 address.
    """
    if not url or not isinstance(url, str):
        return False

    clean_url = url.strip()
    parsed = urlparse(clean_url)

    if parsed.scheme.lower() not in ("http", "https"):
        return False

    hostname = parsed.hostname
    if not hostname:
        return False

    hostname_clean = hostname.strip().rstrip(".").lower()

    # Reject obvious local hostnames
    if hostname_clean in ("localhost", "loopback", "127.0.0.1", "0.0.0.0", "::1", "::"):
        return False
    if hostname_clean.endswith(".localhost") or hostname_clean.endswith(".local"):
        return False

    # Check port if explicitly specified
    port = parsed.port
    if port and port in (8765, 5173, 11434, 8000, 22, 25):
        # Reject internal application and privileged service ports
        return False

    # Check if hostname is directly an IP address literal
    try:
        raw_ip = ipaddress.ip_address(hostname_clean)
        return _is_ip_strictly_public(raw_ip)
    except ValueError:
        pass

    # Resolve hostname via DNS to verify all destination IPs
    try:
        addr_info = socket.getaddrinfo(hostname_clean, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except (socket.gaierror, socket.herror, OSError):
        # If hostname cannot be resolved, reject
        return False

    if not addr_info:
        return False

    for item in addr_info:
        sockaddr = item[4]
        ip_str = sockaddr[0]
        try:
            resolved_ip = ipaddress.ip_address(ip_str)
            if not _is_ip_strictly_public(resolved_ip):
                return False
        except ValueError:
            return False

    return True


def _is_ip_strictly_public(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Checks whether an IP address is strictly global and public."""
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return False

    # Special check for IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        return _is_ip_strictly_public(ip.ipv4_mapped)

    # IPv4 CGNAT (100.64.0.0/10) and documentation/benchmarking ranges
    if isinstance(ip, ipaddress.IPv4Address):
        cgnat = ipaddress.ip_network("100.64.0.0/10")
        if ip in cgnat:
            return False
        test_nets = [
            ipaddress.ip_network("192.0.2.0/24"),
            ipaddress.ip_network("198.51.100.0/24"),
            ipaddress.ip_network("203.0.113.0/24"),
            ipaddress.ip_network("192.0.0.0/24"),
            ipaddress.ip_network("240.0.0.0/4"),
            ipaddress.ip_network("0.0.0.0/8"),
        ]
        if any(ip in net for net in test_nets):
            return False

    return True


async def safe_http_get(
    url: str,
    timeout: float = 12.0,
    max_redirects: int = 5,
    headers: Optional[dict] = None
) -> httpx.Response:
    """
    Performs an HTTP GET request with SSRF validation on the initial URL
    and on EVERY redirect hop.
    """
    if not validate_safe_url(url):
        raise ValueError(f"Blocked URL: '{url}' is not a permitted public web target.")

    current_url = url
    client_headers = headers or {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for _ in range(max_redirects + 1):
            response = await client.get(current_url, headers=client_headers)

            if response.is_redirect:
                loc = response.headers.get("Location")
                if not loc:
                    break
                next_url = urljoin(current_url, loc)
                if not validate_safe_url(next_url):
                    raise ValueError(f"Blocked redirect: target '{next_url}' resolves to a non-public or prohibited destination.")
                current_url = next_url
            else:
                return response

        raise ValueError(f"Excessive redirects encountered for '{url}' (exceeded {max_redirects} hops).")
