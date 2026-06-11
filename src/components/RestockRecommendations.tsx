import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Sale } from '../types';
import { differenceInDays, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle2, TrendingUp, Sparkles, RefreshCw, ArrowUpRight } from 'lucide-react';

interface RestockRecommendationsProps {
  products: Product[];
  sales: Sale[];
  isDashboard?: boolean;
}

export default function RestockRecommendations({ products, sales, isDashboard = false }: RestockRecommendationsProps) {
  const navigate = useNavigate();

  // Target replenishment days state (persisted in localStorage, defaults to 30)
  const [coverDays, setCoverDays] = React.useState<number>(() => {
    const saved = localStorage.getItem('supply_cover_days');
    return saved ? parseInt(saved, 10) : 30;
  });

  // Keep state in sync with localStorage updates when active
  React.useEffect(() => {
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

  const handleCoverDaysChange = (days: number) => {
    const cleanDays = Math.max(1, Math.min(365, days));
    setCoverDays(cleanDays);
    localStorage.setItem('supply_cover_days', cleanDays.toString());
  };

  // Calculate sales velocity for each product
  // Formula: Units sold / Days since first recorded sale of this product to today (min 7 days to smooth sample size)
  const getInventoryHealth = () => {
    const today = new Date();
    
    return products.map(product => {
      const productSales = sales.filter(s => s.product_id === product.id);
      const totalUnitsSold = productSales.reduce((sum, s) => sum + s.quantity, 0);

      let daysInterval = 14; // Default window size
      if (productSales.length > 0) {
        // Find earliest and latest sale
        const saleDates = productSales.map(s => new Date(s.created_at).getTime());
        const earliestSale = new Date(Math.min(...saleDates));
        const diff = differenceInDays(today, earliestSale);
        daysInterval = Math.max(7, diff); // Ensure at least a 7-day period to prevent over-inflation
      }

      const dailyVelocity = totalUnitsSold / daysInterval;
      
      // Calculate Days of Cover (how fast we will run out)
      let daysOfCover = Infinity;
      if (dailyVelocity > 0) {
        daysOfCover = product.stock_quantity / dailyVelocity;
      }

      // Recommend stock to cover custom-day forecast targets
      const idealCoverStock = dailyVelocity * coverDays;
      const recommendQuantity = Math.max(0, Math.ceil(idealCoverStock - product.stock_quantity));

      return {
        ...product,
        totalUnitsSold,
        dailyVelocity,
        daysOfCover,
        recommendQuantity,
        ideal30DayStock: idealCoverStock
      };
    }).sort((a, b) => {
      // Sort by critical stock cover first
      return a.daysOfCover - b.daysOfCover;
    });
  };

  const productHealths = getInventoryHealth();
  const criticalItems = productHealths.filter(p => p.daysOfCover <= 15 && p.recommendQuantity > 0);
  const healthyItems = productHealths.filter(p => !criticalItems.find(c => c.id === p.id));

  // If dashboard, slice results to prevent clutter
  const displayHealths = isDashboard ? productHealths.slice(0, 5) : productHealths;

  return (
    <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <RefreshCw className="text-slate-800 animate-spin-slow" size={22} style={{ animationDuration: '6s' }} />
            Supply Chain Intelligence
          </h2>
          <p className="text-slate-700 text-xs font-bold mt-0.5">
            Predictive stockout forecasts and smart restock requirements computed from live consumption trends.
          </p>
        </div>
        {/* Dynamic target cover selection */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 border-2 border-slate-200 p-2 rounded-xl text-xs w-full lg:w-auto">
          <span className="font-black text-slate-700 pl-1 uppercase tracking-wider text-[10px]">Target Coverage:</span>
          <select 
            value={coverDays} 
            onChange={(e) => handleCoverDaysChange(Math.max(1, parseInt(e.target.value) || 30))}
            className="bg-white border-2 border-slate-300 hover:border-slate-400 text-xs font-black rounded-lg px-2 py-1.5 focus:ring-slate-900 focus:border-slate-950 text-slate-950 cursor-pointer outline-none transition-all"
          >
            <option value={7}>7 Days (1 Week)</option>
            <option value={14}>14 Days (2 Weeks)</option>
            <option value={30}>30 Days (1 Month)</option>
            <option value={45}>45 Days (1.5 Months)</option>
            <option value={60}>60 Days (2 Months)</option>
            <option value={90}>90 Days (3 Months)</option>
          </select>
          <div className="flex items-center gap-1 bg-white border-2 border-slate-300 rounded-lg px-2 py-1">
            <input
              type="number"
              min="1"
              max="365"
              className="w-12 text-center bg-transparent border-none text-xs font-mono font-black text-slate-950 p-0 focus:ring-0 focus:outline-none"
              value={coverDays}
              title="Type custom cover days"
              onChange={(e) => handleCoverDaysChange(Math.max(1, parseInt(e.target.value) || 1))}
            />
            <span className="text-slate-500 font-extrabold text-[10px] uppercase">days</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Analytics Top overview banner */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3.5 items-start">
            <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-orange-950">Critical Attention</div>
              <div className="text-2xl font-black text-orange-900 mt-1">{criticalItems.length}</div>
              <div className="text-[10px] font-bold text-orange-850 mt-1 leading-normal">
                Products projected to deplete within the next 15 days based on customer velocity records.
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3.5 items-start">
            <CheckCircle2 className="text-slate-700 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-800">Supply Healthy</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{healthyItems.length}</div>
              <div className="text-[10px] font-bold text-slate-650 mt-1 leading-normal">
                Inventory buffer scales are adequate to support continuing baseline customer demand patterns.
              </div>
            </div>
          </div>
        </div>

        {/* Predictive list */}
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500" />
            Stock Depletion & Reordering Models
          </h3>

          {productHealths.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
              No product models built. Log a product catalog first.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2.5 text-[10px] font-black text-slate-800 uppercase tracking-wider">Product Name</th>
                      <th className="py-2.5 text-[10px] font-black text-slate-800 uppercase tracking-wider text-center">Velocity (un/day)</th>
                      <th className="py-2.5 text-[10px] font-black text-slate-800 uppercase tracking-wider text-center">Est. Days Left</th>
                      <th className="py-2.5 text-[10px] font-black text-slate-800 uppercase tracking-wider text-right">Replenish Recommend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {displayHealths.map(p => {
                      const daysText = p.daysOfCover === Infinity 
                        ? 'No sales yet' 
                        : p.daysOfCover === 0 
                          ? 'Out of Stock' 
                          : `${p.daysOfCover.toFixed(1)} days`;

                      const coverColor = p.daysOfCover <= 5 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : p.daysOfCover <= 15 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-green-50 text-green-700 border-green-200';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 text-slate-900 font-bold max-w-[140px] truncate">{p.name}</td>
                          <td className="py-3 text-center text-slate-700 font-mono font-medium">
                            {p.dailyVelocity === 0 ? '0.00' : p.dailyVelocity.toFixed(2)}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${coverColor}`}>
                              {daysText}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {p.recommendQuantity > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="text-indigo-700 font-extrabold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  +{p.recommendQuantity} units
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">For {coverDays}-day cover</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[10px] font-bold">Stock Adequate ✓</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isDashboard && productHealths.length > 5 && (
                <div className="pt-4 border-t border-slate-150 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/supply-chain')}
                    className="text-slate-950 hover:bg-slate-50 px-3.5 py-2 border-2 border-slate-300 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 transition-all select-none hover:border-slate-800"
                  >
                    See More Supply Intelligence
                    <ArrowUpRight size={14} className="text-slate-600 animate-pulse" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
