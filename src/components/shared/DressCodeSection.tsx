import { motion } from 'motion/react';
import FadeInImage from './FadeInImage';

export type DressCodeCardKey = 'groomsmen' | 'bridesmaids' | 'gentlemen' | 'ladies';

interface DressCodeCardDef {
  label: string;
  images: string[];
  caption: string;
  detail: string;
  compact?: boolean;
}

const CARD_DEFS: Record<DressCodeCardKey, DressCodeCardDef> = {
  groomsmen: {
    label: 'Groomsmen',
    images: ['/groomsmen-outfit.webp'],
    caption: 'Classic Barong',
    detail: 'Cream, with black slacks',
    compact: true,
  },
  bridesmaids: {
    label: 'Bridesmaids',
    images: ['/bridesmaids-outfit-1.webp'],
    caption: 'Soft, Airy Long Gown',
    detail: 'Dusty rose, puff sleeves',
  },
  gentlemen: {
    label: 'Gentlemen',
    images: ['/men-attire.webp'],
    caption: 'Classic Polo',
    detail: 'Long-sleeve, any color',
    compact: true,
  },
  ladies: {
    label: 'Ladies',
    images: ['/women-attire.webp'],
    caption: 'Soft, Airy Long Gown',
    detail: 'Any color except white',
    compact: true,
  },
};

const DEFAULT_CARDS: DressCodeCardKey[] = ['gentlemen', 'ladies'];

function AttireGallery({ images, alt, compact = false }: { images: string[]; alt: string; compact?: boolean }) {
  return (
    <div className="mb-8 flex justify-center items-center gap-3">
      {images.map((image) => (
        <FadeInImage
          key={image}
          src={image}
          loading="lazy"
          decoding="async"
          alt={alt}
          className={`${compact ? 'h-64 md:h-80 w-auto max-w-full' : 'w-full h-auto'} object-contain transition-transform duration-500 hover:scale-105`}
          referrerPolicy="no-referrer"
        />
      ))}
    </div>
  );
}

interface DressCodeSectionProps {
  cards?: DressCodeCardKey[];
}

export default function DressCodeSection({ cards }: DressCodeSectionProps) {
  const activeCards = cards && cards.length > 0 ? cards : DEFAULT_CARDS;
  const isSingle = activeCards.length === 1;
  const isOdd = activeCards.length % 2 === 1;

  return (
    <section className="py-16 md:py-24 px-6 md:px-8 bg-wedding-cream/30 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] font-anaktoria text-wedding-gold mb-6 opacity-60">
          Kasuotan
        </h2>
        <h3 className="text-4xl md:text-6xl font-ballet text-wedding-dark mb-12">Dress Code</h3>

        <div className={`grid grid-cols-1 gap-12 md:gap-16 ${isSingle ? 'max-w-sm mx-auto' : 'md:grid-cols-2'}`}>
          {activeCards.map((key, index) => {
            const content = CARD_DEFS[key];
            const isTrailingOdd = isOdd && index === activeCards.length - 1;
            return (
              <div
                key={key}
                className={`space-y-6 flex flex-col ${isTrailingOdd ? 'md:col-span-2 md:max-w-sm md:mx-auto md:w-full' : ''}`}
              >
                <h4 className="font-anaktoria font-bold text-wedding-dark uppercase tracking-[0.2em] text-xs">{content.label}</h4>
                <div className="flex-1 flex flex-col justify-center p-6 md:p-10 bg-white/60 backdrop-blur-sm border border-wedding-gold/10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
                  <AttireGallery images={content.images} alt={`${content.label} formal attire suggestion`} compact={content.compact} />
                  <p className="font-anaktoria text-wedding-dark/60 text-lg md:text-xl leading-relaxed">
                    {content.caption}
                  </p>
                  <div className="mt-6 h-px w-10 bg-wedding-gold/20 mx-auto" />
                  <p className="mt-6 text-sm font-anaktoria text-wedding-dark/40 uppercase tracking-[0.2em] leading-relaxed">
                    {content.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
