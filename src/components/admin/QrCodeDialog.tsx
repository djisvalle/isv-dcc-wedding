import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface QrCodeDialogProps {
  title: string;
  link: string;
  fileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QrCodeDialog({ title, link, fileName, open, onOpenChange }: QrCodeDialogProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const canvas = canvasWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link_el = document.createElement('a');
    link_el.download = `${fileName}.png`;
    link_el.href = canvas.toDataURL('image/png');
    link_el.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code: {title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div ref={canvasWrapperRef} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <QRCodeCanvas value={link} size={200} level="M" marginSize={0} />
          </div>
          <p className="text-xs text-slate-400 text-center break-all font-mono">{link}</p>
          <Button
            type="button"
            onClick={handleDownload}
            className="w-full bg-wedding-gold hover:bg-wedding-gold/80"
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
