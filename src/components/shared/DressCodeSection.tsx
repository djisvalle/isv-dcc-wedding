import { motion } from 'motion/react';

export default function DressCodeSection() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-8 bg-wedding-cream/30 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-6 opacity-60">
          Kasuotan
        </h2>
        <h3 className="text-4xl md:text-6xl font-ballet text-wedding-dark mb-12">Dress Code</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          <div className="space-y-6">
            <h4 className="font-sans font-bold text-wedding-dark uppercase tracking-[0.2em] text-xs">Gentlemen</h4>
            <div className="p-10 bg-white/60 backdrop-blur-sm border border-wedding-gold/10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
              <div className="mb-8 overflow-hidden rounded-2xl aspect-[3/4] max-w-[160px] mx-auto border border-wedding-gold/10 shadow-sm group">
                <img 
                  src="/men-attire.svg" 
                  alt="Men's formal attire suggestion" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="font-serif italic text-wedding-dark/60 text-lg md:text-xl leading-relaxed">
                Classic Polo
              </p>
              <div className="mt-6 h-px w-10 bg-wedding-gold/20 mx-auto" />
              <p className="mt-6 text-sm font-sans text-wedding-dark/40 uppercase tracking-[0.2em] leading-relaxed">
                Long-sleeve, any color
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-sans font-bold text-wedding-dark uppercase tracking-[0.2em] text-xs">Ladies</h4>
            <div className="p-10 bg-white/60 backdrop-blur-sm border border-wedding-gold/10 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
              <div className="mb-8 overflow-hidden rounded-2xl aspect-[3/4] max-w-[160px] mx-auto border border-wedding-gold/10 shadow-sm group">
                <img 
                  src="/women-attire.svg" 
                  alt="Women's formal attire suggestion" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="font-serif italic text-wedding-dark/60 text-lg md:text-xl leading-relaxed">
                Soft, Airy Long Gown
              </p>
              <div className="mt-6 h-px w-10 bg-wedding-gold/20 mx-auto" />
              <p className="mt-6 text-sm font-sans text-wedding-dark/40 uppercase tracking-[0.2em] leading-relaxed font-medium">
                Any color except white
              </p>
            </div>
          </div>
        </div>


      </motion.div>
    </section>
  );
}
