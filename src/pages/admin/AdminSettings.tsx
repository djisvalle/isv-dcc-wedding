import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDatetimeLocalValue } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  Calendar,
  MessageSquare
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

export default function AdminSettings() {
  const [deadline, setDeadline] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);

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
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

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
      </div>
    </div>
  );
}
