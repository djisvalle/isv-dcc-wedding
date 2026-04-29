import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import Countdown from '@/components/shared/Countdown';
import RSVPSection from '@/components/shared/RSVPSection';
import { MapPin, Calendar, Heart, ChevronDown } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get('inviteUrl') || searchParams.get('invite') || searchParams.get('id');
  const rsvpRef = useRef<HTMLDivElement>(null);

  const weddingDate = "2027-01-08T00:00:00";

  useEffect(() => {
    if (inviteId && rsvpRef.current) {
      // Optional: Add a slight delay to allow the hero animation to breathe
      const timer = setTimeout(() => {
        rsvpRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [inviteId]);

  return (
    <div className="min-h-screen bg-wedding-cream relative">
      <div className="h-[100dvh] relative overflow-hidden flex flex-col items-center justify-center p-4 md:p-6 text-center">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-5 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 border-2 border-wedding-gold rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 border-2 border-wedding-gold rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl w-full"
        >
          <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-4 md:mb-6 opacity-80">
            Ang kasalan ni
          </h2>
          
          <h1 className="flex flex-col md:flex-row items-center justify-center font-ballet text-wedding-dark mb-4 md:mb-8 mt-6 md:mt-24 tracking-wide overflow-visible">
            <span className="text-6xl md:text-8xl md:whitespace-nowrap">Israel</span>
            <span className="italic text-4xl md:text-8xl text-wedding-gold/60 my-1 md:my-0 md:mx-12 leading-none">&</span>
            <span className="text-6xl md:text-8xl md:whitespace-nowrap">Deborah</span>
          </h1>

          <div className="h-[1px] w-24 bg-wedding-gold mx-auto mb-6 md:mb-10 opacity-30" />

          <div className="space-y-4 md:space-y-6 mb-8 md:mb-16">
            <p className="text-base md:text-xl font-serif italic text-wedding-dark/80 max-w-xl mx-auto px-4">
              Sa basbas ng Diyos at ng aming mga pamilya, malugod kaming nag-aanyaya sa inyong pagdalo sa pagdiriwang ng aming pag-iisang dibdib.
            </p>
          </div>

          <div className="mb-6 md:mb-10">
            <Countdown targetDate={weddingDate} />
          </div>

          <div className="mt-4 md:mt-8">
            <p className="font-sans text-[9px] md:text-[10px] tracking-[0.5em] uppercase text-wedding-dark/40 font-medium">
              January 8, 2027 <span className="mx-2 opacity-30">•</span> Intramuros
            </p>
          </div>
        </motion.div>

        {inviteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-wedding-gold/60 cursor-pointer"
            onClick={() => rsvpRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] font-sans">Scroll to RSVP</span>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        )}
      </div>

      {inviteId && (
        <div ref={rsvpRef} className="bg-white/40 backdrop-blur-md relative z-10">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wedding-gold/20 to-transparent" />
          <RSVPSection inviteId={inviteId} />
        </div>
      )}
    </div>
  );
}
