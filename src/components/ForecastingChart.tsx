import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Area
} from 'recharts';
import { calculateSMA, calculateLinearRegression } from '../utils/math';
import { format, parseISO } from 'date-fns';
import { ChartLine, Eye, EyeOff, Sparkles } from 'lucide-react';

interface ForecastingChartProps {
  dailySalesData: { date: string; amount: number }[];
  smaWindow: number;
}

export default function ForecastingChart({ dailySalesData, smaWindow }: ForecastingChartProps) {
  const [showDaily, setShowDaily] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [showRegression, setShowRegression] = useState(true);

  if (dailySalesData.length === 0) {
    return (
      <div className="bg-white border-2 border-slate-300 rounded-xl p-8 text-center text-slate-500 shadow-md">
        <ChartLine className="mx-auto text-slate-300 mb-2" size={32} />
        <p className="text-sm font-bold">No sales data recorded yet to build the interactive model.</p>
        <p className="text-xs text-slate-500 mt-1">Add sales transactions to visualize your business trend lines.</p>
      </div>
    );
  }

  // Calculate trends for chart display
  const amounts = dailySalesData.map(d => d.amount);
  const regression = calculateLinearRegression(amounts);

  const chartData = dailySalesData.map((d, index) => {
    // Current Index for regression
    const x = index + 1;
    const regVal = regression.predict(x);

    // SMA for current index window
    const previousPoints = amounts.slice(0, index + 1);
    const windowPoints = previousPoints.slice(-smaWindow);
    const smaVal = windowPoints.reduce((acc, val) => acc + val, 0) / windowPoints.length;

    // Formatted date label
    let formattedDate = d.date;
    try {
      formattedDate = format(parseISO(d.date), 'MMM d');
    } catch (e) {
      // fallback
    }

    return {
      date: formattedDate,
      revenue: d.amount,
      sma: Number(smaVal.toFixed(2)),
      regression: Number(regVal.toFixed(2))
    };
  });

  // Calculate 3-day future predictions to append
  const futureData = [];
  for (let i = 1; i <= 3; i++) {
    const nextX = amounts.length + i;
    const futureRegVal = regression.predict(nextX);
    futureData.push({
      date: `In ${i} ${i === 1 ? 'day' : 'days'} (Proj)`,
      revenue: undefined,
      sma: undefined,
      regression: Number(futureRegVal.toFixed(2))
    });
  }

  const fullChartData = [...chartData, ...futureData];

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl text-xs font-semibold leading-relaxed">
          <p className="text-slate-400 font-extrabold uppercase mb-1">{label}</p>
          {payload.map((item: any, idx: number) => {
            if (item.value === undefined) return null;
            return (
              <div key={idx} className="flex justify-between gap-4">
                <span style={{ color: item.color }}>{item.name}:</span>
                <span className="font-mono font-black text-slate-50">₦{item.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <ChartLine className="text-slate-800" size={22} />
            Statistical Trend Graph
          </h2>
          <p className="text-slate-700 text-xs font-bold mt-0.5">
            Interactive multi-model plotting overlaying daily sales with SMA and Regression Trendlines.
          </p>
        </div>

        {/* Legend Custom Controls */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setShowDaily(!showDaily)}
            className={`px-3 py-1.5 rounded-lg border font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none transition-colors ${
              showDaily 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
            }`}
          >
            {showDaily ? <Eye size={13} /> : <EyeOff size={13} />}
            Actual Revenue
          </button>
          
          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`px-3 py-1.5 rounded-lg border font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none transition-colors ${
              showSMA 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
            }`}
          >
            {showSMA ? <Eye size={13} /> : <EyeOff size={13} />}
            SMA Line
          </button>

          <button
            onClick={() => setShowRegression(!showRegression)}
            className={`px-3 py-1.5 rounded-lg border font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none transition-colors ${
              showRegression 
                ? 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700' 
                : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
            }`}
          >
            {showRegression ? <Eye size={13} /> : <EyeOff size={13} />}
            Regression Proj
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={fullChartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              fontSize={10} 
              fontWeight={700}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={10} 
              fontWeight={705}
              tickLine={false}
              tickFormatter={(val) => `₦${val}`}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {showDaily && (
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Recorded Revenue" 
                fill="url(#colorRevenue)" 
                stroke="#3b82f6" 
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 1.5, fill: '#fff' }}
                activeDot={{ r: 6 }}
              />
            )}
            
            {showSMA && (
              <Line 
                type="monotone" 
                dataKey="sma" 
                name="Simple Moving Avg" 
                stroke="#6366f1" 
                strokeWidth={2} 
                strokeDasharray="4 4"
                dot={false}
              />
            )}
            
            {showRegression && (
              <Line 
                type="monotone" 
                dataKey="regression" 
                name="Linear Regression Proj" 
                stroke="#d946ef" 
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-bold bg-slate-50 p-3 rounded-lg border border-slate-200">
        <span className="flex items-center gap-1">
          <Sparkles size={12} className="text-amber-500 animate-pulse" />
          Linear Regression outputs are calculated mathematically using least-squares modeling.
        </span>
        <span className="italic font-mono">3 Future Projections Added</span>
      </div>
    </div>
  );
}
