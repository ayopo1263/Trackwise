import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sale } from '../types';
import { groupSalesByDate } from '../utils/math';
import { 
  ArrowLeft, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface DailyGroup {
  date: string;
  totalAmount: number;
  salesCount: number;
  items: Sale[];
}

export default function DailyRevenueDetail() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSales() {
      try {
        const [salesRes, productsRes] = await Promise.all([
          supabase
            .from('sales')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('products')
            .select('*')
        ]);

        if (salesRes.error) throw salesRes.error;

        const prodMap: Record<string, string> = {};
        if (productsRes.data) {
          productsRes.data.forEach((p: any) => {
            prodMap[p.id] = p.name;
          });
        }

        const mappedData = (salesRes.data || []).map((s: any) => {
          const pName = prodMap[s.product_id] || s.product_name;

          return {
            ...s,
            product_name: pName || undefined,
            customer_name: s.customer_name || localStorage.getItem(`trackwise_customer_name_${s.id}`) || undefined
          };
        });

        setSales(mappedData);
      } catch (err) {
        console.error('Error fetching sales for daily breakdown:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSales();
  }, []);

  // Group sales by day
  const dailyGroupsMap: Record<string, DailyGroup> = {};
  sales.forEach((s) => {
    const date = s.created_at.split('T')[0];
    if (!dailyGroupsMap[date]) {
      dailyGroupsMap[date] = {
        date,
        totalAmount: 0,
        salesCount: 0,
        items: [],
      };
    }
    dailyGroupsMap[date].totalAmount += s.total_price;
    dailyGroupsMap[date].salesCount += s.quantity;
    dailyGroupsMap[date].items.push(s);
  });

  const dailyGroups = Object.values(dailyGroupsMap).sort((a, b) => b.date.localeCompare(a.date));

  // Compute aggregate indicators
  const totalDays = dailyGroups.length;
  const overallRevenue = sales.reduce((sum, s) => sum + s.total_price, 0);
  const dailyAverage = totalDays > 0 ? overallRevenue / totalDays : 0;
  const busiestDay = dailyGroups.reduce((max, curr) => curr.totalAmount > (max?.totalAmount || 0) ? curr : max, null as DailyGroup | null);

  // Filter groups based on search term (can search for date like "2026-06", "Jun", or product names, customer names)
  const filteredGroups = dailyGroups.filter((group) => {
    const formattedDate = format(parseISO(group.date), 'MMMM d, yyyy').toLowerCase();
    const query = searchTerm.toLowerCase();
    
    // Match date split format representation
    if (group.date.includes(query) || formattedDate.includes(query)) {
      return true;
    }

    // Match any customer or product names in the grouped sales items
    return group.items.some(
      (item) => 
        (item.customer_name && item.customer_name.toLowerCase().includes(query)) ||
        (item.product_name && item.product_name.toLowerCase().includes(query))
    );
  });

  const toggleExpand = (date: string) => {
    setExpandedDate(expandedDate === date ? null : date);
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
          Revenue Diagnostics / Daily Log
        </span>
      </div>

      {/* Main Banner Header */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
          <Coins size={160} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 bg-blue-500 text-slate-950 text-[10px] uppercase font-black tracking-wider rounded-full">
            Financial Analysis
          </span>
          <h1 className="text-2xl md:text-3xl font-black mt-3 tracking-tight">Daily Revenue Metrics</h1>
          <p className="text-slate-300 font-medium text-xs md:text-sm mt-2 leading-relaxed">
            Detailed chronological list of day-by-day sales performance, total quantity velocities, and itemized customer sales records.
          </p>
        </div>
      </div>

      {/* Metrics breakdown row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Overall Gross Earnings</span>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            ₦{overallRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">Across {totalDays} unique trading days</span>
        </div>

        <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Daily Running Average</span>
          <div className="text-xl font-extrabold text-slate-900 font-mono text-blue-600">
            ₦{dailyAverage.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">Average collection per trading day</span>
        </div>

        <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Peak Busiest Day</span>
          {busiestDay ? (
            <>
              <div className="text-xl font-extrabold text-slate-900 font-mono text-emerald-600">
                ₦{busiestDay.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 font-bold block mt-1">
                Recorded on {format(parseISO(busiestDay.date), 'MMMM d, yyyy')}
              </span>
            </>
          ) : (
            <div className="text-sm font-bold text-slate-400">No Sales Data</div>
          )}
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-450" size={17} />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-250 bg-slate-50 text-xs font-semibold rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-slate-950 text-slate-950 placeholder-slate-400"
            placeholder="Search daily logs by date (e.g. June, 2026-06), product name, or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List / Table of grouped days */}
      <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-semibold text-xs flex justify-center items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
            Loading daily balance sheets...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-black text-xs">
            No daily transactions matches your filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-150">
            {filteredGroups.map((group) => {
              const parsedDate = parseISO(group.date);
              const formattedDate = format(parsedDate, 'eeee, MMMM d, yyyy');
              const isExpanded = expandedDate === group.date;

              return (
                <div key={group.date} className="transition-colors hover:bg-slate-50/50">
                  {/* Row Header */}
                  <div 
                    onClick={() => toggleExpand(group.date)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 border rounded-lg text-slate-700 mt-0.5">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-950 text-sm">{formattedDate}</h4>
                        <span className="text-[10px] text-slate-500 font-mono font-bold">
                          Date ID: {group.date} • {group.items.length} order occurrences
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-left sm:text-right">
                        <span className="text-[9px] text-slate-400 block font-black uppercase tracking-widest leading-none mb-0.5">Gross Revenue</span>
                        <span className="text-md font-black text-slate-950 font-mono">
                          ₦{group.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden xs:block">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider leading-none mb-0.5">Volume sold</span>
                          <span className="text-xs font-bold text-slate-600 font-sans">
                            {group.salesCount} units
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable itemized sales list */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 border-t border-slate-150 px-4 py-4 space-y-3">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 select-none">
                        Itemized Sale Incidents ({group.items.length} records)
                      </div>
                      
                      <div className="overflow-x-auto border border-slate-200 bg-white rounded-xl">
                        <table className="w-full text-left text-xs font-sans">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider select-none">
                              <th className="p-3">Customer Name</th>
                              <th className="p-3">Sold Product</th>
                              <th className="p-3 text-center">Unit Qty</th>
                              <th className="p-3 text-right">Sum Total</th>
                              <th className="p-3 text-center">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                            {group.items.map((item, index) => (
                              <tr key={item.id || index} className="hover:bg-slate-50/70">
                                <td className="p-3">
                                  <span className="bg-slate-100 text-slate-900 border px-2 py-0.5 rounded text-[11px] font-extrabold uppercase outline-none">
                                    {item.customer_name || 'Walk-in Customer'}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-slate-950">
                                  {item.product_name || 'Deleted Product'}
                                </td>
                                <td className="p-3 text-center font-mono text-slate-700">
                                  {item.quantity}
                                </td>
                                <td className="p-3 text-right font-mono text-slate-950">
                                  ₦{item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-center text-[10px] text-slate-500 font-mono">
                                  {format(parseISO(item.created_at), 'HH:mm:ss')}
                                </td>
                              </tr>
                            ))}
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
