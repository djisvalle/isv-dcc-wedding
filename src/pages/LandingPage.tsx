import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import Countdown from '@/components/shared/Countdown';
import VenueSection from '@/components/shared/VenueSection';
import DressCodeSection from '@/components/shared/DressCodeSection';
import ProgramSection from '@/components/shared/ProgramSection';
import GiftsSection from '@/components/shared/GiftsSection';
import FAQSection from '@/components/shared/FAQSection';
import RSVPSection from '@/components/shared/RSVPSection';
import { useEffect, useRef } from 'react';

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const rawInviteId = searchParams.get('inviteUrl') || searchParams.get('invite') || searchParams.get('id');
  const inviteId = rawInviteId?.trim().replace(/\/+$/, '');
  const rsvpRef = useRef<HTMLDivElement>(null);
  const venueRef = useRef<HTMLDivElement>(null);

  const weddingDate = "2027-01-08T00:00:00";

  return (
    <div className="min-h-screen bg-wedding-cream relative">
      <div className="min-h-[100dvh] relative overflow-hidden flex flex-col items-center justify-center pt-20 pb-20 px-6 text-center">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-5 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-32 h-32 border border-wedding-gold rounded-full blur-2xl md:hidden" />
          <div className="absolute bottom-[20%] right-[10%] w-48 h-48 border border-wedding-gold rounded-full blur-2xl md:hidden" />
          <div className="absolute top-10 left-10 w-64 h-64 border-2 border-wedding-gold rounded-full blur-3xl hidden md:block" />
          <div className="absolute bottom-10 right-10 w-96 h-96 border-2 border-wedding-gold rounded-full blur-3xl hidden md:block" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="max-w-3xl w-full flex flex-col items-center z-10"
        >
          <motion.h2 
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 0.6, letterSpacing: "0.4em" }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="text-xs md:text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-8 md:mb-12"
          >
            Ang kasalan ni
          </motion.h2>
          
          <div className="relative mb-8 md:mb-12">
            <h1 className="flex flex-col md:flex-row items-center justify-center font-ballet text-wedding-dark text-6xl md:text-7xl lg:text-8xl tracking-tight">
              <span>Israel</span>
              <span className="italic text-4xl md:text-5xl lg:text-7xl text-wedding-gold/60 my-2 md:my-0 md:mx-12 leading-none">&</span>
              <span>Deborah</span>
            </h1>
          </div>

          <div className="h-px w-12 md:w-20 bg-wedding-gold/30 mx-auto mb-8 md:mb-14" />

          <div className="space-y-4 md:space-y-6 mb-10 md:mb-20">
            <p className="text-base md:text-xl font-serif italic text-wedding-gold max-w-[280px] md:max-w-xl mx-auto leading-relaxed">
              Sa basbas ng Diyos at ng aming mga pamilya,<br />
              malugod kaming nag-aanyaya sa aming<br />
              pag-iisang dibdib.
            </p>
          </div>

          <div className="mb-10 md:mb-16 w-full">
            <Countdown targetDate={weddingDate} />
          </div>

          <div className="mt-4 md:mt-8">
            <p className="font-sans text-[10px] md:text-sm tracking-[0.5em] uppercase text-wedding-dark/30 font-bold">
              01 <span className="mx-1">•</span> 08 <span className="mx-1">•</span> 2027
            </p>
            <p className="font-sans text-[10px] md:text-xs tracking-[0.3em] uppercase text-wedding-gold font-medium mt-2">
              3:00 PM
            </p>

          </div>
        </motion.div>
      </div>

      <div ref={venueRef}>
        <VenueSection />
      </div>
      
      <DressCodeSection />

      <ProgramSection />

      <GiftsSection />
      
      <FAQSection />

      {inviteId && (
        <div ref={rsvpRef} className="relative z-10">
          <div className="bg-white/40 backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wedding-gold/20 to-transparent" />
            <RSVPSection inviteId={inviteId} />
          </div>
        </div>
      )}
    </div>
  );
}

