import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, LayoutDashboard, LogOut, RefreshCw, User, BrainCircuit, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import SignOutConfirmationModal from './SignOutConfirmationModal';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Auto-close menu when navigation occurs
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleSignOutConfirmed = async () => {
    setShowSignOutModal(false);
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Sales', path: '/sales', icon: ShoppingCart },
    { name: 'Supply Chain', path: '/supply-chain', icon: RefreshCw },
    // { name: 'Forecast Guide', path: '/forecast-guide', icon: BrainCircuit },
    { name: 'My Account', path: '/account', icon: User },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="bg-slate-950 text-white px-2 py-0.5 rounded font-black">T</span>
              TrackWise
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      isActive 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSignOutModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-wider text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-100 hover:border-red-600 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            {/* Mobile menu toggle button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer select-none"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav items menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-200 bg-white shadow-inner overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${
                      isActive 
                        ? 'bg-slate-100 text-slate-950 border border-slate-200' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-slate-950' : 'text-slate-500'} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SignOutConfirmationModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleSignOutConfirmed}
      />
    </nav>
  );
}
