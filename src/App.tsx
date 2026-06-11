import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { AlertCircle, ExternalLink } from 'lucide-react';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import SupplyChain from './pages/SupplyChain';
import Account from './pages/Account';
import ForecastGuide from './pages/ForecastGuide';
import DailyRevenueDetail from './pages/DailyRevenueDetail';
import MonthlyRevenueDetail from './pages/MonthlyRevenueDetail';
import Navbar from './components/Navbar';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, loading: true });

export const useAuth = () => useContext(AuthContext);

function AppRoutes() {
  const { session } = useAuth();
  const location = useLocation();

  // Determine if we are on login, signup, or reset password page
  const isAuthPage = ['/login', '/signup', '/reset-password'].includes(location.pathname);
  const showNavbar = session && !isAuthPage;

  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <main className={showNavbar ? "flex-grow container mx-auto px-4 py-8 max-w-7xl" : "flex-grow w-full flex flex-col"}>
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/" element={session ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/products" element={session ? <Products /> : <Navigate to="/login" />} />
          <Route path="/sales" element={session ? <Sales /> : <Navigate to="/login" />} />
          <Route path="/supply-chain" element={session ? <SupplyChain /> : <Navigate to="/login" />} />
          <Route path="/account" element={session ? <Account /> : <Navigate to="/login" />} />
          <Route path="/forecast-guide" element={session ? <ForecastGuide /> : <Navigate to="/login" />} />
          <Route path="/revenue/daily" element={session ? <DailyRevenueDetail /> : <Navigate to="/login" />} />
          <Route path="/revenue/monthly" element={session ? <MonthlyRevenueDetail /> : <Navigate to="/login" />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-300 p-8 text-center">
          <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-orange-600" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Supabase Setup Required</h1>
          <p className="text-slate-700 mb-8 font-medium">
            To start using the TrackWise Sales & Inventory System, please configure your Supabase credentials in the 
            <span className="font-semibold text-slate-900"> Secrets</span> panel.
          </p>
          
          <div className="space-y-4 text-left bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
            <h3 className="text-sm font-bold text-slate-900 mb-2">How to fix this:</h3>
            <ol className="text-sm text-slate-700 list-decimal list-inside space-y-2">
              <li>In Supabase, go to <b>Project Settings → API</b></li>
              <li>Copy the <b>Project URL</b> and add it to AI Studio Secrets as <code className="bg-slate-200 px-1 rounded font-semibold">VITE_SUPABASE_URL</code></li>
              <li>Copy the <b>anon / public</b> key and add it to AI Studio Secrets as <code className="bg-slate-200 px-1 rounded font-semibold">VITE_SUPABASE_ANON_KEY</code></li>
              <li className="pt-2 text-slate-900 font-bold">Crucial Step:</li>
              <li>Go to the <b>SQL Editor</b> in Supabase</li>
              <li>Create a new query and paste the code from <code className="bg-slate-200 px-1 rounded font-semibold">SUPABASE_SCHEMA.md</code> (found in this project)</li>
              <li>Click <b>Run</b> to create the necessary database tables</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              Open Supabase Dashboard
              <ExternalLink size={16} />
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="text-slate-500 text-sm hover:text-slate-900 font-medium"
            >
              I've updated my secrets, reload app
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, loading }}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
