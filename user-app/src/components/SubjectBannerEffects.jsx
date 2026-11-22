import React from 'react';
import { motion } from 'framer-motion';

export default function SubjectBannerEffects({ subjectKey = 'biologiya' }) {
  const norm = (subjectKey || '').toString().toLowerCase().trim();

  // Bulletproof detection handling Uzbek, Russian, English and numeric IDs
  const isBio = norm === 'biologiya' || norm.includes('bio') || norm.includes('био') || norm === '1';
  const isChem = norm === 'kimyo' || norm.includes('kim') || norm.includes('хим') || norm.includes('chem') || norm === '2';
  const isMath = !isBio && !isChem; // or norm.includes('mat') || norm.includes('мат') || norm === '3'

  // ──────────────────────────────────────────────────────────
  // 1. BIOLOGIYA (🧬 Pure Biology: DNA waves, Living Spores, Bioluminescence)
  // ──────────────────────────────────────────────────────────
  if (isBio) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Living Bioluminescent Energy Aura */}
        <motion.div
          animate={{ 
            scale: [0.92, 1.15, 0.92],
            opacity: [0.35, 0.75, 0.35]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-500/35 via-teal-400/25 to-emerald-950/20 blur-3xl"
        />

        {/* Floating Living Spores & Microscopic Cells */}
        {[
          { id: 1, top: '18%', left: '14%', size: 8, color: '#10B981', delay: 0, duration: 4.5 },
          { id: 2, top: '26%', right: '16%', size: 10, color: '#06B6D4', delay: 0.9, duration: 5.2 },
          { id: 3, top: '48%', left: '20%', size: 6, color: '#34D399', delay: 1.6, duration: 4.0 },
          { id: 4, top: '65%', right: '22%', size: 9, color: '#10B981', delay: 2.2, duration: 5.6 },
          { id: 5, top: '38%', right: '28%', size: 5, color: '#6EE7B7', delay: 1.2, duration: 3.8 },
          { id: 6, top: '74%', left: '25%', size: 7, color: '#059669', delay: 2.8, duration: 5.0 },
        ].map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full shadow-[0_0_14px_currentColor]"
            style={{
              top: p.top,
              left: p.left,
              right: p.right,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              color: p.color
            }}
            animate={{
              y: [-14, 14, -14],
              x: [-7, 7, -7],
              opacity: [0.35, 0.95, 0.35],
              scale: [0.85, 1.35, 0.85]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay
            }}
          />
        ))}

        {/* DNA Helix Strand Ambient Structure */}
        <motion.svg
          className="absolute -right-4 top-14 w-36 h-72 text-emerald-400/30 stroke-current"
          viewBox="0 0 100 200"
          fill="none"
          strokeWidth="2.5"
          animate={{ y: [-8, 8, -8], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M 20 20 Q 50 50 80 80 T 20 140 T 80 200" strokeDasharray="4 4" />
          <path d="M 80 20 Q 50 50 20 80 T 80 140 T 20 200" strokeDasharray="4 4" />
          <line x1="28" y1="35" x2="72" y2="35" stroke="#34D399" strokeWidth="3" />
          <line x1="38" y1="65" x2="62" y2="65" stroke="#10B981" strokeWidth="3" />
          <line x1="28" y1="125" x2="72" y2="125" stroke="#34D399" strokeWidth="3" />
          <line x1="38" y1="155" x2="62" y2="155" stroke="#10B981" strokeWidth="3" />
          <line x1="28" y1="185" x2="72" y2="185" stroke="#34D399" strokeWidth="3" />
        </motion.svg>

        {/* Secondary Biological Chlorophyll Particle Left */}
        <motion.svg
          className="absolute -left-3 bottom-24 w-28 h-28 text-teal-400/25 stroke-current fill-teal-500/10"
          viewBox="0 0 100 100"
          animate={{ rotate: [0, 10, -10, 0], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M 10 90 Q 50 10 90 90 Q 50 50 10 90 Z" strokeWidth="2" />
          <line x1="50" y1="35" x2="50" y2="75" strokeWidth="2" strokeDasharray="3 3" />
        </motion.svg>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // 2. KIMYO (🧪 Pure Chemistry: Boiling Reaction Bubbles & Benzene Rings)
  // ──────────────────────────────────────────────────────────
  if (isChem) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Violet / Magenta Plasma Reaction Glow */}
        <motion.div
          animate={{ 
            scale: [0.95, 1.2, 0.95],
            opacity: [0.35, 0.7, 0.35]
          }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-purple-600/35 via-fuchsia-500/25 to-indigo-900/20 blur-3xl"
        />

        {/* Bubbling Reaction Particles (Rising Upwards like boiling test tube) */}
        {[
          { id: 1, left: '18%', size: 8, delay: 0, duration: 4.0 },
          { id: 2, left: '36%', size: 11, delay: 1.2, duration: 4.8 },
          { id: 3, left: '52%', size: 6, delay: 0.6, duration: 3.5 },
          { id: 4, left: '70%', size: 10, delay: 2.1, duration: 5.2 },
          { id: 5, left: '84%', size: 7, delay: 1.7, duration: 4.2 },
          { id: 6, left: '26%', size: 9, delay: 2.8, duration: 4.6 },
        ].map(b => (
          <motion.div
            key={b.id}
            className="absolute rounded-full border border-purple-300/80 bg-purple-400/35 shadow-[0_0_12px_rgba(168,85,247,0.75)]"
            style={{
              left: b.left,
              bottom: '12%',
              width: b.size,
              height: b.size
            }}
            animate={{
              y: [-10, -290],
              x: [-8, 8, -6, 6, 0],
              opacity: [0, 0.95, 0.95, 0],
              scale: [0.65, 1.35]
            }}
            transition={{
              duration: b.duration,
              repeat: Infinity,
              ease: "easeOut",
              delay: b.delay
            }}
          />
        ))}

        {/* Rotating Chemical Benzene Ring 1 */}
        <motion.svg
          className="absolute top-12 right-6 w-16 h-16 text-purple-400/40 stroke-current"
          viewBox="0 0 100 100"
          fill="none"
          strokeWidth="3.2"
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" />
          <circle cx="50" cy="50" r="22" strokeDasharray="5 5" />
        </motion.svg>

        {/* Rotating Molecular Orbital Ellipse */}
        <motion.div
          className="absolute top-1/3 right-8 w-24 h-12 rounded-full border-2 border-fuchsia-400/35"
          animate={{ rotate: [0, 180, 360] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_8px_#f472b6] absolute -top-1.5 left-1/2" />
        </motion.div>

        {/* Rotating Chemical Hexagon 2 */}
        <motion.svg
          className="absolute bottom-36 left-6 w-12 h-12 text-pink-400/30 stroke-current"
          viewBox="0 0 100 100"
          fill="none"
          strokeWidth="3"
          animate={{ rotate: -360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        >
          <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" />
        </motion.svg>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // 3. MATEMATIKA (📐 Pure Math: Floating Symbols, 3D Wireframe & Grid)
  // ──────────────────────────────────────────────────────────
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Electric Cyber Blue Geometric Glow */}
      <motion.div
        animate={{ 
          scale: [0.92, 1.15, 0.92],
          opacity: [0.35, 0.7, 0.35]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-blue-600/35 via-cyan-500/25 to-indigo-900/20 blur-3xl"
      />

      {/* Floating Mathematical Symbols: π, ∑, √x, ∞, ∫, f(x) */}
      {[
        { symbol: 'π', top: '18%', left: '16%', size: 'text-2xl', delay: 0, duration: 4.8 },
        { symbol: '∑', top: '26%', right: '16%', size: 'text-3xl', delay: 1.0, duration: 5.5 },
        { symbol: '√x', top: '48%', left: '18%', size: 'text-xl', delay: 1.8, duration: 4.2 },
        { symbol: '∞', top: '65%', right: '22%', size: 'text-2xl', delay: 2.4, duration: 5.0 },
        { symbol: '∫', top: '38%', right: '26%', size: 'text-3xl', delay: 1.4, duration: 4.0 },
        { symbol: 'f(x)', top: '72%', left: '24%', size: 'text-sm', delay: 2.9, duration: 4.6 },
      ].map((item, idx) => (
        <motion.div
          key={idx}
          className={`absolute font-mono font-bold text-cyan-300/40 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)] ${item.size}`}
          style={{
            top: item.top,
            left: item.left,
            right: item.right
          }}
          animate={{
            y: [-12, 12, -12],
            x: [-6, 6, -6],
            opacity: [0.3, 0.85, 0.3],
            scale: [0.9, 1.15, 0.9]
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: item.delay
          }}
        >
          {item.symbol}
        </motion.div>
      ))}

      {/* Rotating Geometric Triangle / Icosahedron Wireframe */}
      <motion.svg
        className="absolute top-10 right-6 w-16 h-16 text-blue-400/35 stroke-current"
        viewBox="0 0 100 100"
        fill="none"
        strokeWidth="2.5"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <polygon points="50,10 90,80 10,80" />
        <polygon points="50,80 90,10 10,10" strokeDasharray="4 4" />
        <circle cx="50" cy="50" r="38" strokeWidth="1.5" />
      </motion.svg>

      {/* Isometric Perspective Grid Accent at Bottom (cleanly masked within bounds) */}
      <div 
        className="absolute bottom-0 inset-x-0 h-32 opacity-20 pointer-events-none overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 122, 255, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 122, 255, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
          transform: 'perspective(160px) rotateX(60deg)',
          transformOrigin: 'bottom center'
        }}
      />
    </div>
  );
}
