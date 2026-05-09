import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { SectionDecors } from './DecorationLayer';

export default function VenueSection() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-8 bg-white overflow-hidden relative">
      <SectionDecors.Venue />
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -50px 0px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center w-full"
          >
            <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-6 opacity-60">
              Tagpuan
            </h2>
            <h3 className="text-4xl md:text-6xl font-ballet text-wedding-dark mb-10">Venue</h3>
            <div className="space-y-12">
              <p className="font-serif italic text-wedding-dark/60 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
                Our celebration will be held in the heart of Intramuros, Manila. 
                A place where history meets romance, echoing the timelessness of our vows.
              </p>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-8 md:p-12 bg-wedding-cream/40 rounded-[2.5rem] border border-wedding-gold/5 text-center md:text-left transition-all hover:bg-wedding-cream/60">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-wedding-gold/10">
                  <MapPin className="w-6 h-6 text-wedding-gold shrink-0" />
                </div>
                <div>
                  <p className="font-sans font-bold text-wedding-dark uppercase tracking-[0.2em] text-sm mb-2">
                    Puerta Real Gardens
                  </p>
                  <p className="font-serif text-wedding-dark/50 italic mb-6 text-lg md:text-lg leading-relaxed">
                    General Luna St, Intramuros, Manila, 1002 Metro Manila
                  </p>
                  <div className="pt-8 border-t border-wedding-gold/10">
                    <p className="text-base md:text-base font-serif italic text-wedding-gold font-bold max-w-lg mx-auto leading-loose">
                      Dating to 1663, the original Puerta Real gate was constructed as one of the official entrances to Intramuros. This gate had a special ceremonial role, used exclusively by the Spanish Governor-General for state occasions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
