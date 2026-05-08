import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { 
  Settings as SettingsIcon, 
  Save, 
  Loader2,
  Calendar
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'settings', 'rsvp_deadline');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDeadline(docSnap.data().value);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'rsvp_deadline'), {
        key: 'rsvp_deadline',
        value: deadline,
        updated_at: new Date().toISOString()
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl font-serif text-slate-800 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-wedding-gold" />
          General Settings
        </h1>
        <p className="text-slate-500 mt-2">Manage application-wide configurations.</p>
      </div>

      <Card className="max-w-2xl border-wedding-gold/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-wedding-gold" />
            RSVP Configuration
          </CardTitle>
          <CardDescription>
            Set the deadline for guest RSVPs. After this date, the RSVP form will become view-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="deadline">RSVP Deadline Date</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-xs text-slate-400">
              Leave empty for no deadline.
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-wedding-gold hover:bg-wedding-gold/90 text-white"
          >
            {saving ? (
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
  );
}
