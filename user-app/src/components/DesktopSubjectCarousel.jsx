import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play } from 'lucide-react';
import SubjectBannerEffects from './SubjectBannerEffects';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

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
  const { lang } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

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
  const virtualIndexRef = useRef(virtualIndex);

  useEffect(() => {
    virtualIndexRef.current = virtualIndex;
  }, [virtualIndex]);

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

  // Re-center without jump when subjects list finishes async load
  useEffect(() => {
    if (sortedSubjects.length === 0) return;
    const targetCanonical = (activeSubjectIndex || 0) % sortedSubjects.length;
    const currentIdx = virtualIndexRef.current;
    const currentCanonical = ((currentIdx % sortedSubjects.length) + sortedSubjects.length) % sortedSubjects.length;
    if (currentIdx < sortedSubjects.length || currentIdx >= (SETS_COUNT - 1) * sortedSubjects.length || currentCanonical !== targetCanonical) {
      const snapped = MIDDLE_SET * sortedSubjects.length + targetCanonical;
      virtualIndexRef.current = snapped;
      setWithTransition(false);
      setVirtualIndex(snapped);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWithTransition(true);
        });
      });
    }
  }, [sortedSubjects.length, activeSubjectIndex]);

  // Navigate to next card (infinite cycle forward)
  const goToNext = useCallback(() => {
    if (total <= 1) return;
    impactLight();
    const nextV = virtualIndexRef.current + 1;
    virtualIndexRef.current = nextV;
    const canonical = ((nextV % total) + total) % total;
    setWithTransition(true);
    setVirtualIndex(nextV);
    if (onSubjectChange) onSubjectChange(canonical);
  }, [total, impactLight, onSubjectChange]);

  // Navigate to previous card (infinite cycle backward)
  const goToPrev = useCallback(() => {
    if (total <= 1) return;
    impactLight();
    const prevV = virtualIndexRef.current - 1;
    virtualIndexRef.current = prevV;
    const canonical = ((prevV % total) + total) % total;
    setWithTransition(true);
    setVirtualIndex(prevV);
    if (onSubjectChange) onSubjectChange(canonical);
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

  // Dynamically adapt card dimensions for Desktop vs Landscape Phone / Tablet
  const [windowHeight, setWindowHeight] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateHeight = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  const isShortLandscape = windowHeight < 550;
  const cardHeightNum = isShortLandscape 
    ? Math.max(220, windowHeight - 68) 
    : Math.min(640, Math.max(380, windowHeight - 150));
  const cardWidth = Math.round(cardHeightNum * 0.58);
  const cardGap = isShortLandscape ? 16 : 28;

  return (
    <div 
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={lang === 'ru' ? 'Витрина предметов' : 'Fanlar vitrinasi'}
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
          minHeight: `${cardHeightNum + 10}px`
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
            const title = isBio
              ? (lang === 'ru' ? 'БИОЛОГИЯ' : 'BIOLOGIYA')
              : isChem
              ? (lang === 'ru' ? 'ХИМИЯ' : 'KIMYO')
              : isMath
              ? (lang === 'ru' ? 'МАТЕМАТИКА' : 'MATEMATIKA')
              : (subject.name || (lang === 'ru' ? 'ПРЕДМЕТ' : 'FAN')).toUpperCase();

            // Strict static background image: Biologiya is ALWAYS the verified DNA particle banner; Matematika has no photo
            let image = subject.image_url;
            if (isBio) {
              image = '/banners/biologiya_banner.jpg';
            } else if (isChem) {
              image = '/banners/kimyo_banner.jpg';
            } else if (isMath) {
              image = null;
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
                  height: `${cardHeightNum}px`,
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
                  ) : image ? (
                    <img 
                      src={image} 
                      alt={title} 
                      className="w-full h-full object-cover" 
                    />
                  ) : null}
                  {/* Vignette gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black" />
                </div>

                {/* Subject Visual Effects: ONLY rendered on the active central card */}
                {isActive && !prefersReducedMotion && (
                  <SubjectBannerEffects subjectKey={subjectKey} />
                )}

                {/* Card Content at Bottom */}
                <div className={`absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end ${
                  isShortLandscape ? 'p-3.5' : 'p-6 sm:p-8'
                }`}>
                  <h3 className={`text-white font-black tracking-wider uppercase drop-shadow-md ${
                    isShortLandscape ? 'text-lg mb-2' : 'text-2xl sm:text-3xl mb-4'
                  }`}>
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
                      className={`w-full rounded-full font-bold text-white bg-gradient-to-r ${buttonGradient} hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        isShortLandscape ? 'py-2 px-3 text-xs' : 'py-3.5 px-6 text-base'
                      }`}
                    >
                      <Play className={isShortLandscape ? 'w-3.5 h-3.5 fill-current' : 'w-5 h-5 fill-current'} />
                      <span>{lang === 'ru' ? 'Начать' : 'Boshlash'}</span>
                    </button>
                  ) : (
                    <div className={`text-white/60 font-semibold tracking-wide ${
                      isShortLandscape ? 'text-[10px]' : 'text-sm'
                    }`}>
                      {lang === 'ru' ? 'Нажмите, чтобы выбрать' : 'Tanlash uchun bosing'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination dots below carousel */}
      <div className={`flex items-center justify-center gap-2 z-20 ${
        isShortLandscape ? 'mt-2' : 'mt-4'
      }`}>
        {sortedSubjects.map((s, idx) => {
          const isDotActive = activeCanonical === idx;
          const norm = (s.key || s.name || '').toLowerCase();
          const dotTitle = norm.includes('bio') || norm.includes('био')
            ? (lang === 'ru' ? 'БИОЛОГИЯ' : 'BIOLOGIYA')
            : norm.includes('kim') || norm.includes('хим')
            ? (lang === 'ru' ? 'ХИМИЯ' : 'KIMYO')
            : norm.includes('mat') || norm.includes('мат')
            ? (lang === 'ru' ? 'МАТЕМАТИКА' : 'MATEMATIKA')
            : (s.name || (lang === 'ru' ? `Предмет ${idx + 1}` : `Fan ${idx + 1}`)).toUpperCase();

          return (
            <button
              key={s.id || idx}
              type="button"
              onClick={() => handleDotClick(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                isDotActive
                  ? isLight
                    ? 'w-8 bg-[#007AFF] shadow-[0_0_8px_rgba(0,122,255,0.45)]'
                    : 'w-8 bg-white shadow-[0_0_8px_white]'
                  : isLight
                  ? 'w-2 bg-black/20 hover:bg-black/35'
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={lang === 'ru' ? `Перейти к ${dotTitle}` : `${dotTitle} ga o'tish`}
            />
          );
        })}
      </div>
    </div>
  );
}
