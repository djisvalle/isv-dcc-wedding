import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';

export default function VenueSection() {
  return (
    <section className="py-24 px-4 md:px-6 bg-white overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-4 opacity-80">
              The Location
            </h2>
            <h3 className="text-4xl md:text-5xl font-ballet text-wedding-dark mb-6">Venue</h3>
            <div className="space-y-6">
              <p className="font-serif italic text-wedding-dark/70 text-lg leading-relaxed">
                Our celebration will be held in the heart of Intramuros, Manila. 
                A place where history meets romance, echoing the timelessness of our vows.
              </p>
              <div className="flex items-start gap-4 p-6 bg-wedding-cream/50 rounded-2xl border border-wedding-gold/10">
                <MapPin className="w-6 h-6 text-wedding-gold shrink-0 mt-1" />
                <div>
                  <p className="font-sans font-semibold text-wedding-dark uppercase tracking-wider text-sm mb-1">
                    San Agustin Church & Reception Hall
                  </p>
                  <p className="font-serif text-wedding-dark/60 italic">
                    General Luna St, Intramuros, Manila, 1002 Metro Manila
                  </p>
                </div>
              </div>
              <p className="text-sm font-sans text-wedding-gold uppercase tracking-widest opacity-60">
                Specific details regarding the rooms will be provided in your digital invitation.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="aspect-[4/5] bg-wedding-cream rounded-[40px] overflow-hidden shadow-2xl border-8 border-white">
              <img 
                src="https://images.unsplash.com/photo-1549675584-91f19337af3d?q=80&w=2670&auto=format&fit=crop" 
                alt="Intramuros" 
                className="w-full h-full object-cover grayscale-[20%] sepia-[10%] hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Artistic Frame Element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 border-r-2 border-b-2 border-wedding-gold/30 rounded-br-[40px]" />
            <div className="absolute -top-6 -left-6 w-32 h-32 border-l-2 border-t-2 border-wedding-gold/30 rounded-tl-[40px]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
