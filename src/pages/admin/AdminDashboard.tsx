import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Ticket, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Stats {
  totalInvites: number;
  totalGuests: number;
  attendingGuests: number;
  pendingGuests: number;
  declinedGuests: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const guestsRef = collection(db, 'guests');
        const invitesRef = collection(db, 'invites');

        const [
          totalInvites,
          totalGuests,
          attendingGuests,
          declinedGuests
        ] = await Promise.all([
          getCountFromServer(invitesRef),
          getCountFromServer(query(guestsRef, where('is_baby_or_child', '!=', true))),
          getCountFromServer(query(guestsRef, where('is_coming', '==', true), where('is_baby_or_child', '!=', true))),
          getCountFromServer(query(guestsRef, where('is_coming', '==', false), where('is_baby_or_child', '!=', true)))
        ]);

        const total = totalGuests.data().count;
        const attending = attendingGuests.data().count;
        const declined = declinedGuests.data().count;

        setStats({
          totalInvites: totalInvites.data().count,
          totalGuests: total,
          attendingGuests: attending,
          declinedGuests: declined,
          // Derive "no RSVP yet" from the remainder so guests whose `is_coming`
          // field is absent (not explicit null) are still counted.
          pendingGuests: Math.max(0, total - attending - declined)
        });
        setError(false);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError(true);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats && error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <p className="text-slate-600 font-medium">Couldn't load dashboard stats.</p>
        <p className="text-sm text-slate-400">Retrying automatically…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
      </div>
    );
  }

  const rsvpTotal = stats.totalGuests || 0;
  const attendingPct = rsvpTotal > 0 ? (stats.attendingGuests / rsvpTotal) * 100 : 0;
  const declinedPct = rsvpTotal > 0 ? (stats.declinedGuests / rsvpTotal) * 100 : 0;

  const cards = [
    { label: 'Total Guests', value: stats.totalGuests, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Attending', value: stats.attendingGuests, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Declined', value: stats.declinedGuests, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'No RSVP Yet', value: stats.pendingGuests, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Invites Sent', value: stats.totalInvites, icon: Ticket, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-serif mb-2">Overview</h1>
        <p className="text-slate-500">Real-time tracking of Israel & Deborah's wedding guest list.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className={`w-12 h-12 ${card.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div className="text-3xl font-bold text-slate-800">{card.value}</div>
                <div className="text-sm font-medium text-slate-400 uppercase tracking-wider mt-1">{card.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-serif">RSVP Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${attendingPct}%` }}
              />
              <div
                className="h-full bg-rose-500"
                style={{ width: `${declinedPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-4 text-xs font-semibold text-slate-400">
              <span>{Math.round(attendingPct)}% Attending</span>
              <span>{Math.round(declinedPct)}% Declined</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
