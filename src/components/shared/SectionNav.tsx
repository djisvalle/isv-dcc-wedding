import { useEffect, useRef, useState, type RefObject, type TouchEvent as ReactTouchEvent } from 'react';
import { motion } from 'motion/react';

export interface SectionNavItem {
  id: string;
  label: string;
  targetRef: RefObject<HTMLElement | null>;
}

interface SectionNavProps {
  items: SectionNavItem[];
  /** While this element is visible in the viewport, the nav stays hidden (e.g. the landing hero photo). */
  hideWhileVisibleRef?: RefObject<HTMLElement | null>;
}

export default function SectionNav({ items, hideWhileVisibleRef }: SectionNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [seekId, setSeekId] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(!hideWhileVisibleRef);
  const navRef = useRef<HTMLElement>(null);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    const el = hideWhileVisibleRef?.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsRevealed(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [hideWhileVisibleRef]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    items.forEach(({ id, targetRef }) => {
      const el = targetRef.current;
      if (el) {
        el.id = id;
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  const jumpTo = (id: string) => {
    items.find((item) => item.id === id)?.targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const seekToTouch = (clientY: number) => {
    const nav = navRef.current;
    if (!nav) return;
    const dots = Array.from(nav.querySelectorAll<HTMLElement>('[data-nav-id]'));
    let closestId: string | null = null;
    let closestDist = Infinity;
    for (const dot of dots) {
      const rect = dot.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - clientY);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = dot.dataset.navId ?? null;
      }
    }
    if (closestId) setSeekId(closestId);
  };

  const handleTouchStart = (e: ReactTouchEvent) => {
    isSeekingRef.current = true;
    seekToTouch(e.touches[0].clientY);
  };

  const handleTouchMove = (e: ReactTouchEvent) => {
    if (!isSeekingRef.current) return;
    seekToTouch(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (seekId) jumpTo(seekId);
    isSeekingRef.current = false;
    window.setTimeout(() => setSeekId(null), 500);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Section navigation"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`fixed left-4 md:left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-start gap-3 md:gap-4 touch-none transition-all duration-500 ease-out ${
        isRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
      }`}
    >
      {items.map(({ id, label, targetRef }) => {
        const isActive = activeId === id;
        const isSeeking = seekId === id;
        return (
          <div key={id} data-nav-id={id} className="group relative flex items-center justify-center w-4 h-4">
            <motion.button
              type="button"
              onClick={() => targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              aria-label={`Jump to ${label}`}
              aria-current={isActive}
              animate={{ scale: isSeeking ? 2.2 : isActive ? 1.3 : 1 }}
              whileHover={{ scale: 1.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className={`w-2 h-2 rounded-full border ${
                isActive || isSeeking
                  ? 'bg-wedding-gold border-wedding-gold'
                  : 'bg-wedding-cream/80 border-wedding-gold/50 hover:border-wedding-gold'
              }`}
            />
            <span
              className={`pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-anaktoria text-wedding-dark shadow-sm transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 ${
                isSeeking ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
