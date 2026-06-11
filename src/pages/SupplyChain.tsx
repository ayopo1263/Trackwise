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

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tight flex items-center gap-3">
            <RefreshCw className="text-slate-800 animate-spin-slow" size={30} />
            Supply Chain Intelligence
          </h1>
          <p className="text-slate-700 font-bold mt-1">
            Analyze velocity consumption rates, forecast stock depletion, and view automated reorder quantities.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 border-2 border-slate-300 hover:border-slate-800 text-slate-850 font-bold rounded-lg bg-white flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Sync Data
        </button>
      </div>

      {loading ? (
        <div className="h-64 grid place-items-center">
          <Loader2 className="animate-spin text-slate-400" size={36} />
        </div>
      ) : (
        <div className="space-y-6">
          <RestockRecommendations products={products} sales={sales} isDashboard={false} />
          
          <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Methodology and Formulas</h2>
            <div className="grid sm:grid-cols-3 gap-6 text-xs text-slate-700 font-semibold leading-relaxed mt-4">
              <div className="bg-white p-4 border border-slate-205 rounded-lg">
                <span className="font-extrabold text-slate-950 block mb-1">Consumption Velocity</span>
                Calculated as total units sold divided by interval days (minimum of 7 days buffer is enforced for accuracy). Formulates unit-consumption rate per single day.
              </div>
              <div className="bg-white p-4 border border-slate-205 rounded-lg">
                <span className="font-extrabold text-slate-950 block mb-1">Estimated Days Left (Cover)</span>
                Computed by dividing current stock by Consumption Velocity. Shows the predictive day count before completely depleting.
              </div>
              <div className="bg-white p-4 border border-slate-205 rounded-lg text-indigo-950 bg-indigo-50/50 border-indigo-200">
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
