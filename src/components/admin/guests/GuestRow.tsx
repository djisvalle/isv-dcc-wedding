import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, UserCheck, UserX, UserMinus, Edit2, Trash2, MessageSquare, Hourglass } from 'lucide-react';
import { toast } from 'sonner';
import { EditableCell } from '@/components/admin/EditableCell';
import type { Guest } from '@/features/guests/types';

interface GuestRowProps {
  guest: Guest & { invite_name?: string | null };
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateStatus: (ids: string[], status: boolean | null) => void;
  onMoveToWaiting: (ids: string[]) => void;
  onUpdateField: (id: string, field: 'name' | 'nickname', value: string) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (id: string) => void;
  onCopyMessage: (guest: Guest) => void;
}

function GuestRowComponent({
  guest,
  selected,
  onToggleSelect,
  onUpdateStatus,
  onMoveToWaiting,
  onUpdateField,
  onEdit,
  onDelete,
  onCopyMessage,
}: GuestRowProps) {
  return (
    <TableRow className="group hover:bg-slate-50/50 transition-colors">
      <TableCell className="px-8">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(guest.id)}
        />
      </TableCell>
      <TableCell className="py-6 px-8 text-xs font-mono text-slate-400">
        {guest.import_order !== undefined ? guest.import_order + 1 : '-'}
      </TableCell>
      <TableCell className="py-6 px-8">
        <EditableCell
          value={guest.name}
          onSave={(newValue) => onUpdateField(guest.id, 'name', newValue)}
          onInvalid={(message) => toast.error(message)}
          className="font-semibold text-slate-700 hover:underline decoration-dotted decoration-slate-300 underline-offset-2"
          inputClassName="h-7 px-2 text-sm font-semibold"
        />
        <EditableCell
          value={guest.nickname || ''}
          onSave={(newValue) => onUpdateField(guest.id, 'nickname', newValue)}
          placeholder="Add nickname"
          allowEmpty
          className="block text-[10px] text-slate-400 italic hover:underline decoration-dotted underline-offset-2"
          inputClassName="h-6 px-2 text-xs italic mt-0.5"
        />
        {(guest.table_type || guest.table_number) && (
          <div className="mt-1 flex gap-1">
            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-bold">
              {guest.table_type === 'bridal' ? 'Bridal Table' : guest.table_type === 'vip' ? `VIP ${guest.table_number || ''}` : `Reg ${guest.table_number || ''}`}
            </span>
          </div>
        )}
        {guest.updated_at && (
          <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
            Updated {guest.updated_at.seconds ? new Date(guest.updated_at.seconds * 1000).toLocaleDateString() : new Date(guest.updated_at).toLocaleDateString()}
          </div>
        )}
      </TableCell>
      <TableCell className="py-6 px-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <code className="text-[10px] px-1.5 py-0.5 bg-wedding-gold/10 text-wedding-gold rounded truncate max-w-[120px]" title={guest.invite_id || `ind-${guest.id.substring(0, 5)}`}>
              {guest.invite_id || `ind-${guest.id.substring(0, 5)}`}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                const link = `${window.location.origin}/rsvp/${guest.invite_id || guest.id}`;
                navigator.clipboard.writeText(link);
                toast.success(guest.invite_id ? 'Group Link copied' : 'Link copied');
              }}
              title={guest.invite_id ? "Copy Group RSVP Link" : "Copy RSVP Link"}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          {guest.invite_id && (
            <div className="flex items-center gap-2">
              <code className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded truncate max-w-[120px]" title={`ind-${guest.id.substring(0, 5)}`}>
                ind-{guest.id.substring(0, 5)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-slate-600"
                onClick={() => {
                  const link = `${window.location.origin}/rsvp/${guest.id}`;
                  navigator.clipboard.writeText(link);
                  toast.success('Individual Link copied');
                }}
                title="Copy Individual RSVP Link"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="py-6 px-8">
        {guest.role ? (
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
            {guest.role}
          </span>
        ) : (
          <span className="text-slate-300 italic text-xs">Guest</span>
        )}
      </TableCell>
      <TableCell className="py-6 px-8 text-slate-500 italic font-serif">
        {guest.invite_name || <span className="text-slate-300 opacity-50">Unassigned</span>}
      </TableCell>
      <TableCell className="py-6 px-8">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-[100px]">
            {guest.is_coming === true ? (
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                <UserCheck className="w-4 h-4" /> Attending
              </div>
            ) : guest.is_coming === false ? (
              <div className="flex items-center gap-1.5 text-rose-500 font-semibold text-sm">
                <UserX className="w-4 h-4" /> Declined
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-sm italic">
                <UserMinus className="w-4 h-4" /> Pending
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-full ${guest.is_coming === true ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600'}`}
              onClick={() => onUpdateStatus([guest.id], true)}
              title="Mark as Attending"
            >
              <UserCheck className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-full ${guest.is_coming === false ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:text-rose-500'}`}
              onClick={() => onUpdateStatus([guest.id], false)}
              title="Mark as Declined"
            >
              <UserX className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-full ${guest.is_coming === null ? 'text-slate-600 bg-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
              onClick={() => onUpdateStatus([guest.id], null)}
              title="Mark as Pending"
            >
              <UserMinus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-6 px-8 text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMoveToWaiting([guest.id])}
            className="text-slate-400 hover:text-amber-600 hover:bg-amber-50"
            title="Move to Waiting List"
          >
            <Hourglass className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(guest)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(guest.id)}
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopyMessage(guest)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
            title="Copy Message"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export const GuestRow = React.memo(GuestRowComponent);
