import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Sale } from '../types';
import { Loader2, RefreshCw } from 'lucide-react';
import RestockRecommendations from '../components/RestockRecommendations';

export default function SupplyChain() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverDays, setCoverDays] = useState<number>(() => {
    const saved = localStorage.getItem('supply_cover_days');
    return saved ? parseInt(saved, 10) : 30;
  });

  // Keep state in sync with localStorage updates when active
  useEffect(() => {
    const syncCoverDays = () => {
      const saved = localStorage.getItem('supply_cover_days');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val > 0) {
          setCoverDays(val);
        }
      }
    };
    window.addEventListener('storage', syncCoverDays);
    window.addEventListener('focus', syncCoverDays);
    return () => {
      window.removeEventListener('storage', syncCoverDays);
      window.removeEventListener('focus', syncCoverDays);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, salesRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('sales').select('*').order('created_at', { ascending: false })
      ]);

      if (productsRes.error) throw productsRes.error;
      if (salesRes.error) throw salesRes.error;

      setProducts(productsRes.data || []);
      setSales(salesRes.data || []);
    } catch (err) {
      console.error('Error loading supply chain data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataSilent = async () => {
    try {
      const [productsRes, salesRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('sales').select('*').order('created_at', { ascending: false })
      ]);

      if (!productsRes.error && !salesRes.error) {
        setProducts(productsRes.data || []);
        setSales(salesRes.data || []);
      }
    } catch (err) {
      console.error('Silent sync failed:', err);
    }
  };

  // Sync automatically on page mount, periodically every 8s, and when window/tab is focused
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchDataSilent();
    }, 8000);

    window.addEventListener('focus', fetchDataSilent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchDataSilent);
    };
  }, []);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tight flex items-center gap-3">
            <RefreshCw className="text-slate-800 animate-spin-slow" size={30} style={{ animationDuration: '10s' }} />
            Supply Chain Intelligence
          </h1>
          <p className="text-slate-700 font-bold mt-1 text-sm">
            Analyze velocity consumption rates, forecast stock depletion, view reorder metrics with real-time automatic background syncing.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 border-2 border-slate-300 hover:border-slate-800 text-slate-850 font-bold rounded-lg bg-white flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Force Sync
        </button>
      </div>

      {loading ? (
        <div className="h-64 grid place-items-center bg-white border-2 border-slate-300 rounded-xl shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-slate-900" size={32} />
            <p className="text-xs font-bold text-slate-700">Synthesizing intelligence metrics...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Main Stock Restock Table */}
          <RestockRecommendations products={products} sales={sales} isDashboard={false} />

          {/* Methodology Info */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Methodology and Formulas</h2>
            <div className="grid sm:grid-cols-3 gap-6 text-xs text-slate-700 font-semibold leading-relaxed mt-4">
              <div className="bg-white p-4 border border-slate-200 rounded-lg">
                <span className="font-extrabold text-slate-950 block mb-1">Consumption Velocity</span>
                Calculated as total units sold divided by interval days (minimum of 7 days buffer is enforced for accuracy). Formulates unit-consumption rate per single day.
              </div>
              <div className="bg-white p-4 border border-slate-200 rounded-lg">
                <span className="font-extrabold text-slate-950 block mb-1">Estimated Days Left (Cover)</span>
                Computed by dividing current stock by Consumption Velocity. Shows the predictive day count before completely depleting.
              </div>
              <div className="bg-white p-4 border border-slate-200 rounded-lg text-indigo-950 bg-indigo-50/50 border-indigo-200">
                <span className="font-extrabold text-indigo-950 block mb-1">{coverDays}-Day Replenish Estimate</span>
                The automated quantity recommended of safety buffer target required to fulfill sales coverage uninterrupted for the next {coverDays} days.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
