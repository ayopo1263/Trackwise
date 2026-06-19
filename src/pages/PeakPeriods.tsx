import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Sale } from '../types';
import { Loader2, RefreshCw, Clock, Calendar, AlertCircle } from 'lucide-react';

export default function PeakPeriods() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Error loading sales logs for peak period calculations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataSilent = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        setSales(data || []);
      }
    } catch (err) {
      console.error('Silent sync failed in PeakPeriods:', err);
    }
  };

  // Auto-sync every 8 seconds and on window/tab focus
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

  // Compute Peak Periods Intelligence (Hour slots + Day of week)
  const peakPeriodsData = useMemo(() => {
    if (sales.length === 0) return null;

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayRevenue = Array(7).fill(0).map((_, i) => ({ day: daysOfWeek[i], revenue: 0, transactions: 0 }));
    
    const timeSlots = [
      { slot: 'Morning (6am - 12pm)', revenue: 0, count: 0 },
      { slot: 'Afternoon (12pm - 5pm)', revenue: 0, count: 0 },
      { slot: 'Evening (5pm - 10pm)', revenue: 0, count: 0 },
      { slot: 'Night (10pm - 6am)', revenue: 0, count: 0 }
    ];

    sales.forEach(sale => {
      const date = new Date(sale.created_at);
      
      // weekday
      const dayIdx = date.getDay();
      weekdayRevenue[dayIdx].revenue += sale.total_price;
      weekdayRevenue[dayIdx].transactions += 1;

      // hour slot
      const hour = date.getHours();
      if (hour >= 6 && hour < 12) {
        timeSlots[0].revenue += sale.total_price;
        timeSlots[0].count += 1;
      } else if (hour >= 12 && hour < 17) {
        timeSlots[1].revenue += sale.total_price;
        timeSlots[1].count += 1;
      } else if (hour >= 17 && hour < 22) {
        timeSlots[2].revenue += sale.total_price;
        timeSlots[2].count += 1;
      } else {
        timeSlots[3].revenue += sale.total_price;
        timeSlots[3].count += 1;
      }
    });

    const busiestDay = [...weekdayRevenue].sort((a, b) => b.revenue - a.revenue)[0];
    const busiestTimeSlot = [...timeSlots].sort((a, b) => b.revenue - a.revenue)[0];

    return {
      weekdayRevenue,
      timeSlots,
      busiestDay,
      busiestTimeSlot
    };
  }, [sales]);

  const maxDayRevenue = peakPeriodsData ? Math.max(...peakPeriodsData.weekdayRevenue.map(d => d.revenue)) : 1;
  const maxDayTransactions = peakPeriodsData ? Math.max(...peakPeriodsData.weekdayRevenue.map(d => d.transactions)) : 1;
  const maxSlotRevenue = peakPeriodsData ? Math.max(...peakPeriodsData.timeSlots.map(t => t.revenue)) : 1;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tight flex items-center gap-3">
            <Clock className="text-slate-900 animate-pulse" size={30} />
            Peak Operational Periods
          </h1>
          <p className="text-slate-700 font-bold mt-1 text-sm">
            Interactive heatmaps and metrics outlining peak sale transactions across hourly and weekly distribution cycles.
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
            <p className="text-xs font-bold text-slate-700">Synthesizing temporal transaction logs...</p>
          </div>
        </div>
      ) : !peakPeriodsData ? (
        <div className="bg-white border-2 border-slate-300 rounded-xl p-8 shadow-sm text-center">
          <p className="text-sm font-bold text-slate-500">Record sales transactions to analyze peak periods of operation.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
          {/* Card 1: Busiest Weekdays */}
          <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950 flex items-center gap-2 mb-1">
                <Calendar size={18} className="text-indigo-600" />
                Weekly Revenue Frequency
              </h2>
              <p className="text-slate-600 text-xs font-bold mb-8">
                Daily aggregates showing total income grouped by weekday. Use to optimize personnel schedules.
              </p>

              {/* Bar Graph */}
              <div className="space-y-6">
                {peakPeriodsData.weekdayRevenue.map((d) => {
                  const percent = maxDayRevenue > 0 ? (d.revenue / maxDayRevenue) * 100 : 0;
                  return (
                    <div key={d.day} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-900 font-black">{d.day}</span>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="font-bold text-indigo-950 bg-indigo-100 px-2.5 py-0.5 rounded border border-indigo-200">
                            ₦{d.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold border border-slate-200">
                            {d.transactions} txn{d.transactions !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="h-4 w-full bg-slate-100 border border-slate-250 rounded-lg overflow-hidden relative">
                        <div 
                          className="h-full bg-indigo-400 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex gap-3 items-start text-xs text-indigo-950 font-bold">
              <Calendar className="text-indigo-600 shrink-0 mt-0.5" size={18} />
              <div>
                <span className="uppercase text-[9px] block text-indigo-800 tracking-wider font-extrabold mb-1">Weekly Focus Recommendation</span>
                <p className="text-slate-800">
                  Your peak transaction volume happens on <strong className="text-slate-950 underline">{peakPeriodsData.busiestDay.day}</strong>, bringing in flat revenues of <strong className="text-slate-950">₦{peakPeriodsData.busiestDay.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>. Keep your storefront well stocked on this specific weekday.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Daytime Frequency Heatmap */}
          <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950 flex items-center gap-2 mb-1">
                <Clock size={18} className="text-violet-600 animate-pulse" />
                Daytime Cycle Distribution
              </h2>
              <p className="text-slate-600 text-xs font-bold mb-8">
                Detailed assessment indicating critical peak operational transaction hours.
              </p>

              {/* Heatmap Grid Bars */}
              <div className="space-y-5">
                {peakPeriodsData.timeSlots.map((ts) => {
                  const percent = maxSlotRevenue > 0 ? (ts.revenue / maxSlotRevenue) * 100 : 0;
                  return (
                    <div key={ts.slot} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-900 font-black">{ts.slot}</span>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="font-bold text-violet-950 bg-violet-100 px-2.5 py-0.5 rounded border border-violet-200">
                            ₦{ts.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold border border-slate-200">
                            {ts.count} transactions
                          </span>
                        </div>
                      </div>
                      <div className="h-4 w-full bg-slate-100 border border-slate-250 rounded-lg overflow-hidden relative">
                        <div 
                          className="h-full bg-violet-400 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 bg-violet-50 border border-violet-200 p-4 rounded-xl flex gap-3 items-start text-xs text-violet-955 font-bold">
              <Clock className="text-violet-600 shrink-0 mt-0.5" size={18} />
              <div>
                <span className="uppercase text-[9px] block text-violet-850 tracking-wider font-extrabold mb-1">Hourly Pattern Recommendation</span>
                <p className="text-slate-800">
                  Highest volume hourly interval tracks to <strong className="text-slate-950 underline">{peakPeriodsData.busiestTimeSlot.slot}</strong>, providing a total of <strong className="text-slate-950">₦{peakPeriodsData.busiestTimeSlot.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> stream flow. Align key promotional/restocking efforts here.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
