import { motion } from 'motion/react';

interface DressCodeContent {
  menLabel: string;
  menImages: string[];
  menCaption: string;
  menDetail: string;
  womenLabel: string;
  womenImages: string[];
  womenCaption: string;
  womenDetail: string;
}

const defaultContent: DressCodeContent = {
  menLabel: 'Gentlemen',
  menImages: ['/men-attire.webp'],
  menCaption: 'Classic Polo',
  menDetail: 'Long-sleeve, any color',
  womenLabel: 'Ladies',
  womenImages: ['/women-attire.webp'],
  womenCaption: 'Soft, Airy Long Gown',
  womenDetail: 'Any color except white',
};

const weddingPartyContent: DressCodeContent = {
  menLabel: 'Groomsmen',
  menImages: ['/groomsmen-outfit.webp'],
  menCaption: 'Classic Barong',
  menDetail: 'Cream, with black slacks',
  womenLabel: 'Bridesmaids',
  womenImages: ['/bridesmaids-outfit-1.webp'],
  womenCaption: 'Soft, Airy Long Gown',
  womenDetail: 'Dusty rose, puff sleeves',
};

function AttireGallery({ images, alt, compact = false }: { images: string[]; alt: string; compact?: boolean }) {
  return (
    <div className="mb-8 flex justify-center items-center gap-3">
      {images.map((image) => (
        <img
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
  isWeddingParty?: boolean;
  sex?: 'Male' | 'Female';
}

export default function DressCodeSection({ isWeddingParty = false, sex }: DressCodeSectionProps) {
  const content = isWeddingParty ? weddingPartyContent : defaultContent;
  const showMen = sex !== 'Female';
  const showWomen = sex !== 'Male';

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

        <div className={`grid grid-cols-1 gap-12 md:gap-16 ${showMen && showWomen ? 'md:grid-cols-2' : 'max-w-sm mx-auto'}`}>
          {showMen && (
          <div className="space-y-6 flex flex-col">
            <h4 className="font-anaktoria font-bold text-wedding-dark uppercase tracking-[0.2em] text-xs">{content.menLabel}</h4>
            <div className="flex-1 flex flex-col justify-center p-6 md:p-10 bg-white/60 backdrop-blur-sm border border-wedding-gold/10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
              <AttireGallery images={content.menImages} alt="Men's formal attire suggestion" compact={isWeddingParty} />
              <p className="font-anaktoria text-wedding-dark/60 text-lg md:text-xl leading-relaxed">
                {content.menCaption}
              </p>
              <div className="mt-6 h-px w-10 bg-wedding-gold/20 mx-auto" />
              <p className="mt-6 text-sm font-anaktoria text-wedding-dark/40 uppercase tracking-[0.2em] leading-relaxed">
                {content.menDetail}
              </p>
            </div>
          </div>
          )}

          {showWomen && (
          <div className="space-y-6 flex flex-col">
            <h4 className="font-anaktoria font-bold text-wedding-dark uppercase tracking-[0.2em] text-xs">{content.womenLabel}</h4>
            <div className="flex-1 flex flex-col justify-center p-6 md:p-10 bg-white/60 backdrop-blur-sm border border-wedding-gold/10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
              <AttireGallery images={content.womenImages} alt="Women's formal attire suggestion" />
              <p className="font-anaktoria text-wedding-dark/60 text-lg md:text-xl leading-relaxed">
                {content.womenCaption}
              </p>
              <div className="mt-6 h-px w-10 bg-wedding-gold/20 mx-auto" />
              <p className="mt-6 text-sm font-anaktoria text-wedding-dark/40 uppercase tracking-[0.2em] leading-relaxed font-medium">
                {content.womenDetail}
              </p>
            </div>
          </div>
          )}
        </div>


      </motion.div>
    </section>
  );
}
