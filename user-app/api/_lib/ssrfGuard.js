import dns from 'node:dns/promises';
import net from 'node:net';

function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export function isForbiddenIp(rawIp) {
  const ip = String(rawIp || '').trim().replace(/^\[|\]$/g, '').split('%')[0].toLowerCase();
  if (!ip) return true;

  const ipType = net.isIP(ip);
  if (ipType === 0) return true;

  if (ipType === 6) {
    if (ip === '::1' || ip === '::') return true;
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // fc00::/7 ULA
    if (ip.startsWith('fe80:') || ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
      return true; // fe80::/10 link-local
    }
    if (ip.startsWith('::ffff:')) {
      return isForbiddenIp(ip.slice(7));
    }
    if (ip.startsWith('ff')) return true; // multicast
    return false;
  }

  const n = ipv4ToInt(ip);
  if (n === null) return true;
  const inRange = (startIp, maskBits) => {
    const start = ipv4ToInt(startIp);
    const mask = maskBits === 0 ? 0 : (~((1 << (32 - maskBits)) - 1) >>> 0);
    return (n & mask) === (start & mask);
  };

  return (
    inRange('0.0.0.0', 8) ||
    inRange('10.0.0.0', 8) ||
    inRange('100.64.0.0', 10) ||
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) ||
    inRange('172.16.0.0', 12) ||
    inRange('192.0.0.0', 24) ||
    inRange('192.0.2.0', 24) ||
    inRange('192.168.0.0', 16) ||
    inRange('198.18.0.0', 15) ||
    inRange('198.51.100.0', 24) ||
    inRange('203.0.113.0', 24) ||
    inRange('224.0.0.0', 4) ||
    inRange('240.0.0.0', 4)
  );
}

export function buildAllowedVideoHosts(env = process.env) {
  const hosts = [];
  const rawList = String(env.VIDEO_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  hosts.push(...rawList);

  const sbUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  if (sbUrl) {
    try {
      const u = new URL(sbUrl);
      if (u.hostname) hosts.push(u.hostname.toLowerCase());
    } catch {}
  }
  return [...new Set(hosts)];
}

export function isHostAllowed(hostname, allowedHosts) {
  const host = String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
  if (!host || !Array.isArray(allowedHosts) || allowedHosts.length === 0) return false;
  return allowedHosts.some((pattern) => {
    const p = pattern.toLowerCase();
    if (p.startsWith('*.')) {
      const suffix = p.slice(1); // .example.com
      return host.endsWith(suffix) && host.length > suffix.length;
    }
    return host === p;
  });
}

export async function validateExternalVideoUrl(
  rawUrl,
  { allowedHosts = [], lookupFn = (host) => dns.lookup(host, { all: true }) } = {}
) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    throw Object.assign(new Error('Invalid video URL'), { status: 400, code: 'INVALID_VIDEO_URL' });
  }

  if (parsed.protocol !== 'https:') {
    throw Object.assign(new Error('Only HTTPS video URLs are allowed'), { status: 403, code: 'SSRF_BLOCKED' });
  }
  if (parsed.username || parsed.password) {
    throw Object.assign(new Error('Credentials in URL are forbidden'), { status: 403, code: 'SSRF_BLOCKED' });
  }
  if (parsed.port && parsed.port !== '443') {
    throw Object.assign(new Error('Non-standard ports are forbidden'), { status: 403, code: 'SSRF_BLOCKED' });
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIP(host) !== 0 && isForbiddenIp(host)) {
    throw Object.assign(new Error('Forbidden internal IP'), { status: 403, code: 'SSRF_BLOCKED' });
  }
  if (!isHostAllowed(host, allowedHosts)) {
    throw Object.assign(new Error('Video host is not allowlisted'), { status: 403, code: 'HOST_NOT_ALLOWED' });
  }

  let resolved;
  try {
    resolved = await lookupFn(host);
  } catch {
    throw Object.assign(new Error('Failed to resolve video host'), { status: 403, code: 'SSRF_BLOCKED' });
  }
  const addrs = Array.isArray(resolved) ? resolved : [resolved];
  if (addrs.length === 0) {
    throw Object.assign(new Error('Video host resolved to zero addresses'), { status: 403, code: 'SSRF_BLOCKED' });
  }
  for (const entry of addrs) {
    const addr = typeof entry === 'string' ? entry : entry?.address;
    if (isForbiddenIp(addr)) {
      throw Object.assign(new Error('Video host resolves to forbidden private/loopback IP'), {
        status: 403,
        code: 'SSRF_BLOCKED',
      });
    }
  }

  return parsed.toString();
}

export async function safeDownloadVideoStream(
  rawUrl,
  {
    allowedHosts = [],
    maxBytes = 48 * 1024 * 1024,
    timeoutMs = 20000,
    fetchImpl = fetch,
    lookupFn,
  } = {}
) {
  const safeUrl = await validateExternalVideoUrl(rawUrl, { allowedHosts, lookupFn });
  const mediaResp = await fetchImpl(safeUrl, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (mediaResp.status >= 300 && mediaResp.status < 400) {
    throw Object.assign(new Error('Redirects are forbidden for video downloads'), {
      status: 403,
      code: 'SSRF_REDIRECT_BLOCKED',
    });
  }
  if (!mediaResp.ok) {
    throw Object.assign(new Error('Video download failed'), { status: 502, code: 'VIDEO_DOWNLOAD_FAILED' });
  }

  const contentLen = Number(mediaResp.headers?.get?.('content-length') || 0);
  if (contentLen > maxBytes) {
    throw Object.assign(new Error('Video exceeds maximum allowed size'), {
      status: 413,
      code: 'VIDEO_TOO_LARGE',
    });
  }

  if (mediaResp.body && typeof mediaResp.body.getReader === 'function') {
    const reader = mediaResp.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {}
        throw Object.assign(new Error('Video exceeds maximum allowed size'), {
          status: 413,
          code: 'VIDEO_TOO_LARGE',
        });
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }

  const ab = await mediaResp.arrayBuffer();
  if (ab.byteLength > maxBytes) {
    throw Object.assign(new Error('Video exceeds maximum allowed size'), {
      status: 413,
      code: 'VIDEO_TOO_LARGE',
    });
  }
  return Buffer.from(ab);
}
