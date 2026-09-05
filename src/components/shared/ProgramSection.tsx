import { motion } from 'motion/react';
import { Heart, Music, Utensils, Sparkles } from 'lucide-react';

const programItems = [
  {
    time: "3:00 PM",
    event: "Ceremony",
    description: "The exchange of vows",
    icon: Heart
  },
  {
    time: "4:00 PM",
    event: "Cocktail Hour",
    description: "Drinks and appetizers",
    icon: Music
  },
  {
    time: "5:00 PM",
    event: "Reception",
    description: "Grand entrance and festivities",
    icon: Sparkles
  },
  {
    time: "6:00 PM",
    event: "Dinner",
    description: "A celebration feast",
    icon: Utensils
  },
  {
    time: "9:00 PM",
    event: "End",
    description: "Thank you for celebrating with us",
    icon: Heart
  }
];

export default function ProgramSection() {
  return (
    <section className="pt-12 md:pt-16 pb-16 md:pb-24 px-6 md:px-8 bg-white relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-10 md:h-14 bg-gradient-to-b from-wedding-cream/80 to-transparent pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] font-anaktoria text-wedding-gold mb-6 opacity-60">
          Daloy ng Pagdiriwang
        </h2>
        <h3 className="text-4xl md:text-6xl font-ballet text-wedding-dark mb-16">Programme</h3>

        <div className="relative max-w-2xl mx-auto mt-12">
          {/* Vertical Timeline Line */}
          <div className="absolute left-1/2 top-4 bottom-4 w-px bg-wedding-gold/20 -translate-x-1/2" />

          <div className="space-y-12">
            {programItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative flex items-center ${
                  index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                {/* Icon Circle */}
                <div className="absolute z-10 flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-white border border-wedding-gold/20 shadow-sm left-1/2 -translate-x-1/2">
                  <item.icon className="w-5 h-5 text-wedding-gold" />
                </div>

                {/* Content */}
                <div className={`flex-none w-1/2 max-w-[400px] ${
                  index % 2 === 0
                  ? 'text-right pr-8 md:pr-16'
                  : 'text-left pl-8 md:pl-16'
                }`}>
                  <span className="font-anaktoria font-bold text-wedding-gold text-sm tracking-[0.2em] uppercase block mb-1">
                    {item.time}
                  </span>
                  <h4 className="font-anaktoria text-xl text-wedding-dark mb-1">
                    {item.event}
                  </h4>
                  <p className="font-anaktoria text-wedding-dark/60 text-base leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
