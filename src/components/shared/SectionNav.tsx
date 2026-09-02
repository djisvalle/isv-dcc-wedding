import { useEffect, useState, type RefObject } from 'react';

export interface SectionNavItem {
  id: string;
  label: string;
  targetRef: RefObject<HTMLElement | null>;
}

interface SectionNavProps {
  items: SectionNavItem[];
}

export default function SectionNav({ items }: SectionNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

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

  return (
    <nav
      aria-label="Section navigation"
      className="fixed left-4 md:left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-start gap-3 md:gap-4"
    >
      {items.map(({ id, label, targetRef }) => {
        const isActive = activeId === id;
        return (
          <div key={id} className="group relative flex items-center">
            <button
              type="button"
              onClick={() => targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              aria-label={`Jump to ${label}`}
              aria-current={isActive}
              className={`relative w-3 h-3 rounded-full border transition-all duration-300 ${
                isActive
                  ? 'bg-wedding-gold border-wedding-gold scale-125'
                  : 'bg-wedding-cream/80 border-wedding-gold/50 hover:border-wedding-gold hover:scale-110'
              }`}
            />
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-anaktoria text-wedding-dark shadow-sm opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
              {label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
