import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Copy, Edit2, Trash2, MessageSquare, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { EditableCell } from '@/components/admin/EditableCell';
import { QrCodeDialog } from '@/components/admin/QrCodeDialog';
import { slugify } from '@/lib/utils';
import type { Invite, InviteWithCounts } from '@/features/invites/types';

interface InviteRowProps {
  invite: InviteWithCounts;
  onCopyLink: (id: string) => void;
  onCopyMessage: (invite: Invite) => void;
  onUpdateName: (id: string, value: string) => void;
  onEdit: (invite: InviteWithCounts) => void;
  onDelete: (id: string) => void;
}

function InviteRowComponent({ invite, onCopyLink, onCopyMessage, onUpdateName, onEdit, onDelete }: InviteRowProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);

  return (
    <TableRow className="group hover:bg-slate-50/50 transition-colors">
      <TableCell className="py-6 px-8 text-xs font-mono text-slate-400">
        {invite.import_order !== undefined ? invite.import_order + 1 : '-'}
      </TableCell>
      <TableCell className="py-6 px-8">
        <EditableCell
          value={invite.name}
          onSave={(newValue) => onUpdateName(invite.id, newValue)}
          onInvalid={(message) => toast.error(message)}
          className="font-semibold text-slate-700 hover:underline decoration-dotted decoration-slate-300 underline-offset-2"
          inputClassName="h-7 px-2 text-sm font-semibold"
        />
      </TableCell>
      <TableCell className="py-6 px-8 text-slate-500">{invite.guest_count} Guests</TableCell>
      <TableCell className="py-6 px-8">
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          invite.attending_count === invite.guest_count
            ? 'bg-emerald-100 text-emerald-700'
            : invite.attending_count > 0
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
        }`}>
          {invite.attending_count} / {invite.guest_count} Joined
        </span>
      </TableCell>
      <TableCell className="py-6 px-8">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onCopyLink(invite.id)}
          title="Click to copy full link"
        >
          <code className="text-[10px] font-mono text-wedding-gold bg-wedding-gold/5 px-2 py-1 rounded truncate max-w-[150px]">
            ?inviteUrl={invite.id}
          </code>
          <Copy className="w-3 h-3 text-wedding-gold opacity-40" />
        </div>
      </TableCell>
      <TableCell className="py-6 px-8 text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(invite)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopyLink(invite.id)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsQrOpen(true)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
            title="Show QR code"
          >
            <QrCode className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopyMessage(invite)}
            className="text-slate-400 hover:text-wedding-gold hover:bg-wedding-gold/5"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(invite.id)}
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
      <QrCodeDialog
        title={invite.name}
        link={`${window.location.origin}/?inviteUrl=${invite.id}`}
        fileName={slugify(invite.name)}
        open={isQrOpen}
        onOpenChange={setIsQrOpen}
      />
    </TableRow>
  );
}

export const InviteRow = React.memo(InviteRowComponent);
