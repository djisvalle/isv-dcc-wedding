import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';

export default function VenueSection() {
  return (
    <section className="py-24 px-4 md:px-6 bg-white overflow-hidden">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-4 opacity-80">
              The Location
            </h2>
            <h3 className="text-4xl md:text-5xl font-ballet text-wedding-dark mb-6">Venue</h3>
            <div className="space-y-8">
              <p className="font-serif italic text-wedding-dark/70 text-lg md:text-xl leading-relaxed">
                Our celebration will be held in the heart of Intramuros, Manila. 
                A place where history meets romance, echoing the timelessness of our vows.
              </p>
              <div className="inline-flex items-start gap-4 p-6 md:p-8 bg-wedding-cream/50 rounded-2xl border border-wedding-gold/10 text-left">
                <MapPin className="w-6 h-6 text-wedding-gold shrink-0 mt-1" />
                <div>
                  <p className="font-sans font-semibold text-wedding-dark uppercase tracking-wider text-sm mb-1">
                    Puerta Real Gardens
                  </p>
                  <p className="font-serif text-wedding-dark/60 italic mb-4">
                    General Luna St, Intramuros, Manila, 1002 Metro Manila
                  </p>
                  <div className="pt-6 border-t border-wedding-gold/10">
                    <p className="text-sm md:text-base font-serif italic text-wedding-gold/60 max-w-md mx-auto">
                      Dating to 1663, Puerta Real was an official gate of Intramuros reserved for the Governor-General's state use.
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
