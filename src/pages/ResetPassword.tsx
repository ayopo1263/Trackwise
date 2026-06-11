import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      // Clear current session to force user to log in again with new password
      await supabase.auth.signOut();
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update your password. Please verify your recovery link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="reset-password-page" className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-100 py-12 px-4">
      {/* High-Impact Dynamic Animated Mesh Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-50">
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
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-300"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Set New Password</h1>
          <p className="text-slate-700 font-medium mt-2">Enter your new secure password below to regain full access.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-6 bg-green-50 border-2 border-green-200 text-green-800 text-sm font-bold rounded-xl space-y-3 text-center animate-fade-in">
            <CheckCircle2 size={36} className="text-green-600 mx-auto" />
            <p className="text-base font-black">Password Updated successfully!</p>
            <p className="text-slate-600 font-medium font-sans text-xs">Redirecting you to the Login screen. Please sign in with your new password...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-10 pr-10"
                  placeholder="At least 6 characters"
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="w-full pl-10 pr-10"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer uppercase tracking-wider test-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Save New Password'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
