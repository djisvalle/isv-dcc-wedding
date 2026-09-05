import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn } from 'lucide-react';
import { useDeadline } from '@/features/rsvp/hooks/useRsvpInvite';

interface FAQItemProps {
  question: string;
  answer: string | React.ReactNode;
  image?: string;
  onImageClick?: (src: string) => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, image, onImageClick }) => {
  return (
    <div className="border-b border-wedding-gold/10 last:border-0 py-6">
      <span className="font-serif text-xl md:text-2xl text-wedding-dark pr-8 block mb-4">
        {question}
      </span>
      <div className="font-serif italic text-wedding-dark/60 leading-relaxed text-lg md:text-xl whitespace-pre-line">
        {answer}
      </div>
      {image && (
        <div
          className="mt-4 rounded-xl overflow-hidden border border-wedding-gold/20 shadow-sm relative group/image cursor-zoom-in"
          onClick={() => onImageClick?.(image)}
        >
          <img
            src={image}
            alt="Overview"
            className="w-full h-auto transition-transform duration-500 group-hover/image:scale-105"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100">
            <div className="bg-white/80 p-2 rounded-full shadow-lg">
              <ZoomIn className="w-5 h-5 text-wedding-dark" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FAQSection() {
  const { data: deadline } = useDeadline();
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const deadlineDate = deadline?.date
    ? deadline.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const faqs = [
    {
      question: "Is there parking available?",
      answer: <>While there is limited available parking at the venue, we will be <b>reserving this for family, selected entourage, and suppliers</b>.<br /><br />However, there is parking managed by Intramuros, as shown in the image below, colored in gray.</>,
      image: "/map-data.svg"
    },
    {
      question: "Can I bring a plus one?",
      answer: <>Unfortunately, no. Due to strict venue capacity limits, we can only accommodate guests explicitly listed on the invitation. This includes drivers, yayas/helpers, and additional friends or family members.<br /><br />Your digital RSVP will show the exact number of seats reserved for your party. Thank you so much for understanding!</>
    },
    {
      question: "What is the RSVP deadline?",
      answer: deadlineDate 
        ? <>We kindly request that you confirm your attendance through this website by <b>{deadlineDate}</b>. Your timely response helps us in our final preparations.</>
        : "We kindly request that you confirm your attendance through this website as soon as possible. Your timely response helps us in our final preparations."
    },
    {
      question: "Are children allowed?",
      answer: <>While we love your little ones, we have decided to have an <b>adults-only</b> celebration to allow all our guests to fully enjoy the evening. We appreciate your understanding <b>(Relatives and children specifically invited by the couple are exempted)</b>.</>
    }
  ];

  return (
    <section className="pt-12 md:pt-16 pb-16 md:pb-24 px-6 md:px-8 bg-wedding-cream/30 relative overflow-hidden" id="faq-section">
      <div className="absolute inset-x-0 top-0 h-10 md:h-14 bg-gradient-to-b from-white to-transparent pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] font-anaktoria text-wedding-gold mb-6 opacity-60">
            Mga Katanungan
          </h2>
          <h3 className="text-4xl md:text-6xl font-ballet text-wedding-dark">Frequently Asked Questions</h3>
        </div>

        <div className="bg-white/60 backdrop-blur-sm border border-wedding-gold/10 rounded-[2.5rem] p-8 md:p-12 shadow-sm">
          {faqs.map((faq, index) => (
            <FAQItem 
              key={index} 
              question={faq.question} 
              answer={faq.answer} 
              image={faq.image}
              onImageClick={setZoomedImage}
            />
          ))}
        </div>
      </motion.div>

      {/* Image Zoom Overlay */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={zoomedImage} 
                alt="Overview" 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm p-2 rounded-full text-white/90 hover:text-white transition-all shadow-lg border border-white/10"
                aria-label="Close image"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
