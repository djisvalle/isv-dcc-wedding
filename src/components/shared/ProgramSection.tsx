import { motion } from 'motion/react';
import { SectionDecors } from './DecorationLayer';
import { Heart, Music, Utensils, Camera, Film, Sparkles } from 'lucide-react';

const programItems = [
  {
    time: "4:00 PM",
    event: "Ceremony",
    description: "The exchange of vows",
    icon: Heart
  },
  {
    time: "5:30 PM",
    event: "Cocktail Hour",
    description: "Drinks and appetizers",
    icon: Music
  },
  {
    time: "7:00 PM",
    event: "Reception",
    description: "Grand entrance and festivities",
    icon: Sparkles
  },
  {
    time: "7:30 PM",
    event: "Dinner",
    description: "A celebration feast",
    icon: Utensils
  },
  {
    time: "9:00 PM",
    event: "SDE",
    description: "Same Day Edit screening",
    icon: Film
  },
  {
    time: "9:30 PM",
    event: "End",
    description: "Thank you for celebrating with us",
    icon: Heart
  }
];

export default function ProgramSection() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-8 bg-white relative overflow-hidden">
      <SectionDecors.Programme />
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-6 opacity-60">
          Daloy ng Pagdiriwang
        </h2>
        <h3 className="text-4xl md:text-6xl font-ballet text-wedding-dark mb-16">Programme</h3>

        <div className="relative max-w-lg mx-auto">
          {/* Timeline Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-wedding-gold/10 -translate-x-1/2 hidden md:block" />
          
          <div className="space-y-12 md:space-y-24">
            {programItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative flex flex-col items-center ${
                  index % 2 === 0 ? 'md:items-end md:pr-[50%]' : 'md:items-start md:pl-[50%]'
                }`}
              >
                <div className={`flex flex-col items-center ${
                  index % 2 === 0 ? 'md:items-end md:text-right' : 'md:items-start md:text-left'
                }`}>
                  <div className="bg-wedding-cream/40 p-4 rounded-full mb-4 border border-wedding-gold/5 md:absolute md:left-1/2 md:-translate-x-1/2 md:top-0">
                    <item.icon className="w-5 h-5 text-wedding-gold" />
                  </div>
                  <span className="font-sans font-bold text-wedding-gold text-xs tracking-[0.2em] mb-2 uppercase">
                    {item.time}
                  </span>
                  <h4 className="font-serif text-xl md:text-2xl text-wedding-dark mb-1">
                    {item.event}
                  </h4>
                  <p className="font-serif italic text-wedding-dark/50 text-sm md:text-base">
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
