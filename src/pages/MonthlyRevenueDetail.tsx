import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sale } from '../types';
import { 
  ArrowLeft, 
  TrendingUp, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Coins
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface MonthGroup {
  monthKey: string; // "YYYY-MM"
  totalAmount: number;
  salesCount: number;
  dailyBreakdown: Record<string, { total: number; qtyCount: number }>;
}

export default function MonthlyRevenueDetail() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSales() {
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSales(data || []);
      } catch (err) {
        console.error('Error fetching sales for monthly breakdown:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSales();
  }, []);

  // Group sales by month and calculate daily aggregates inside each month
  const monthlyGroupsMap: Record<string, MonthGroup> = {};

  sales.forEach((s) => {
    const fullDate = s.created_at.split('T')[0]; // "YYYY-MM-DD"
    const monthKey = fullDate.substring(0, 7); // "YYYY-MM"

    if (!monthlyGroupsMap[monthKey]) {
      monthlyGroupsMap[monthKey] = {
        monthKey,
        totalAmount: 0,
        salesCount: 0,
        dailyBreakdown: {},
      };
    }

    const monthGroup = monthlyGroupsMap[monthKey];
    monthGroup.totalAmount += s.total_price;
    monthGroup.salesCount += s.quantity;

    if (!monthGroup.dailyBreakdown[fullDate]) {
      monthGroup.dailyBreakdown[fullDate] = { total: 0, qtyCount: 0 };
    }
    monthGroup.dailyBreakdown[fullDate].total += s.total_price;
    monthGroup.dailyBreakdown[fullDate].qtyCount += s.quantity;
  });

  const monthlyGroups = Object.values(monthlyGroupsMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  // Compute aggregate indicators
  const totalMonths = monthlyGroups.length;
  const overallRevenue = sales.reduce((sum, s) => sum + s.total_price, 0);
  const monthlyAverage = totalMonths > 0 ? overallRevenue / totalMonths : 0;
  const peakMonth = monthlyGroups.reduce((max, curr) => curr.totalAmount > (max?.totalAmount || 0) ? curr : max, null as MonthGroup | null);

  const getMonthLabel = (key: string) => {
    try {
      // Parse YYYY-MM
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return format(date, 'MMMM yyyy');
    } catch {
      return key;
    }
  };

  // Filter groups based on search term (e.g. "June", "2026")
  const filteredGroups = monthlyGroups.filter((group) => {
    const label = getMonthLabel(group.monthKey).toLowerCase();
    const query = searchTerm.toLowerCase();
    return label.includes(query) || group.monthKey.includes(query);
  });

  const toggleExpand = (monthKey: string) => {
    setExpandedMonth(expandedMonth === monthKey ? null : monthKey);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-1.5 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Revenue Diagnostics / Monthly Log
        </span>
      </div>

      {/* Main Banner Header */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden font-sans">
        <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
          <Calendar size={160} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 bg-purple-500 text-slate-150 text-[10px] uppercase font-black tracking-wider rounded-full border border-purple-400">
            Monthly Overview
          </span>
          <h1 className="text-2xl md:text-3xl font-black mt-3 tracking-tight">Monthly Revenue Performance</h1>
          <p className="text-slate-300 font-medium text-xs md:text-sm mt-2 leading-relaxed">
            Consolidated overview broken down calendar month-by-month, detailing seasonal trajectories, aggregated transactions, and daily summaries for financial planning.
          </p>
        </div>
      </div>

      {/* Metrics breakdown row */}
      <div className="grid sm:grid-cols-3 gap-4 font-sans">
        <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Gross Net Earnings</span>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            ₦{overallRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">Across {totalMonths} active financial months</span>
        </div>

        <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Monthly running Average</span>
          <div className="text-xl font-extrabold text-slate-900 font-mono text-purple-600">
            ₦{monthlyAverage.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">Weighted average collection per active month</span>
        </div>

        <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Peak Sales Month</span>
          {peakMonth ? (
            <>
              <div className="text-xl font-extrabold text-slate-900 font-mono text-emerald-600">
                ₦{peakMonth.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 font-bold block mt-1">
                Achieved in {getMonthLabel(peakMonth.monthKey)}
              </span>
            </>
          ) : (
            <div className="text-sm font-bold text-slate-400">No Sales Record</div>
          )}
        </div>
      </div>

      {/* Search Filter Input */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm font-sans">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-450" size={17} />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-250 bg-slate-50 text-xs font-semibold rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-slate-950 text-slate-950 placeholder-slate-400"
            placeholder="Search monthly records (e.g. June, May, 2026-05)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List / Table of grouped months */}
      <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm font-sans">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-semibold text-xs flex justify-center items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
            Loading monthly balance sheets...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-black text-xs">
            No monthly results match your filtering attributes.
          </div>
        ) : (
          <div className="divide-y divide-slate-150">
            {filteredGroups.map((group) => {
              const isExpanded = expandedMonth === group.monthKey;
              const titleLabel = getMonthLabel(group.monthKey);

              // Daily items inside this month in sorted order (newest first)
              const sortedDays = Object.keys(group.dailyBreakdown).sort((a, b) => b.localeCompare(a));

              return (
                <div key={group.monthKey} className="transition-colors hover:bg-slate-50/50">
                  {/* Row Header */}
                  <div 
                    onClick={() => toggleExpand(group.monthKey)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 border rounded-lg text-slate-700 mt-0.5">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-950 text-sm">{titleLabel}</h4>
                        <span className="text-[10px] text-slate-500 font-mono font-bold">
                          Month Index: {group.monthKey} • {sortedDays.length} selling days
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] text-slate-400 block font-black uppercase tracking-widest leading-none mb-0.5">Gross Revenue</span>
                        <span className="text-md font-black text-slate-950 font-mono text-purple-750">
                          ₦{group.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden xs:block">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider leading-none mb-0.5">Total Quantity</span>
                          <span className="text-xs font-bold text-slate-600 font-sans">
                            {group.salesCount} units
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable itemized daily breakdown list */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 border-t border-slate-150 px-4 py-4 space-y-3">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 select-none">
                        Day-by-Day Aggregates in {titleLabel}
                      </div>
                      
                      <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl">
                        <table className="w-full text-left text-xs font-sans">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider select-none">
                              <th className="p-3">Trading Date</th>
                              <th className="p-3 text-center">Sales Volume</th>
                              <th className="p-3 text-right">Aggregate Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                            {sortedDays.map((day) => {
                              const dayStats = group.dailyBreakdown[day];
                              const dayLabel = format(parseISO(day), 'eeee, MMMM d, yyyy');
                              
                              return (
                                <tr key={day} className="hover:bg-slate-50/70">
                                  <td className="p-3">
                                    <div className="font-extrabold text-slate-950">{dayLabel}</div>
                                    <div className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">Date Key: {day}</div>
                                  </td>
                                  <td className="p-3 text-center font-mono text-slate-700">
                                    {dayStats.qtyCount} units
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-950">
                                    ₦{dayStats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
