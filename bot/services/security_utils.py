import ipaddress
import re
import socket
from collections.abc import Callable
from typing import Any
from urllib.parse import urlsplit


class SSRFError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 403) -> None:
        super().__init__(message)
        self.code = code
        self.status_code = status_code


def is_forbidden_ip(raw_ip: str) -> bool:
    clean = str(raw_ip or "").strip().strip("[]").split("%")[0]
    if not clean:
        return True
    try:
        addr = ipaddress.ip_address(clean)
    except ValueError:
        return True

    if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
        addr = addr.ipv4_mapped

    return (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_reserved
        or addr.is_unspecified
        or not addr.is_global
    )


def build_allowed_video_hosts(supabase_url: str = "", configured_hosts: str = "") -> list[str]:
    hosts: list[str] = []
    for item in (configured_hosts or "").split(","):
        h = item.strip().lower()
        if h:
            hosts.append(h)
    if supabase_url:
        parsed = urlsplit(supabase_url.strip())
        if parsed.hostname:
            hosts.append(parsed.hostname.lower())
    return list(dict.fromkeys(hosts))


def is_host_allowed(hostname: str, allowed_hosts: list[str]) -> bool:
    host = (hostname or "").strip().lower().rstrip(".")
    if not host or not allowed_hosts:
        return False
    for pattern in allowed_hosts:
        p = pattern.lower()
        if p.startswith("*."):
            suffix = p[1:]
            if host.endswith(suffix) and len(host) > len(suffix):
                return True
        elif host == p:
            return True
    return False


def validate_external_video_url(
    raw_url: str,
    *,
    allowed_hosts: list[str],
    resolver: Callable[..., list[Any]] = socket.getaddrinfo,
) -> str:
    url = str(raw_url or "").strip()
    if not url:
        raise SSRFError("INVALID_VIDEO_URL", "Invalid video URL", status_code=400)

    parsed = urlsplit(url)
    if parsed.scheme.lower() != "https":
        raise SSRFError("SSRF_BLOCKED", "Only HTTPS video URLs are allowed")
    if parsed.username or parsed.password:
        raise SSRFError("SSRF_BLOCKED", "Credentials in URL are forbidden")
    if parsed.port not in (None, 443):
        raise SSRFError("SSRF_BLOCKED", "Non-standard ports are forbidden")

    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise SSRFError("INVALID_VIDEO_URL", "Missing host", status_code=400)

    try:
        ipaddress.ip_address(host)
        if is_forbidden_ip(host):
            raise SSRFError("SSRF_BLOCKED", "Forbidden internal IP")
    except ValueError:
        pass

    if not is_host_allowed(host, allowed_hosts):
        raise SSRFError("HOST_NOT_ALLOWED", "Video host is not allowlisted")

    try:
        infos = resolver(host, 443, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise SSRFError("SSRF_BLOCKED", "Failed to resolve video host") from exc

    if not infos:
        raise SSRFError("SSRF_BLOCKED", "Video host resolved to zero addresses")

    for info in infos:
        ip_str = info[4][0]
        if is_forbidden_ip(ip_str):
            raise SSRFError("SSRF_BLOCKED", "Video host resolves to forbidden private/loopback IP")

    return url


def sanitize_ai_text(value: Any, max_len: int) -> str:
    text = str(value or "")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = text.replace("<", "[").replace(">", "]")
    return text.strip()[:max_len]
