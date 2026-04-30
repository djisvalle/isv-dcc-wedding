import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Heart } from 'lucide-react';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '@/lib/firebase';
import { SectionDecors } from './DecorationLayer';

interface Guest {
  id: string;
  name: string;
  is_coming: boolean | null;
}

interface Invite {
  id: string;
  name: string;
  max_guests: number;
}

interface RSVPSectionProps {
  inviteId: string;
}

export default function RSVPSection({ inviteId }: RSVPSectionProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [completed, setCompleted] = useState(false);
  const [isPastDeadline, setIsPastDeadline] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);

  useEffect(() => {
    async function fetchInvite() {
      if (!inviteId) return;
      setLoading(true);
      try {
        // Fetch deadline
        const deadlineRef = doc(db, 'settings', 'rsvp_deadline');
        const deadlineSnap = await getDoc(deadlineRef).catch(err => {
          handleFirestoreError(err, OperationType.GET, 'settings/rsvp_deadline');
          throw err;
        });

        if (deadlineSnap.exists()) {
          const deadlineStr = deadlineSnap.data().value;
          if (deadlineStr) {
            const date = new Date(deadlineStr);
            setDeadlineDate(date);
            if (date < new Date()) {
              setIsPastDeadline(true);
            }
          }
        }

        const inviteRef = doc(db, 'invites', inviteId);
        const inviteSnap = await getDoc(inviteRef).catch(err => {
          handleFirestoreError(err, OperationType.GET, `invites/${inviteId}`);
          throw err;
        });
        
        if (!inviteSnap.exists()) {
          throw new Error('Invite not found');
        }

        const inviteData = { id: inviteSnap.id, ...inviteSnap.data() } as Invite;
        setInvite(inviteData);

        const guestsRef = collection(db, 'guests');
        const q = query(guestsRef, where('invite_id', '==', inviteId));
        const guestSnap = await getDocs(q).catch(err => {
          handleFirestoreError(err, OperationType.LIST, 'guests (filtered)');
          throw err;
        });
        
        setGuests(guestSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Guest)));
      } catch (err) {
        console.error("RSVP fetch error:", err);
        toast.error("Could not find your invitation. Please check the link.");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [inviteId]);

  const handleToggleGuest = (id: string, val: boolean) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, is_coming: val } : g));
  };

  const handleSubmit = async () => {
    if (!inviteId) return;
    setSubmitting(true);
    try {
      for (const guest of guests) {
        const guestRef = doc(db, 'guests', guest.id);
        await updateDoc(guestRef, {
          is_coming: guest.is_coming,
          updated_at: serverTimestamp()
        });
      }
      toast.success("Thank you! Your RSVP has been saved.");
      setCompleted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `guests/multiple`);
      toast.error("Failed to save RSVP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold mb-4" />
        <p className="font-sans text-xs tracking-widest uppercase opacity-40">Loading Invitation...</p>
      </div>
    );
  }

  if (!invite) return null;

  if (completed) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-20 text-center"
      >
        <div className="bg-wedding-cream border border-wedding-gold/20 rounded-3xl p-12 max-w-lg mx-auto shadow-xl">
          <Heart className="w-12 h-12 text-wedding-gold mx-auto mb-6 fill-wedding-gold/10" />
          <h2 className="text-3xl font-serif mb-4 text-wedding-dark">Thank you!</h2>
          <p className="font-serif italic text-lg text-wedding-dark/60">
            Your RSVP has been confirmed. We can't wait to celebrate with you!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div id="rsvp" className="py-10 md:py-20 px-4 md:px-6 relative overflow-hidden">
      <SectionDecors.RSVP />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-2xl mx-auto"
      >
        <Card className="border-wedding-gold/20 shadow-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
          <CardHeader className="bg-wedding-gold/5 text-center py-8 md:py-12 px-6 md:px-8 border-b border-wedding-gold/10">
            <CardTitle className="text-2xl md:text-4xl font-serif mb-2 md:mb-6 leading-tight">
              Hello, <span className="font-ballet text-3xl md:text-5xl text-wedding-gold ml-1">{invite.name}</span> <br /> We have reserved <span className="text-wedding-gold font-bold">{guests.length}</span> {guests.length === 1 ? 'seat' : 'seats'} for you!
            </CardTitle>
            <CardDescription className="text-sm md:text-lg font-serif italic text-wedding-dark/70">
              {isPastDeadline 
                ? "The deadline for RSVP updates has passed. Below is your recorded status." 
                : "Kindly confirming who will be attending."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-12">
            <div className="space-y-8 md:space-y-12">
              <div className="space-y-4 md:space-y-6">
                {guests.map((guest) => (
                  <div key={guest.id} className="p-4 md:p-6 border border-wedding-gold/10 rounded-2xl bg-white/30 space-y-4 hover:border-wedding-gold/30 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <span className="font-serif text-lg md:text-xl text-wedding-dark text-center md:text-left">{guest.name}</span>
                      <div className="flex gap-2 md:gap-4">
                        <button
                          type="button"
                          disabled={isPastDeadline}
                          onClick={() => handleToggleGuest(guest.id, true)}
                          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full border transition-all text-xs md:text-sm font-sans tracking-wide ${
                            guest.is_coming === true 
                            ? "bg-wedding-gold border-wedding-gold text-white shadow-md" 
                            : "bg-transparent border-wedding-gold/20 text-wedding-dark hover:border-wedding-gold/50"
                          } ${isPastDeadline ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Attending
                        </button>
                        <button
                          type="button"
                          disabled={isPastDeadline}
                          onClick={() => handleToggleGuest(guest.id, false)}
                          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full border transition-all text-xs md:text-sm font-sans tracking-wide ${
                            guest.is_coming === false 
                            ? "bg-rose-500 border-rose-500 text-white shadow-md" 
                            : "bg-transparent border-wedding-gold/20 text-wedding-dark hover:border-wedding-gold/50"
                          } ${isPastDeadline ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Not Attending
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!isPastDeadline && (
                <div className="pt-6 space-y-6">
                  <p className="text-center text-xs md:text-sm font-serif text-wedding-dark/70 leading-relaxed max-w-sm mx-auto">
                    For any questions, please contact either <span className="inline-block"><strong>Israel</strong> at <strong>0919 067 9165</strong></span> or <span className="inline-block"><strong>Debs</strong> at <strong>0969 519 2733</strong></span>.
                  </p>
                  
                  <Button
                    size="lg"
                    disabled={submitting || guests.every(g => g.is_coming === null)}
                    onClick={handleSubmit}
                    className="w-full bg-wedding-dark hover:bg-wedding-dark/90 text-white rounded-full py-6 md:py-8 text-base md:text-lg font-serif tracking-[0.2em] transition-all shadow-xl disabled:opacity-30"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" />
                        <span>Processing...</span>
                      </div>
                    ) : "Confirm RSVP"}
                  </Button>
                  <p className="text-center mt-4 text-[10px] uppercase tracking-[0.2em] text-wedding-dark/40 font-sans">
                    We look forward to seeing you
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
