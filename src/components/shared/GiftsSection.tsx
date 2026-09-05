import { motion } from 'motion/react';
import { Gift } from 'lucide-react';

export default function GiftsSection() {
  return (
    <section className="pt-12 md:pt-16 pb-16 md:pb-24 px-6 md:px-8 bg-white relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] font-anaktoria text-wedding-gold mb-6 opacity-60">
          Regalo
        </h2>
        <h3 className="text-4xl md:text-6xl font-ballet text-wedding-dark mb-12">Gifts</h3>
        
        <div className="bg-wedding-cream/30 backdrop-blur-sm border border-wedding-gold/10 rounded-[2.5rem] p-10 md:p-16 space-y-8">
          <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm border border-wedding-gold/10">
            <Gift className="w-8 h-8 text-wedding-gold" />
          </div>
          
          <div className="space-y-6">
            <p className="font-serif text-lg md:text-2xl text-wedding-dark/70 leading-relaxed max-w-xl mx-auto">
              Your presence at our wedding is the<br />greatest gift of all.
            </p>
            
            <div className="h-px w-12 bg-wedding-gold/20 mx-auto" />
            
            <p className="font-serif italic text-base md:text-lg text-wedding-dark/60 leading-relaxed">
              However, if you wish to honor us with a gift, a contribution towards our future together would be most appreciated.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
