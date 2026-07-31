import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Heart } from 'lucide-react';
import { useRsvpInvite } from '@/features/rsvp/hooks/useRsvpInvite';
import { useSubmitRsvp } from '@/features/rsvp/hooks/useSubmitRsvp';
import type { Guest } from '@/features/rsvp/types';
import RsvpSkeleton from './RsvpSkeleton';

interface RSVPSectionProps {
  inviteId: string;
}

export default function RSVPSection({ inviteId }: RSVPSectionProps) {
  const { invite, guests: serverGuests, isPastDeadline, loading, error } = useRsvpInvite(inviteId);
  const submitMutation = useSubmitRsvp(inviteId);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setGuests(prev => (prev.length === 0 || completed ? serverGuests : prev));
  }, [serverGuests, completed]);

  useEffect(() => {
    if (error) {
      console.error('RSVP fetch error:', error);
      toast.error('Could not find your invitation. Please check the link.');
    }
  }, [error]);

  const handleToggleGuest = (id: string, val: boolean) => {
    setGuests(prev => prev.map(g => (g.id === id ? { ...g, is_coming: val } : g)));
  };

  const handleSubmit = async () => {
    const changedGuests = guests
      .filter(guest => {
        const initial = serverGuests.find(sg => sg.id === guest.id);
        return initial && initial.is_coming !== guest.is_coming;
      })
      .map(g => ({ id: g.id, is_coming: g.is_coming }));

    if (changedGuests.length === 0) {
      toast.info('No changes to save.');
      setCompleted(true);
      return;
    }

    try {
      await submitMutation.mutateAsync(changedGuests);
      toast.success('Thank you! Your RSVP has been saved.');
      setCompleted(true);
    } catch {
      toast.error('Failed to save RSVP. Please try again.');
    }
  };

  if (loading) {
    return <RsvpSkeleton />;
  }

  if (!invite) return null;

  if (completed) {
    const isAllNotAttending = guests.every(g => g.is_coming === false);
    const successMessage = isAllNotAttending 
      ? "Kumpirmado na ang iyong RSVP.\nIkinalulungkot namin na hindi kayo makakadalo.\nInaasahan naming makasama kayo sa diwa sa aming pagdiriwang."
      : "Kumpirmado na ang iyong RSVP.\nIsang karangalan po na makasama kayo sa okasyong ito.";

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-10 md:py-20 text-center"
      >
        <div className="bg-wedding-cream border border-wedding-gold/20 rounded-3xl p-6 md:p-12 mx-4 max-w-lg md:mx-auto shadow-xl">
          <Heart className="w-12 h-12 text-wedding-gold mx-auto mb-6 fill-wedding-gold/10" />
          <h2 className="text-3xl font-serif mb-4 text-wedding-dark">Maraming salamat!</h2>
          <p className="font-serif italic text-lg text-wedding-dark/60 whitespace-pre-line">
            {successMessage}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div id="rsvp" className="py-12 md:py-20 px-6 md:px-8 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-2xl mx-auto"
      >
        <Card className="border-none shadow-xl overflow-hidden bg-white/60 backdrop-blur-md rounded-[2.5rem]">
          <CardHeader className="bg-wedding-gold/5 text-center py-10 md:py-16 px-8 md:px-12 border-b border-wedding-gold/5">
            <CardTitle className="text-2xl md:text-5xl font-serif mb-6 md:mb-10 leading-snug">
              Hello, <span className="font-ballet text-5xl md:text-6xl text-wedding-gold block mt-2">{invite.nickname || (guests.length === 1 && guests[0].nickname) || invite.name}</span>
            </CardTitle>
            <CardDescription className="font-serif italic text-wedding-dark/60 leading-relaxed max-w-[280px] md:max-w-md mx-auto">
              <span className="text-xl md:text-2xl text-wedding-dark/80 block mb-2">We have reserved <span className="text-wedding-gold font-bold">{guests.filter(g => !g.is_baby_or_child).length}</span> {guests.filter(g => !g.is_baby_or_child).length === 1 ? 'seat' : 'seats'} for you.</span>
              <span className="text-base md:text-lg block">
                {isPastDeadline 
                  ? "The deadline for RSVP updates has passed." 
                  : "Kindly confirm who will be attending."}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 md:p-14">
            <div className="space-y-10 md:space-y-16">
              <div className="space-y-6">
                {guests.map((guest) => (
                  <div key={guest.id} className="p-6 md:p-8 border border-wedding-gold/5 rounded-3xl bg-white/40 space-y-6 hover:border-wedding-gold/20 transition-all shadow-sm">
                    <div className="flex flex-col items-center md:flex-row md:items-center justify-between gap-4">
                      <span className="font-serif text-xl md:text-2xl text-wedding-dark text-center md:text-left">{guest.name}</span>
                        <div className="flex items-center justify-center gap-2 md:gap-3 w-full md:w-auto">
                          <button
                            type="button"
                            disabled={isPastDeadline}
                            onClick={() => handleToggleGuest(guest.id, true)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-full border transition-all text-[10px] md:text-xs font-sans tracking-[0.1em] font-bold uppercase whitespace-nowrap ${
                              guest.is_coming === true 
                              ? "bg-wedding-gold border-wedding-gold text-white shadow-lg scale-105" 
                              : "bg-transparent border-wedding-gold/10 text-wedding-dark/40 hover:border-wedding-gold/30"
                            } ${isPastDeadline ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Attending
                          </button>
                          <button
                            type="button"
                            disabled={isPastDeadline}
                            onClick={() => handleToggleGuest(guest.id, false)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-full border transition-all text-[10px] md:text-xs font-sans tracking-[0.1em] font-bold uppercase whitespace-nowrap ${
                              guest.is_coming === false 
                              ? "bg-rose-400 border-rose-400 text-white shadow-lg scale-105" 
                              : "bg-transparent border-wedding-gold/10 text-wedding-dark/40 hover:border-wedding-gold/30"
                            } ${isPastDeadline ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Not Attending
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {!isPastDeadline && (
                <div className="pt-8 space-y-8">
                  <div className="text-center space-y-2">
                    <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-wedding-dark/30 font-sans font-bold">For any questions, please contact either</p>
                    <p className="text-sm md:text-base font-serif text-wedding-dark/50 italic leading-relaxed">
                      Israel <span className="font-sans font-bold not-italic mx-1">0919 067 9165</span><br />
                      Debs <span className="font-sans font-bold not-italic mx-1">0969 519 2733</span>
                    </p>
                  </div>
                  
                  <Button
                    size="lg"
                    disabled={submitMutation.isPending || guests.every(g => g.is_coming === null)}
                    onClick={handleSubmit}
                    className="w-full bg-wedding-dark hover:bg-wedding-dark/95 text-white rounded-full py-7 md:py-9 text-lg md:text-xl font-serif tracking-[0.2em] transition-all shadow-xl disabled:opacity-20 active:scale-95"
                  >
                    {submitMutation.isPending ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin w-5 h-5" />
                        <span>Confirming...</span>
                      </div>
                    ) : "Confirm RSVP"}
                  </Button>
                </div>
              )}
            
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
