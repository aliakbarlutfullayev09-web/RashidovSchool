import { useState, useEffect } from 'react';
import { formatVideoDuration } from '../utils/formatters';

const CACHE_KEY = 'rb_video_duration_cache_v1';
const memoryCache = new Map();
const inFlightProbes = new Map();

function loadPersistentCache() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePersistentDuration(url, formatted) {
  if (typeof window === 'undefined' || !url || !formatted) return;
  try {
    const cache = loadPersistentCache();
    cache[url] = formatted;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function probeVideoMetadata(url) {
  if (!url || typeof document === 'undefined') return Promise.resolve(null);

  if (memoryCache.has(url)) {
    return Promise.resolve(memoryCache.get(url));
  }

  const stored = loadPersistentCache();
  if (stored[url]) {
    memoryCache.set(url, stored[url]);
    return Promise.resolve(stored[url]);
  }

  if (inFlightProbes.has(url)) {
    return inFlightProbes.get(url);
  }

  const promise = new Promise((resolve) => {
    const video = document.createElement('video');
    let settled = false;

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      try {
        video.removeAttribute('src');
        video.load();
      } catch {}
      inFlightProbes.delete(url);
    };

    const finish = (val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      if (val) {
        memoryCache.set(url, val);
        savePersistentDuration(url, val);
      }
      resolve(val);
    };

    const onLoaded = () => {
      finish(formatVideoDuration(video.duration));
    };

    const onError = () => {
      finish(null);
    };

    const timer = setTimeout(() => finish(null), 8000);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
    video.src = url;
  });

  inFlightProbes.set(url, promise);
  return promise;
}

/**
 * Resolves real video durations for lessons from explicit metadata or HTML5 video headers.
 */
export function useVideoDurations(lessons = []) {
  const [durationsById, setDurationsById] = useState({});

  useEffect(() => {
    if (!lessons || lessons.length === 0) return;

    let cancelled = false;
    const stored = loadPersistentCache();
    const immediate = {};
    const pending = [];

    for (const lesson of lessons) {
      const explicit = lesson.duration && String(lesson.duration).trim();
      if (explicit) {
        immediate[lesson.id] = explicit;
      } else if (lesson.video_url) {
        const cached = memoryCache.get(lesson.video_url) || stored[lesson.video_url];
        if (cached) {
          memoryCache.set(lesson.video_url, cached);
          immediate[lesson.id] = cached;
        } else {
          pending.push(lesson);
        }
      }
    }

    if (Object.keys(immediate).length > 0) {
      setDurationsById((prev) => ({ ...prev, ...immediate }));
    }

    pending.forEach((lesson) => {
      probeVideoMetadata(lesson.video_url).then((resolved) => {
        if (!cancelled && resolved) {
          setDurationsById((prev) => {
            if (prev[lesson.id] === resolved) return prev;
            return { ...prev, [lesson.id]: resolved };
          });
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [lessons]);

  return durationsById;
}
