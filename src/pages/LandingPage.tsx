import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import Countdown from '@/components/shared/Countdown';
import LandingPhotoSection from '@/components/shared/LandingPhotoSection';
import FirstPhotoSection from '@/components/shared/FirstPhotoSection';
import SecondPhotoSection from '@/components/shared/SecondPhotoSection';
import VenueSection from '@/components/shared/VenueSection';
import EntourageSection from '@/components/shared/EntourageSection';
import MidPhotoSection from '@/components/shared/MidPhotoSection';
import DressCodeSection from '@/components/shared/DressCodeSection';
import ProgramSection from '@/components/shared/ProgramSection';
import GiftsSection from '@/components/shared/GiftsSection';
import FAQSection from '@/components/shared/FAQSection';
import RSVPSection from '@/components/shared/RSVPSection';
import EndPhotoSection from '@/components/shared/EndPhotoSection';
import SixthPhotoSection from '@/components/shared/SixthPhotoSection';
import SeventhPhotoSection from '@/components/shared/SeventhPhotoSection';
import EighthPhotoSection from '@/components/shared/EighthPhotoSection';
import RSVPPhotoSection from '@/components/shared/RSVPPhotoSection';
import SectionNav from '@/components/shared/SectionNav';
import { useRsvpInvite } from '@/features/rsvp/hooks/useRsvpInvite';
import { useMemo, useRef } from 'react';

const WEDDING_PARTY_ROLES = new Set(['Groomsman', 'Bridesmaid']);

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const rawInviteId = searchParams.get('inviteUrl') || searchParams.get('invite') || searchParams.get('id');
  const inviteId = rawInviteId?.trim().replace(/\/+$/, '');
  const { guests } = useRsvpInvite(inviteId);
  const isWeddingParty = guests.some(g => g.role && WEDDING_PARTY_ROLES.has(g.role));
  const guestSexes = new Set(guests.map(g => g.sex).filter(Boolean));
  const guestSex = guestSexes.size === 1 ? [...guestSexes][0] : undefined;
  const landingPhotoRef = useRef<HTMLDivElement>(null);
  const venueRef = useRef<HTMLDivElement>(null);
  const entourageRef = useRef<HTMLDivElement>(null);
  const dressCodeRef = useRef<HTMLDivElement>(null);
  const programRef = useRef<HTMLDivElement>(null);
  const giftsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const rsvpRef = useRef<HTMLDivElement>(null);

  const navItems = useMemo(
    () => [
      { id: 'venue', label: 'Venue', targetRef: venueRef },
      { id: 'entourage', label: 'Entourage', targetRef: entourageRef },
      { id: 'dress-code', label: 'Dress Code', targetRef: dressCodeRef },
      { id: 'program', label: 'Program', targetRef: programRef },
      { id: 'gifts', label: 'Gifts', targetRef: giftsRef },
      { id: 'faq', label: 'FAQ', targetRef: faqRef },
      ...(inviteId ? [{ id: 'rsvp', label: 'RSVP', targetRef: rsvpRef }] : []),
    ],
    [inviteId]
  );

  const weddingDate = "2027-01-08T00:00:00";

  return (
    <div className="min-h-screen bg-wedding-cream relative">
      <div ref={landingPhotoRef}>
        <LandingPhotoSection />
      </div>

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
            className="text-xs md:text-sm uppercase tracking-[0.4em] font-anaktoria text-wedding-gold mb-8 md:mb-12"
          >
            Ang kasalan nina
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
            <p className="text-base md:text-xl font-anaktoria text-wedding-gold max-w-[280px] md:max-w-xl mx-auto leading-relaxed">
              Sa basbas ng Diyos at ng aming mga pamilya,<br />
              malugod kaming nag-aanyaya sa aming<br />
              pag-iisang dibdib.
            </p>
          </div>

          <div className="mb-10 md:mb-16 w-full">
            <Countdown targetDate={weddingDate} />
          </div>

          <div className="mt-4 md:mt-8">
            <p className="font-anaktoria text-[13px] md:text-sm tracking-[0.5em] uppercase text-wedding-dark/30 font-bold">
              01 <span className="mx-1">.</span> 08 <span className="mx-1">.</span> 2027
            </p>
            <p className="font-anaktoria text-[13px] md:text-xs tracking-[0.3em] uppercase text-wedding-gold font-medium mt-2">
              3:00 PM
            </p>

          </div>
        </motion.div>
      </div>

      <FirstPhotoSection />

      <div ref={venueRef}>
        <VenueSection />
      </div>

      <SecondPhotoSection />

      <div ref={entourageRef}>
        <EntourageSection />
      </div>

      <MidPhotoSection />

      <div ref={dressCodeRef}>
        <DressCodeSection isWeddingParty={isWeddingParty} sex={guestSex} />
      </div>

      <SixthPhotoSection />

      <div ref={programRef}>
        <ProgramSection />
      </div>

      <SeventhPhotoSection />

      <div ref={giftsRef}>
        <GiftsSection />
      </div>

      <EighthPhotoSection />

      <div ref={faqRef}>
        <FAQSection />
      </div>

      {inviteId && (
        <>
          <RSVPPhotoSection />

          <div ref={rsvpRef} className="relative z-10">
            <div className="bg-white/40 backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wedding-gold/20 to-transparent" />
              <RSVPSection inviteId={inviteId} />
            </div>
          </div>
        </>
      )}

      <EndPhotoSection />

      <SectionNav items={navItems} hideWhileVisibleRef={landingPhotoRef} />
    </div>
  );
}

