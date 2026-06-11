import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Mail, Lock, Building, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          business_name: businessName.trim() || null,
        }
      },
    });

    if (error) {
      if (error.status === 401) {
        setError('Authentication configuration error: The API Key (Anon Key) provided appears to be invalid for this Supabase project.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      setLoading(false);
      setSuccess('Signup successful! Check your email for a confirmation link.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-100 py-12 px-4 shadow-none border-none">
      {/* High-Impact Dynamic Animated Mesh Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-50">
        {/* Crisp Tech Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #64748b 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Ambient Vibrant Mesh Orbs */}
        <motion.div
          animate={{
            x: [-60, 100, -60],
            y: [-30, 80, -30],
            scale: [1, 1.25, 0.9, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-10 -left-10 w-96 h-96 bg-gradient-to-tr from-cyan-400/40 to-blue-500/35 rounded-full blur-[60px]"
        />
        
        <motion.div
          animate={{
            x: [60, -80, 60],
            y: [40, -90, 40],
            scale: [1, 0.85, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-12 -right-12 w-[450px] h-[450px] bg-gradient-to-br from-fuchsia-400/40 to-indigo-500/35 rounded-full blur-[70px]"
        />

        <motion.div
          animate={{
            scale: [0.9, 1.15, 0.95, 0.9],
            x: [0, 40, -40, 0],
            y: [0, -30, 30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/3 left-1/4 w-80 h-80 bg-gradient-to-tr from-amber-300/30 to-rose-400/25 rounded-full blur-[55px]"
        />

        {/* Subtle Diagonal Scanlines for Tech Aesthetic */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.4)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0.4)_75%,transparent_75%,transparent)] bg-[size:12px_12px] opacity-20" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-300"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Create account</h1>
          <p className="text-slate-700 font-medium mt-2">Join SMEs growing with TrackWise insights</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg font-bold">
            {success}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Company / Business Name</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                required
                className="w-full pl-10"
                placeholder="e.g. Acme Retailers"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-10 pr-10"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-950 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 select-none"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm font-semibold text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-slate-950 font-extrabold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
