import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Sale } from '../types';
import { Loader2, RefreshCw, BarChart2, TrendingUp, Sparkles } from 'lucide-react';

export default function BestSellers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error('Error loading best seller metrics:', err);
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
      console.error('Silent sync failed in BestSellers:', err);
    }
  };

  // Auto-sync every 8 seconds and on window focus
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

  // Compute Best Selling Products (Top 10 display)
  const bestSellingProducts = useMemo(() => {
    if (sales.length === 0) return [];
    
    const countMap: Record<string, { totalSold: number; totalRevenue: number; name: string }> = {};
    
    // Seed with existing product catalog names
    products.forEach(p => {
      countMap[p.id] = { totalSold: 0, totalRevenue: 0, name: p.name };
    });

    sales.forEach(sale => {
      const target = countMap[sale.product_id];
      if (target) {
        target.totalSold += sale.quantity;
        target.totalRevenue += sale.total_price;
      } else {
        countMap[sale.product_id] = {
          totalSold: sale.quantity,
          totalRevenue: sale.total_price,
          name: sale.product_name || `Product ID: ${sale.product_id.substring(0, 5)}`
        };
      }
    });

    return Object.values(countMap)
      .filter(item => item.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10);
  }, [products, sales]);

  const maxSoldVolume = bestSellingProducts.length > 0 ? bestSellingProducts[0].totalSold : 1;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tight flex items-center gap-3">
            <Sparkles className="text-amber-500 animate-pulse" size={30} />
            Best Selling Commodities
          </h1>
          <p className="text-slate-700 font-bold mt-1 text-sm">
            Live velocity rankings of top physical sales items in your inventory catalog.
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
            <p className="text-xs font-bold text-slate-700">Analyzing demand logs...</p>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md">
            <div>
              <h2 className="text-lg font-black text-slate-950 flex items-center gap-2 mb-1">
                <BarChart2 className="text-slate-800" size={18} />
                Live Commodity Rankings
              </h2>
              <p className="text-slate-600 text-xs font-bold mb-6">
                Active list of your top 10 best-performing items ranked by raw volume sold, synced live.
              </p>

              {bestSellingProducts.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-bold text-slate-500">No sales transactions logged to generate best-sellers analytics yet.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {bestSellingProducts.map((p, index) => {
                    const fillPercent = maxSoldVolume > 0 ? (p.totalSold / maxSoldVolume) * 100 : 0;
                    return (
                      <div key={p.name} className="space-y-1">
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-slate-900 flex items-center gap-2">
                            <span className="inline-grid h-6 w-6 rounded bg-slate-150 text-slate-755 font-black place-items-center text-xs">
                              {index + 1}
                            </span>
                            {p.name}
                          </span>
                          <span className="text-slate-750 font-mono text-sm">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-900 mr-2 font-black">
                              {p.totalSold} sold
                            </span>
                            <span className="text-slate-900 font-extrabold">₦{p.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </span>
                        </div>
                        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                          <div 
                            className="h-full bg-slate-850 rounded-full transition-all duration-500"
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {bestSellingProducts.length > 0 && (
              <div className="mt-8 pt-4 border-t border-slate-200 bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 items-start text-xs text-amber-955 font-bold leading-normal">
                <TrendingUp className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="uppercase text-[9px] block text-amber-800 tracking-wider font-extrabold mb-1">MVP Catalog Insight</span>
                  <p className="text-slate-800">
                    Your highest performing inventory commodity is <strong className="text-slate-950 underline">"{bestSellingProducts[0].name}"</strong> with a total volume of {bestSellingProducts[0].totalSold} individual sales, driving <strong className="text-slate-950">₦{bestSellingProducts[0].totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> in premium revenue.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
