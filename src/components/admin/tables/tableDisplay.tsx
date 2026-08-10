import { User, Crown, Star, GlassWater } from 'lucide-react';

export function getTableIcon(type: string) {
  switch (type) {
    case 'bridal': return <Crown className="w-5 h-5 text-wedding-gold" />;
    case 'vip': return <Star className="w-5 h-5 text-amber-400" />;
    case 'regular': return <GlassWater className="w-5 h-5 text-wedding-gold/60" />;
    default: return <User className="w-5 h-5 text-slate-300" />;
  }
}

export function getTableTitle(type: string, number: string) {
  switch (type) {
    case 'bridal': return 'Bridal Table';
    case 'vip': return `VIP Table ${number}`;
    case 'regular': return `Regular Table ${number}`;
    default: return 'No Table Assigned';
  }
}
