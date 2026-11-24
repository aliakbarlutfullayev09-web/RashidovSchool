import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play } from 'lucide-react';
import SubjectBannerEffects from './SubjectBannerEffects';
import { useHaptic } from '../hooks/useHaptic';

/**
 * Desktop Subject Carousel
 * Reusable cyclical infinite carousel for Telegram Desktop (>= 1024px with hover/fine pointer).
 * - Full vertical screen height cards
 * - Infinite cyclical track: Biologiya -> Kimyo -> Matematika -> Biologiya -> ...
 * - Smooth track shift every 5s
 * - Active card: scale + glow + start button + animated video/effects
 * - Side cards: flat, dimmed, no glow/pulsing
 * - Pauses on hover, focus
 * - Keyboard navigation (Left/Right arrows, Enter)
 * - Respects prefers-reduced-motion
 */
export default function DesktopSubjectCarousel({
  subjects = [],
  activeSubjectIndex = 0,
  onSubjectChange,
  onStartSubject,
  compact = false
}) {
  const { impactLight, impactMedium } = useHaptic();

  // Normalize subjects: strictly Biologiya -> Kimyo -> Matematika
  const sortedSubjects = useMemo(() => {
    if (!subjects || subjects.length === 0) return [];
    return [...subjects].sort((a, b) => {
      const getOrder = (s) => {
        if (s.order) return s.order;
        const norm = (s.key || s.name || '').toLowerCase();
        if (norm.includes('bio') || norm.includes('био') || s.id === 1) return 1;
        if (norm.includes('kim') || norm.includes('xim') || norm.includes('хим') || s.id === 2) return 2;
        if (norm.includes('mat') || norm.includes('мат') || s.id === 3) return 3;
        return 99;
      };
      return getOrder(a) - getOrder(b);
    });
  }, [subjects]);

  const total = sortedSubjects.length || 1;
  const SETS_COUNT = 5;
  const MIDDLE_SET = 2; // sets 0, 1, 2, 3, 4
  const BASE_INDEX = MIDDLE_SET * total;

  // Flattened virtual cards for infinite seamless looping
  const virtualCards = useMemo(() => {
    const list = [];
    for (let s = 0; s < SETS_COUNT; s++) {
      sortedSubjects.forEach((subj, subjIdx) => {
        list.push({
          virtualId: `set-${s}-item-${subj.id || subjIdx}`,
          virtualIndex: s * total + subjIdx,
          canonicalIndex: subjIdx,
          subject: subj
        });
      });
    }
    return list;
  }, [sortedSubjects, total]);

  // Current virtual index in track (starts in middle set)
  const [virtualIndex, setVirtualIndex] = useState(() => BASE_INDEX + (activeSubjectIndex % total));
  const [withTransition, setWithTransition] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const isResettingRef = useRef(false);

  const activeCanonical = ((virtualIndex % total) + total) % total;

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  // Synchronize internal virtual index with activeSubjectIndex prop
  useEffect(() => {
    if (activeSubjectIndex === undefined) return;
    const currentCanonical = ((virtualIndex % total) + total) % total;
    if (activeSubjectIndex !== currentCanonical) {
      let diff = activeSubjectIndex - currentCanonical;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      setWithTransition(true);
      setVirtualIndex((v) => v + diff);
    }
  }, [activeSubjectIndex, total]);

  // Navigate to next card (infinite cycle forward)
  const goToNext = useCallback(() => {
    if (total <= 1) return;
    impactLight();
    setWithTransition(true);
    setVirtualIndex((v) => {
      const nextV = v + 1;
      const canonical = ((nextV % total) + total) % total;
      if (onSubjectChange) onSubjectChange(canonical);
      return nextV;
    });
  }, [total, impactLight, onSubjectChange]);

  // Navigate to previous card (infinite cycle backward)
  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    impactLight();
    setWithTransition(true);
    setVirtualIndex((v) => {
      const prevV = v - 1;
      const canonical = ((prevV % total) + total) % total;
      if (onSubjectChange) onSubjectChange(canonical);
      return prevV;
    });
  }, [total, impactLight, onSubjectChange]);

  // Seamless re-centering to middle set after track animation completes
  const handleTransitionEnd = (e) => {
    if (e.target !== trackRef.current || e.propertyName !== 'transform') return;
    if (isResettingRef.current) return;

    const canonical = ((virtualIndex % total) + total) % total;
    const normalizedIndex = BASE_INDEX + canonical;

    if (virtualIndex !== normalizedIndex) {
      isResettingRef.current = true;
      setWithTransition(false);
      setVirtualIndex(normalizedIndex);

      // Re-enable smooth transition for subsequent animations
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWithTransition(true);
          isResettingRef.current = false;
        });
      });
    }
  };

  // 5-second automatic sliding track
  useEffect(() => {
    if (prefersReducedMotion || isPaused || isHovered || isFocused || total <= 1) {
      return;
    }

    const timer = setInterval(() => {
      goToNext();
    }, 5000);

    return () => clearInterval(timer);
  }, [goToNext, isPaused, isHovered, isFocused, prefersReducedMotion, total]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (document.activeElement?.getAttribute('data-active-card') === 'true') {
        e.preventDefault();
        const activeSubj = sortedSubjects[activeCanonical];
        if (onStartSubject && activeSubj) {
          onStartSubject(activeSubj);
        }
      }
    }
  };

  // Pagination dot click: shortest direction rotation
  const handleDotClick = (targetIdx) => {
    if (targetIdx === activeCanonical) return;
    impactLight();
    let diff = targetIdx - activeCanonical;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    setWithTransition(true);
    setVirtualIndex((v) => {
      const nextV = v + diff;
      if (onSubjectChange) onSubjectChange(targetIdx);
      return nextV;
    });
  };

  // Card dimensions: full vertical screen coverage (golden 9:16 mobile ratio)
  const cardWidth = compact ? 280 : 360;
  const cardGap = compact ? 20 : 28;

  return (
    <div 
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Fanlar vitrinasi"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none py-1 outline-none focus-visible:ring-1 focus-visible:ring-white/20"
    >
      {/* Carousel Track: stretched vertically to fill screen */}
      <div 
        className="w-full flex items-center justify-center py-1"
        style={{
          minHeight: compact ? '480px' : 'min(680px, calc(100vh - 120px))'
        }}
      >
        <div 
          ref={trackRef}
          onTransitionEnd={handleTransitionEnd}
          className="flex items-center"
          style={{
            gap: `${cardGap}px`,
            transform: `translateX(calc(50% - ${virtualIndex * (cardWidth + cardGap) + cardWidth / 2}px))`,
            transition: prefersReducedMotion || !withTransition ? 'none' : 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1)'
          }}
        >
          {virtualCards.map((item) => {
            const { virtualId, virtualIndex: vIdx, canonicalIndex: cIdx, subject } = item;
            const isActive = vIdx === virtualIndex;
            const norm = (subject.key || subject.name || '').toLowerCase();
            const isBio = norm.includes('bio') || norm.includes('био') || subject.id === 1 || subject.key === 'biologiya';
            const isChem = norm.includes('kim') || norm.includes('xim') || norm.includes('хим') || subject.id === 2 || subject.key === 'kimyo';
            const isMath = norm.includes('mat') || norm.includes('мат') || subject.id === 3 || subject.key === 'matematika';

            const subjectKey = isBio ? 'biologiya' : isChem ? 'kimyo' : isMath ? 'matematika' : (subject.key || 'subject');
            const title = isBio ? 'BIOLOGIYA' : isChem ? 'KIMYO' : isMath ? 'MATEMATIKA' : (subject.name || 'FAN').toUpperCase();

            // Strict static background image: Biologiya is ALWAYS the verified DNA particle banner
            let image = subject.image_url;
            if (isBio) {
              image = '/banners/biologiya_banner.jpg';
            } else if (isChem) {
              image = '/banners/kimyo_banner.jpg';
            } else if (isMath) {
              image = 'https://images.unsplash.com/photo-1633424974203-6c91b2a651ee?auto=format&fit=crop&w=1200&q=85';
            } else if (!image || image.includes('photo-1451187580459')) {
              image = '/banners/biologiya_banner.jpg';
            }

            const video = isBio 
              ? '/banners/biologiya_banner.mp4' 
              : isChem 
              ? '/banners/kimyo_banner.mp4' 
              : subject.video_url || null;

            const buttonGradient = isChem 
              ? 'from-[#8B5CF6] via-[#A855F7] to-[#7C3AED]'
              : isMath
              ? 'from-[#007AFF] via-[#0A84FF] to-[#0056D2]'
              : 'from-[#007AFF] via-[#0A84FF] to-[#0066FF]';

            const activeBorder = isChem ? 'border-purple-500/50' : isMath ? 'border-blue-500/50' : 'border-emerald-500/50';
            const activeGlow = isChem 
              ? 'shadow-[0_0_45px_rgba(168,85,247,0.35)]' 
              : isMath 
              ? 'shadow-[0_0_45px_rgba(0,122,255,0.35)]' 
              : 'shadow-[0_0_45px_rgba(16,185,129,0.35)]';

            return (
              <div
                key={virtualId}
                data-active-card={isActive ? 'true' : 'false'}
                onClick={() => {
                  if (!isActive) {
                    impactLight();
                    setWithTransition(true);
                    setVirtualIndex(vIdx);
                    if (onSubjectChange) onSubjectChange(cIdx);
                  }
                }}
                className={`relative flex-shrink-0 rounded-[32px] overflow-hidden select-none cursor-pointer border transition-all ${
                  isActive
                    ? `${activeBorder} ${activeGlow} z-20`
                    : 'border-white/10 opacity-55 hover:opacity-85 z-10'
                }`}
                style={{
                  width: `${cardWidth}px`,
                  height: compact ? 'min(460px, calc(100vh - 180px))' : 'min(640px, calc(100vh - 150px))',
                  transform: prefersReducedMotion ? 'none' : (isActive ? 'scale(1.02)' : 'scale(0.92)'),
                  transition: prefersReducedMotion ? 'none' : 'transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 350ms ease, box-shadow 400ms ease',
                  backgroundColor: '#0a0a0c'
                }}
              >
                {/* Background Video or Image */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {video && isActive ? (
                    <video 
                      key={video}
                      src={video} 
                      poster={image}
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      preload="auto"
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <img 
                      src={image} 
                      alt={title} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                  {/* Vignette gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black" />
                </div>

                {/* Subject Visual Effects: ONLY rendered on the active central card */}
                {isActive && !prefersReducedMotion && (
                  <SubjectBannerEffects subjectKey={subjectKey} />
                )}

                {/* Card Content at Bottom */}
                <div className="absolute inset-x-0 bottom-0 p-8 z-20 flex flex-col justify-end">
                  <h3 className="text-white font-black text-3xl tracking-wider uppercase mb-4 drop-shadow-md">
                    {title}
                  </h3>

                  {isActive ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        impactMedium();
                        if (onStartSubject) {
                          onStartSubject(subject);
                        }
                      }}
                      className={`w-full py-3.5 px-6 rounded-full font-bold text-white text-base bg-gradient-to-r ${buttonGradient} hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>Boshlash</span>
                    </button>
                  ) : (
                    <div className="text-sm text-white/60 font-semibold tracking-wide">
                      Tanlash uchun bosing
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination dots below carousel */}
      <div className="flex items-center justify-center gap-2 mt-4 z-20">
        {sortedSubjects.map((s, idx) => {
          const isDotActive = activeCanonical === idx;
          const norm = (s.key || s.name || '').toLowerCase();
          const dotTitle = norm.includes('bio') || norm.includes('био') ? 'BIOLOGIYA' : norm.includes('kim') ? 'KIMYO' : norm.includes('mat') ? 'MATEMATIKA' : (s.name || `Fan ${idx + 1}`).toUpperCase();

          return (
            <button
              key={s.id || idx}
              type="button"
              onClick={() => handleDotClick(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                isDotActive 
                  ? 'w-8 bg-white shadow-[0_0_8px_white]' 
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`${dotTitle} ga o'tish`}
            />
          );
        })}
      </div>
    </div>
  );
}
