import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Users, Ticket, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGuests } from '@/features/guests/context/GuestsProvider';
import { useInvites } from '@/features/invites/context/InvitesProvider';

export default function AdminDashboard() {
  const { guests, loading: guestsLoading } = useGuests();
  const { invites, loading: invitesLoading } = useInvites();

  const stats = useMemo(() => {
    const countedGuests = guests.filter(g => !g.is_baby_or_child);
    return {
      totalInvites: invites.length,
      totalGuests: countedGuests.length,
      attendingGuests: countedGuests.filter(g => g.is_coming === true).length,
      declinedGuests: countedGuests.filter(g => g.is_coming === false).length,
      pendingGuests: countedGuests.filter(g => g.is_coming === null).length,
    };
  }, [guests, invites]);

  if (guestsLoading || invitesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
      </div>
    );
  }

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

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden mt-12">
        <CardHeader>
          <CardTitle className="font-serif">RSVP Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${stats.totalGuests > 0 ? (stats.attendingGuests / stats.totalGuests) * 100 : 0}%` }}
            />
            <div
              className="h-full bg-rose-500"
              style={{ width: `${stats.totalGuests > 0 ? (stats.declinedGuests / stats.totalGuests) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between mt-4 text-xs font-semibold text-slate-400">
            <span>{stats.totalGuests > 0 ? Math.round((stats.attendingGuests / stats.totalGuests) * 100) : 0}% Attending</span>
            <span>{stats.totalGuests > 0 ? Math.round((stats.declinedGuests / stats.totalGuests) * 100) : 0}% Declined</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
