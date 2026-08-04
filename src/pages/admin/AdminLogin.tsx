import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Heart, Loader2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { BOOTSTRAP_ADMIN_EMAILS } from '@/lib/adminEmails';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user is admin or should be bootstrapped
      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      const isBootstrappedAdmin = user.email && BOOTSTRAP_ADMIN_EMAILS.includes(user.email);

      if (!adminSnap.exists()) {
        if (isBootstrappedAdmin) {
          // Auto-register the bootstrapped admin
          await setDoc(adminRef, {
            email: user.email,
            created_at: new Date().toISOString()
          });
        } else {
          await auth.signOut();
          throw new Error('You are not authorized to access the admin dashboard.');
        }
      }

      toast.success('Welcome back!');
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-wedding-gold/10 rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 text-wedding-gold fill-wedding-gold/20" />
          </div>
        </div>
        
        <h1 className="text-3xl font-serif mb-2">Admin Access</h1>
        <p className="text-wedding-gold font-ballet text-xl mb-10">
          Israel & Deborah Wedding
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 px-6 rounded-full transition-all shadow-sm group"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-wedding-gold" />
          ) : (
            <>
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span>Sign in with Google</span>
            </>
          )}
        </button>
        
        <div className="mt-12 text-[10px] text-slate-400 font-sans tracking-[0.2em] uppercase">
          Authorized Admin Personnel Only
        </div>
      </motion.div>
    </div>
  );
}
