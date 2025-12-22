import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import this
import { supabase } from '../lib/supabase';
import { LogIn, Loader2, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // 2. Initialize the hook

  // 3. Optional: Auto-redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/');
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      // 4. THIS IS THE MISSING PIECE!
      // Redirect to dashboard immediately on success
      navigate('/');
    }

    setLoading(false);
  };

  return (
    // ... keep your existing JSX exactly the same ...
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
       {/* ... rest of your form code ... */}
       <div className="w-full max-w-sm bg-white p-8 border border-slate-200 rounded-2xl shadow-sm">
        {/* Make sure the form calls handleLogin */}
        <form onSubmit={handleLogin} className="space-y-4">
             {/* ... inputs ... */}
             <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input name="email" type="email" placeholder="Email" required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input name="password" type="password" placeholder="Password" required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none" />
              </div>
             <button disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-black transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
             </button>
        </form>
       </div>
    </div>
  );
}