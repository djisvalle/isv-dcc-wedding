import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDatetimeLocalValue } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  Calendar,
  MessageSquare,
  QrCode,
  Users,
  Plus,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { QrCodeDialog } from '@/components/admin/QrCodeDialog';
import { DEFAULT_GUEST_ROLES } from '@/features/guests/hooks/useGuestRoles';

export default function AdminSettings() {
  const [deadline, setDeadline] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [guestRoles, setGuestRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const siteUrl = window.location.origin;

  useEffect(() => {
    async function fetchSettings() {
      try {
        const deadlineSnap = await getDoc(doc(db, 'settings', 'rsvp_deadline'));
        if (deadlineSnap.exists()) {
          const value = deadlineSnap.data().value;
          if (value instanceof Timestamp) {
            setDeadline(toDatetimeLocalValue(value.toDate()));
          } else if (typeof value === 'string' && value) {
            // Pre-migration format: already a raw datetime-local string.
            setDeadline(value);
          }
        }

        const templateSnap = await getDoc(doc(db, 'settings', 'invite_message_template'));
        if (templateSnap.exists()) {
          setMessageTemplate(templateSnap.data().value);
        }

        const rolesSnap = await getDoc(doc(db, 'settings', 'guest_roles'));
        const rolesValue = rolesSnap.exists() ? rolesSnap.data().value : null;
        setGuestRoles(Array.isArray(rolesValue) && rolesValue.length > 0 ? rolesValue : DEFAULT_GUEST_ROLES);
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleAddRole = () => {
    const role = newRole.trim();
    if (!role || guestRoles.includes(role)) return;
    setGuestRoles(prev => [...prev, role]);
    setNewRole('');
  };

  const handleRemoveRole = (index: number) => {
    setGuestRoles(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveRole = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= guestRoles.length) return;
    setGuestRoles(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSaveRoles = async () => {
    setSavingRoles(true);
    try {
      await setDoc(doc(db, 'settings', 'guest_roles'), {
        key: 'guest_roles',
        value: guestRoles,
        updated_at: new Date().toISOString()
      });
      toast.success('Guest roles saved');
    } catch (error) {
      console.error('Error saving guest roles:', error);
      toast.error('Failed to save guest roles');
    } finally {
      setSavingRoles(false);
    }
  };

  const handleSaveDeadline = async () => {
    setSavingDeadline(true);
    try {
      // Stored as a real Timestamp (not a string) so Firestore rules can
      // enforce it server-side, not just hide the UI once it has passed.
      const parsed = deadline ? new Date(deadline) : null;
      if (parsed && isNaN(parsed.getTime())) {
        toast.error('Invalid deadline date');
        return;
      }

      await setDoc(doc(db, 'settings', 'rsvp_deadline'), {
        key: 'rsvp_deadline',
        value: parsed,
        updated_at: new Date().toISOString()
      });
      toast.success('RSVP deadline saved');
    } catch (error) {
      console.error('Error saving RSVP deadline:', error);
      toast.error('Failed to save RSVP deadline');
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleSaveMessage = async () => {
    setSavingMessage(true);
    try {
      await setDoc(doc(db, 'settings', 'invite_message_template'), {
        key: 'invite_message_template',
        value: messageTemplate,
        updated_at: new Date().toISOString()
      });
      toast.success('Message template saved');
    } catch (error) {
      console.error('Error saving message template:', error);
      toast.error('Failed to save message template');
    } finally {
      setSavingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-wedding-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-serif mb-2">Settings</h1>
        <p className="text-slate-500">Manage application-wide configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-wedding-gold/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-wedding-gold" />
                </div>
                <div>
                  <CardTitle className="font-serif text-xl">RSVP Configuration</CardTitle>
                  <CardDescription>Set the deadline for guest RSVPs.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="deadline">RSVP Deadline Date</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-xs text-slate-400">
                  Leave empty for no deadline. After this date, the RSVP form will become view-only.
                </p>
              </div>

              <Button
                onClick={handleSaveDeadline}
                disabled={savingDeadline}
                className="bg-wedding-gold hover:bg-wedding-gold/90 text-white rounded-xl"
              >
                {savingDeadline ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-wedding-gold/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-6 h-6 text-wedding-gold" />
                </div>
                <div>
                  <CardTitle className="font-serif text-xl">Site QR Code</CardTitle>
                  <CardDescription>Share the main wedding site link as a scannable code.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-400 break-all font-mono">{siteUrl}</p>
              <Button
                onClick={() => setIsQrOpen(true)}
                className="bg-wedding-gold hover:bg-wedding-gold/90 text-white rounded-xl"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Code
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-wedding-gold/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-wedding-gold" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl">Invitation Message</CardTitle>
                <CardDescription>Use {"<name>"} and {"<link>"} as placeholders.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="messageTemplate">Template</Label>
              <textarea
                id="messageTemplate"
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="w-full min-h-[160px] p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-wedding-gold/50"
                placeholder="Hello, <name>. We would like to cordially invite you... Please RSVP via our wedding website below: <link>"
              />
            </div>

            <Button
              onClick={handleSaveMessage}
              disabled={savingMessage}
              className="bg-wedding-gold hover:bg-wedding-gold/90 text-white rounded-xl"
            >
              {savingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-wedding-gold/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-wedding-gold" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl">Guest Roles</CardTitle>
                <CardDescription>Options shown for the guest Role field, in order.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {guestRoles.map((role, index) => (
                <div key={`${role}-${index}`} className="flex items-center gap-2">
                  <span className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 truncate">
                    {role}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-9 w-9 shrink-0"
                    onClick={() => handleMoveRole(index, -1)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-9 w-9 shrink-0"
                    onClick={() => handleMoveRole(index, 1)}
                    disabled={index === guestRoles.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-9 w-9 shrink-0 text-red-500 hover:text-red-600"
                    onClick={() => handleRemoveRole(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {guestRoles.length === 0 && (
                <p className="text-xs text-slate-400">No roles yet. Add one below.</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRole();
                  }
                }}
                placeholder="Add a role, e.g. Ninong"
                className="rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddRole}
                className="rounded-xl shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <Button
              onClick={handleSaveRoles}
              disabled={savingRoles}
              className="bg-wedding-gold hover:bg-wedding-gold/90 text-white rounded-xl"
            >
              {savingRoles ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <QrCodeDialog
        title="Wedding Website"
        link={siteUrl}
        fileName="wedding-website"
        open={isQrOpen}
        onOpenChange={setIsQrOpen}
      />
    </div>
  );
}
