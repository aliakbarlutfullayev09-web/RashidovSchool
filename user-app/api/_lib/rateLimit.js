export function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
}

export function extractClientIp(req) {
  const realIp = req.headers?.['x-real-ip'];
  if (realIp) return String(realIp).trim();
  const fwd = req.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

async function checkBucketSupabase(key, limit, windowSeconds, { sbUrl, sbServiceKey, fetchImpl }) {
  const resp = await fetchImpl(`${sbUrl}/rest/v1/rpc/check_rate_limit`, {
    method: 'POST',
    headers: {
      apikey: sbServiceKey,
      Authorization: `Bearer ${sbServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    }),
  });
  if (!resp.ok) {
    throw new Error(`Rate limit backend error ${resp.status}`);
  }
  return resp.json();
}

async function checkBucketUpstash(key, limit, windowSeconds, { upstashUrl, upstashToken, fetchImpl }) {
  const resp = await fetchImpl(`${upstashUrl.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSeconds, 'NX'],
      ['TTL', key],
    ]),
  });
  if (!resp.ok) {
    throw new Error(`Upstash error ${resp.status}`);
  }
  const results = await resp.json();
  const count = Number(results?.[0]?.result || 1);
  const ttl = Number(results?.[2]?.result || windowSeconds);
  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retry_after: allowed ? 0 : Math.max(1, ttl),
  };
}

export async function enforceRateLimit(
  req,
  res,
  { buckets = [], fetchImpl = fetch, env = process.env, limiterFn = null } = {}
) {
  const sbUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const sbServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY || '';
  const upstashUrl = env.UPSTASH_REDIS_REST_URL || '';
  const upstashToken = env.UPSTASH_REDIS_REST_TOKEN || '';

  for (const bucket of buckets) {
    if (!bucket?.key) continue;
    let verdict;
    if (typeof limiterFn === 'function') {
      verdict = await limiterFn(bucket.key, bucket.limit, bucket.windowSeconds);
    } else if (upstashUrl && upstashToken) {
      verdict = await checkBucketUpstash(bucket.key, bucket.limit, bucket.windowSeconds, {
        upstashUrl,
        upstashToken,
        fetchImpl,
      });
    } else if (sbUrl && sbServiceKey) {
      verdict = await checkBucketSupabase(bucket.key, bucket.limit, bucket.windowSeconds, {
        sbUrl,
        sbServiceKey,
        fetchImpl,
      });
    } else {
      throw new Error('Distributed rate limiter is not configured');
    }

    if (verdict && verdict.allowed === false) {
      const retryAfter = Math.max(1, Number(verdict.retry_after || bucket.windowSeconds || 60));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        ok: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: 'Too many requests. Please try again later.',
      });
      return false;
    }
  }
  return true;
}
