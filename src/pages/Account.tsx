import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import SignOutConfirmationModal from '../components/SignOutConfirmationModal';
import { 
  User, 
  Settings, 
  Lock, 
  Building, 
  Mail, 
  Calendar, 
  LogOut, 
  Check, 
  Loader2, 
  AlertCircle, 
  Target, 
  Eye, 
  EyeOff, 
  KeyRound,
  Sparkles
} from 'lucide-react';

export default function Account() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('tab') as 'profile' | 'settings') || 'profile';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'settings' || tab === 'profile') {
      setActiveTab(tab);
    }
  }, [location.search]);
  
  // User profile loaded states
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  // Settings inputs
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [targetInput, setTargetInput] = useState('500000');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Passwords show/hide
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Safety stock thresholds state defaults
  const [lowLimitInput, setLowLimitInput] = useState('10');
  const [criticalLimitInput, setCriticalLimitInput] = useState('0');

  // Feedback states
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Load user details
  useEffect(() => {
    async function loadUser() {
      try {
        setLoadingUser(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || '');
          const bName = user.user_metadata?.business_name || '';
          setBusinessName(bName);
          setBusinessNameInput(bName);
          
          if (user.created_at) {
            const dateStr = new Date(user.created_at).toLocaleDateString(undefined, { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            setCreatedAt(dateStr);
          }

          if (user.user_metadata?.low_stock_limit !== undefined) {
            setLowLimitInput(user.user_metadata.low_stock_limit.toString());
          } else {
            const savedLow = localStorage.getItem('trackwise_low_stock_limit');
            if (savedLow) setLowLimitInput(savedLow);
          }

          if (user.user_metadata?.critical_stock_limit !== undefined) {
            setCriticalLimitInput(user.user_metadata.critical_stock_limit.toString());
          } else {
            const savedCrit = localStorage.getItem('trackwise_critical_stock_limit');
            if (savedCrit) setCriticalLimitInput(savedCrit);
          }
        }

        // Load monthly goal target too
        const savedGoal = localStorage.getItem('trackwise_monthly_goal');
        if (savedGoal) {
          setTargetInput(savedGoal);
        }
      } catch (err) {
        console.error('Error loading account metadata:', err);
      } finally {
        setLoadingUser(false);
      }
    }
    loadUser();
  }, []);

  const handleSignOutConfirmed = async () => {
    setShowSignOutConfirm(false);
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleUpdateProfileAndTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const parsedLow = parseInt(lowLimitInput, 10);
      const parsedCritical = parseInt(criticalLimitInput, 10);
      if (isNaN(parsedLow) || parsedLow < 0 || isNaN(parsedCritical) || parsedCritical < 0) {
        throw new Error('Safety stock limits must be non-negative integers.');
      }

      // 1. Update Supabase business name and stock limits metadata
      const { error: userError } = await supabase.auth.updateUser({
        data: { 
          business_name: businessNameInput.trim() || null,
          low_stock_limit: parsedLow,
          critical_stock_limit: parsedCritical
        }
      });
      if (userError) throw userError;

      // 2. Update local storage target goal & safety stock limits
      const parsedTarget = parseFloat(targetInput);
      if (isNaN(parsedTarget) || parsedTarget <= 0) {
        throw new Error('Please enter a valid positive target goal (₦).');
      }
      localStorage.setItem('trackwise_monthly_goal', parsedTarget.toString());
      localStorage.setItem('trackwise_low_stock_limit', parsedLow.toString());
      localStorage.setItem('trackwise_critical_stock_limit', parsedCritical.toString());
      localStorage.setItem('trackwise_limits_customized', 'true');

      setBusinessName(businessNameInput.trim());
      setProfileSuccess('Account credentials, goals, & stock limits updated successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Error updating metadata.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
       setPasswordError('Password must be at least 8 characters.');
       return;
     }

    setSavingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess('Password was changed successfully! Please log in again.');
      setNewPassword('');
      setConfirmPassword('');
      
      // Delay signout to let them read success message
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Error updating password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in" id="account-settings-container">
      <div>
        <h1 className="text-3xl font-black text-slate-950 tracking-tight">My Account</h1>
        <p className="text-slate-700 text-sm font-bold mt-1">
          Review business credentials, manage sales targets, or update login passwords.
        </p>
      </div>

      {loadingUser ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white card border-2 border-slate-300">
          <Loader2 className="animate-spin text-slate-900 mb-2" size={32} />
          <p className="text-sm font-bold text-slate-800">Retrieving secure user details...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-8 items-start">
          {/* Navigation Sidebar */}
          <div className="md:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-black transition-all border cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                  : 'bg-white text-slate-700 border-slate-300 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <User size={18} />
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-black transition-all border cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                  : 'bg-white text-slate-700 border-slate-300 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Settings size={18} />
              Account Settings
            </button>

            <div className="pt-4 border-t border-slate-200 mt-4">
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold text-red-700 hover:text-red-950 hover:bg-red-50 border border-transparent transition-all cursor-pointer"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>

          {/* Configuration Area */}
          <div className="md:col-span-3">
            {activeTab === 'profile' ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-slate-300 rounded-2xl shadow-md p-6 space-y-6"
              >
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
                    <User className="text-slate-900" size={20} />
                    Profile Information
                  </h2>
                  <p className="text-slate-700 text-xs font-bold mt-1">
                    Your authenticated business profile credentials loaded securely.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border-2 border-slate-200">
                    <div className="p-2.5 bg-slate-200 rounded-lg text-slate-700">
                      <Building size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-600 uppercase font-extrabold tracking-wider block">Registered Business</span>
                      <span className="text-base font-black text-slate-950">{businessName || 'TrackWise Retail Merchant'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border-2 border-slate-200">
                    <div className="p-2.5 bg-slate-200 rounded-lg text-slate-700">
                      <Mail size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-600 uppercase font-extrabold tracking-wider block">Login Email Address</span>
                      <span className="text-base font-black text-slate-950">{email}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border-2 border-slate-200">
                    <div className="p-2.5 bg-slate-200 rounded-lg text-slate-700">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-600 uppercase font-extrabold tracking-wider block">Account Provisioned</span>
                      <span className="text-base font-black text-slate-950">{createdAt || 'Not Available'}</span>
                    </div>
                  </div>
                </div>


              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Profile & Revenue Settings Card */}
                <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-md p-6 space-y-6">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
                      <Building className="text-slate-900" size={20} />
                      Business & Target Settings
                    </h2>
                    <p className="text-slate-700 text-xs font-bold mt-1">
                      Update your ledger branding and configure the monthly sales goal metrics.
                    </p>
                  </div>

                  {profileSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-lg flex items-center gap-2">
                      <Check size={16} className="text-emerald-600 stroke-[3]" />
                      {profileSuccess}
                    </div>
                  )}

                  {profileError && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2">
                      <AlertCircle size={16} />
                      {profileError}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfileAndTarget} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">Business / Outlet Name</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          required
                          className="w-full pl-10"
                          value={businessNameInput}
                          onChange={(e) => setBusinessNameInput(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">Monthly Revenue Target (₦)</label>
                      <div className="relative">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="number"
                          required
                          className="w-full pl-10"
                          value={targetInput}
                          onChange={(e) => setTargetInput(e.target.value)}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold italic mt-1 pl-1">
                        Controls the progress thresholds and forecasting multipliers shown on your dashboard.
                      </p>
                    </div>

                    {/* Stock Limit Thresholds Section */}
                    <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200 mt-2 space-y-4">
                      <span className="block text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-1.5 border-slate-200">
                        Safety Stock Limits Settings
                      </span>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-1">
                            Low Stock Alert (Units)
                          </label>
                          <input
                            type="number"
                            className="w-full text-xs font-bold py-2 px-3 bg-white"
                            min="1"
                            required
                            value={lowLimitInput}
                            onChange={(e) => setLowLimitInput(Math.max(1, parseInt(e.target.value) || 1).toString())}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-1">
                            Critical alert (Units)
                          </label>
                          <input
                            type="number"
                            className="w-full text-xs font-bold py-2 px-3 bg-white"
                            min="0"
                            required
                            value={criticalLimitInput}
                            onChange={(e) => setCriticalLimitInput(Math.max(0, parseInt(e.target.value) || 0).toString())}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 font-bold leading-normal">
                        Products with stock levels at or below these quantities will display a yellow label (low stock) or a red label (critical stock alert) on products list and dashboards.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="w-full bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Saving Credentials...
                        </>
                      ) : 'Save General Settings'}
                    </button>
                  </form>
                </div>

                {/* Password Change Card */}
                <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-md p-6 space-y-6">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
                      <KeyRound className="text-slate-900" size={20} />
                      Set New Password
                    </h2>
                    <p className="text-slate-700 text-xs font-bold mt-1">
                      Update your account password. You will be signed out upon successful change.
                    </p>
                  </div>

                  {passwordSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-emerald-600 stroke-[3]" />
                        <span>{passwordSuccess}</span>
                      </div>
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2">
                      <AlertCircle size={16} />
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          minLength={8}
                          className="w-full pl-10 pr-10"
                          placeholder="At least 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="w-full bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Updating Password...
                        </>
                      ) : 'Save New Password'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
      <SignOutConfirmationModal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOutConfirmed}
      />
    </div>
  );
}
