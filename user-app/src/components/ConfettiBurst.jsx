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

export default function ConfettiBurst({ active = true, duration = 3200 }) {
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
    const count = Math.min(130, Math.max(70, Math.floor(w / 10)));

    // Spawn burst from top center and twin side cannons
    const particles = Array.from({ length: count }, (_, i) => {
      const originType = i % 3;
      const startX =
        originType === 0
          ? w * (0.2 + Math.random() * 0.6)
          : originType === 1
          ? w * 0.12
          : w * 0.88;
      const startY = originType === 0 ? -10 - Math.random() * 60 : h * 0.25;
      const vx =
        originType === 0
          ? (Math.random() - 0.5) * 8
          : originType === 1
          ? 3 + Math.random() * 7
          : -(3 + Math.random() * 7);
      const vy =
        originType === 0 ? 2 + Math.random() * 5 : -(4 + Math.random() * 6);

      return {
        x: startX,
        y: startY,
        vx,
        vy,
        size: 6 + Math.random() * 6,
        aspect: 0.45 + Math.random() * 0.45,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.22,
        tiltAngle: Math.random() * Math.PI * 2,
        tiltSpeed: 0.08 + Math.random() * 0.08,
      };
    });

    const startTime = performance.now();
    let rafId = 0;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const globalAlpha = progress > 0.72 ? Math.max(0, 1 - (progress - 0.72) / 0.28) : 1;

      for (const p of particles) {
        p.vx *= 0.99;
        p.vy += 0.22; // gravity
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
