import React, { useEffect, useRef } from 'react';

const CONFETTI_COLORS = [
  '#007AFF',
  '#FFCC00',
  '#34C759',
  '#FF3B30',
  '#AF52DE',
  '#5AC8FA',
  '#FF9500',
];

export default function ConfettiBurst({ active = true, duration = 6500 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const count = Math.min(180, Math.max(100, Math.floor(w / 8)));

    const spawnParticle = (i, delayMs = 0) => {
      const originType = i % 3;
      const startX =
        originType === 0
          ? w * (0.15 + Math.random() * 0.7)
          : originType === 1
          ? w * 0.1
          : w * 0.9;
      const startY = originType === 0 ? -10 - Math.random() * 140 : h * 0.25;
      const vx =
        originType === 0
          ? (Math.random() - 0.5) * 7
          : originType === 1
          ? 2.5 + Math.random() * 6
          : -(2.5 + Math.random() * 6);
      const vy =
        originType === 0 ? 1.5 + Math.random() * 3.5 : -(3.5 + Math.random() * 5.5);

      return {
        x: startX,
        y: startY,
        vx,
        vy,
        delayMs,
        size: 6 + Math.random() * 6,
        aspect: 0.45 + Math.random() * 0.45,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        tiltAngle: Math.random() * Math.PI * 2,
        tiltSpeed: 0.06 + Math.random() * 0.07,
      };
    };

    // Wave 1 at 0ms + Wave 2 at 1600ms so confetti stays lively much longer
    const particles = [
      ...Array.from({ length: count }, (_, i) => spawnParticle(i, 0)),
      ...Array.from({ length: Math.floor(count * 0.75) }, (_, i) => spawnParticle(i + 2, 1600)),
    ];

    const startTime = performance.now();
    let rafId = 0;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const globalAlpha = progress > 0.76 ? Math.max(0, 1 - (progress - 0.76) / 0.24) : 1;

      for (const p of particles) {
        if (elapsed < p.delayMs) continue;
        p.vx *= 0.992;
        p.vy = Math.min(p.vy + 0.12, 5.2); // gentler gravity for longer floaty fall
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.tiltAngle += p.tiltSpeed;

        ctx.save();
        ctx.globalAlpha = globalAlpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const scaleY = Math.cos(p.tiltAngle);
        ctx.scale(1, Math.abs(scaleY) < 0.2 ? 0.2 : scaleY);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -(p.size * p.aspect) / 2, p.size, p.size * p.aspect);
        ctx.restore();
      }

      if (elapsed < duration) {
        rafId = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [active, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="exam-confetti"
      aria-hidden="true"
      className="fixed inset-0 z-[150] w-full h-full pointer-events-none"
    />
  );
}
