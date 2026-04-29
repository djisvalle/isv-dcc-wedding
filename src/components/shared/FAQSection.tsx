import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import locationGuide from '@/assets/map-data.png';

interface FAQItemProps {
  question: string;
  answer: string;
  image?: string;
  onImageClick?: (src: string) => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, image, onImageClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-wedding-gold/10 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left group transition-all"
      >
        <span className="font-serif text-lg md:text-xl text-wedding-dark group-hover:text-wedding-gold transition-colors pr-8">
          {question}
        </span>
        <ChevronDown 
          className={cn(
            "w-5 h-5 text-wedding-gold/50 transition-transform duration-300 shrink-0",
            isOpen && "rotate-180 text-wedding-gold"
          )} 
        />
      </button>
      <div 
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100 mb-6" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p className="font-serif italic text-wedding-dark/60 leading-relaxed md:text-lg whitespace-pre-line">
            {answer}
          </p>
          {image && (
            <div 
              className="mt-4 rounded-xl overflow-hidden border border-wedding-gold/20 shadow-sm relative group/image cursor-zoom-in"
              onClick={() => onImageClick?.(image)}
            >
              <img 
                src={image} 
                alt="Overview" 
                className="w-full h-auto transition-transform duration-500 group-hover/image:scale-105"
                loading="eager"
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
      </div>
    </div>
  );
}

export default function FAQSection() {
  const [deadlineDate, setDeadlineDate] = useState<string>('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        const docRef = doc(db, 'settings', 'rsvp_deadline');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const val = snap.data().value;
          if (val) {
            const date = new Date(val);
            setDeadlineDate(date.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch deadline:', err);
      }
    };
    fetchDeadline();
  }, []);

  const faqs = [
    {
      question: "Is there parking available?",
      answer: "While there is limited available parking at the venue, we will be reserving this for family, friends, and suppliers.\n\nHowever, there is parking managed by Intramuros, as shown in the image below, colored in gray.",
      image: locationGuide
    },
    {
      question: "Can I bring a plus one?",
      answer: "Due to venue capacity, we can only accommodate guests specifically named on the invitation. Your digital RSVP will show exactly how many seats have been reserved for your party."
    },
    {
      question: "What is the RSVP deadline?",
      answer: deadlineDate 
        ? `We kindly request that you confirm your attendance through this website by ${deadlineDate}. Your timely response helps us in our final preparations.`
        : "We kindly request that you confirm your attendance through this website as soon as possible. Your timely response helps us in our final preparations."
    },
    {
      question: "Are children allowed?",
      answer: "While we love your little ones, we have decided to have an adults-only celebration to allow all our guests to fully enjoy the evening. We appreciate your understanding."
    }
  ];

  return (
    <section className="py-20 px-4 md:px-6 bg-wedding-cream/30 relative" id="faq-section">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center mb-12">
          <h2 className="text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-4 opacity-80">
            Common Questions
          </h2>
          <h3 className="text-4xl md:text-5xl font-ballet text-wedding-dark">Frequently Asked Questions</h3>
        </div>

        <div className="bg-white/50 backdrop-blur-sm border border-wedding-gold/20 rounded-3xl p-6 md:p-10 shadow-xl">
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

        <div className="mt-12 text-center">
          <p className="font-serif italic text-wedding-dark/50">
            Still have questions? Feel free to reach out to us directly.
          </p>
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
                className="absolute top-0 right-0 -mt-12 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
