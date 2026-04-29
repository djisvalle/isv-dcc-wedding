import { motion } from 'motion/react';

export default function DressCodeSection() {
  return (
    <section className="py-24 px-4 md:px-6 bg-wedding-cream/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-4 opacity-80">
          What to wear
        </h2>
        <h3 className="text-4xl md:text-5xl font-ballet text-wedding-dark mb-12">Dress Code</h3>
        
        <div className="grid md:grid-cols-2 gap-8 md:gap-16">
          <div className="space-y-4">
            <h4 className="font-sans font-bold text-wedding-dark uppercase tracking-[0.2em] text-xs">Gentlemen</h4>
            <div className="p-8 bg-white/60 backdrop-blur-sm border border-wedding-gold/20 rounded-3xl shadow-sm">
              <div className="mb-6 overflow-hidden rounded-2xl aspect-[3/4] max-w-[180px] mx-auto border border-wedding-gold/10 shadow-sm">
                <img 
                  src="/men-attire.jpg" 
                  alt="Men's formal attire suggestion" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="font-serif italic text-wedding-dark/70 text-lg leading-relaxed">
                Classic Polo
              </p>
              <div className="mt-4 h-px w-12 bg-wedding-gold/30 mx-auto" />
              <p className="mt-4 text-sm font-sans text-wedding-dark/40 uppercase tracking-widest leading-relaxed">
                Long-sleeve, any color
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-sans font-bold text-wedding-dark uppercase tracking-[0.2em] text-xs">Ladies</h4>
            <div className="p-8 bg-white/60 backdrop-blur-sm border border-wedding-gold/20 rounded-3xl shadow-sm">
              <div className="mb-6 overflow-hidden rounded-2xl aspect-[3/4] max-w-[180px] mx-auto border border-wedding-gold/10 shadow-sm">
                <img 
                  src="/women-attire.jpg" 
                  alt="Women's formal attire suggestion" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="font-serif italic text-wedding-dark/70 text-lg leading-relaxed">
                Soft, Airy Long Gown
              </p>
              <div className="mt-4 h-px w-12 bg-wedding-gold/30 mx-auto" />
              <p className="mt-4 text-sm font-sans text-wedding-dark/40 uppercase tracking-widest leading-relaxed">
                Any color except white
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <p className="font-serif text-wedding-dark/60 italic text-xl">
            "Formal Attire"
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-wedding-gold/20" />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
