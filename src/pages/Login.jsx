import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { logAction } from '../lib/logger';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-redirect if already logged in
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
      await logAction('LOGIN', 'Auth', `User logged in: ${email}`);
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">

      {/* --- FLUID ANIMATION STYLES --- */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(150px, -100px) scale(1.4); } /* Moved further, grew larger */
          66% { transform: translate(-100px, 80px) scale(0.8); } /* Moved opposite, shrank */
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob infinite; /* Duration is set inline for variety */
        }
      `}</style>

      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">

        {/* Blob 1: Purple - Fast & Wide */}
        <div
            className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300/40 rounded-full blur-xl opacity-70 animate-blob"
            style={{ animationDuration: '8s' }}
        ></div>

        {/* Blob 2: Indigo - Slower Delay */}
        <div
            className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-300/40 rounded-full blur-xl opacity-70 animate-blob"
            style={{ animationDuration: '10s', animationDelay: '3s' }}
        ></div>

        {/* Blob 3: Blue - Very Slow & Subtle */}
        <div
            className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-blue-300/40 rounded-full blur-xl opacity-70 animate-blob"
            style={{ animationDuration: '15s', animationDelay: '4s' }}
        ></div>
        {/* Blob 4: Blue - Very Slow & Subtle */}
        <div
            className="absolute bottom-[-10%] right-[10%] w-69 h-69 bg-sky-400 rounded-full blur-[80px] opacity-70 animate-blob"
            style={{ animationDuration: '18s', animationDelay: '4s' }}
        ></div>

      </div>

      {/* Main Card */}
      <div className="w-full max-w-md relative z-10 p-6">
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl overflow-hidden">

            {/* Header Section */}
            <div className="p-8 pb-0 text-center">
                <img
                    src="/logo.svg"
                    alt="Company Logo"
                    className="h-16 mx-auto mb-6 object-contain"
                />

                <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                <p className="text-slate-500 text-sm">Enter your credentials to access the admin portal.</p>
            </div>

            {/* Form Section */}
            <div className="p-8 pt-6">
                <form onSubmit={handleLogin} className="space-y-5">

                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
                             <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="name@company.com"
                                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 sm:text-sm text-slate-900"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 sm:text-sm text-slate-900"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        ) : (
                            <>
                                Sign In <ArrowRight className="ml-2 h-4 w-4 opacity-70" />
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">
                    Secure Admin Panel • &copy; {new Date().getFullYear()}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}