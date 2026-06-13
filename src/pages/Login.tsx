import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password flow states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.status === 401) {
        setError('Authentication configuration error: The API Key (Anon Key) or Project URL appears to be invalid.');
      } else if (error.status === 400) {
        setError('Invalid login credentials. Please check your email and password.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      const emailKey = email ? `trackwise_just_registered_${email.toLowerCase().trim()}` : '';
      if (emailKey) {
        localStorage.removeItem(emailKey);
      }
      navigate('/');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      setResetSuccess('Recovery link sent successfully! Please check your email inbox.');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send recovery email. Please try again.');
    } finally {
      setResetLoading(false);
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
        {isForgotPassword ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Reset Password</h1>
              <p className="text-slate-700 font-medium mt-2">Enter your email and we'll send you a link to reset your password and re-authenticate.</p>
            </div>

            {resetError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg font-bold">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-250 text-green-800 text-sm rounded-lg font-bold">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full pl-10"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {resetLoading ? <Loader2 className="animate-spin" size={20} /> : 'Send Recovery Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetError(null);
                  setResetSuccess(null);
                }}
                className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-950 mt-4 transition-colors cursor-pointer block hover:underline"
              >
                Return to Sign In
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
              <p className="text-slate-700 font-medium mt-2">Manage your inventory smarter with TrackWise</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                      setResetError(null);
                      setResetSuccess(null);
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-950 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-slate-900 font-semibold hover:underline">
                Sign up for free
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
