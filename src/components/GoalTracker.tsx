import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { differenceInDays, endOfMonth, isWithinInterval, startOfMonth } from 'date-fns';

interface GoalTrackerProps {
  monthlyRevenue: number;
  sales: { created_at: string; total_price: number }[];
}

export default function GoalTracker({ monthlyRevenue, sales }: GoalTrackerProps) {
  const [goal, setGoal] = useState<number>(500000);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('trackwise_monthly_goal');
    if (saved) {
      setGoal(parseFloat(saved));
    }
  }, []);

  const today = new Date();
  const startOfThisMonth = startOfMonth(today);
  const endOfThisMonth = endOfMonth(today);
  
  // Remaining days in month
  const totalDaysInMonth = differenceInDays(endOfThisMonth, startOfThisMonth) + 1;
  const daysElapsed = differenceInDays(today, startOfThisMonth) + 1;
  const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed);

  // Calculate Average Daily Sales Revenue this month
  const currentMonthSales = sales.filter(s => {
    const d = new Date(s.created_at);
    return isWithinInterval(d, { start: startOfThisMonth, end: endOfThisMonth });
  });
  
  const dailyVelocity = daysElapsed > 0 ? monthlyRevenue / daysElapsed : 0;
  
  // Predict final outcome
  const projectedExtraRevenue = daysRemaining * dailyVelocity;
  const projectedTotalRevenue = monthlyRevenue + projectedExtraRevenue;
  const percentageCompleted = Math.min((monthlyRevenue / goal) * 100, 100);
  const projectedPercentage = Math.min((projectedTotalRevenue / goal) * 100, 101);

  // Forecast state
  const isPredictedToSucceed = projectedTotalRevenue >= goal;

  return (
    <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <Target className="text-slate-800" size={22} />
            Monthly Targets
          </h2>
          <p className="text-slate-700 text-xs font-bold mt-0.5">
            Set and track monthly revenue benchmarks with intelligent forecast indicators.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-xs font-bold">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
          <div className="text-slate-500 font-extrabold uppercase text-[9px] tracking-wider">Current Target</div>
          <div className="text-lg font-black text-slate-900 mt-0.5">₦{goal.toLocaleString(undefined, {minimumFractionDigits: 0})}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
          <div className="text-slate-500 font-extrabold uppercase text-[9px] tracking-wider">Monthly Revenue</div>
          <div className="text-lg font-black text-slate-900 mt-0.5 text-indigo-700">₦{monthlyRevenue.toLocaleString(undefined, {minimumFractionDigits: 0})}</div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1 text-[10px] font-black uppercase text-slate-800">
            <span>Month Progress ({daysElapsed} of {totalDaysInMonth} days elapsed)</span>
            <span>{Math.round((daysElapsed / totalDaysInMonth) * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full border border-slate-200 overflow-hidden">
            <div 
              className="h-full bg-slate-400 transition-all duration-500"
              style={{ width: `${(daysElapsed / totalDaysInMonth) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1 text-[10px] font-black uppercase text-slate-800">
            <span>Target Attainment</span>
            <span>{percentageCompleted.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full border border-slate-200 overflow-hidden relative">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${percentageCompleted}%` }}
            />
            {projectedPercentage > percentageCompleted && (
              <div 
                className="absolute top-0 h-full bg-indigo-400/40 border-l border-indigo-500/50 transition-all duration-500"
                style={{ 
                  left: `${percentageCompleted}%`, 
                  width: `${projectedPercentage - percentageCompleted}%` 
                }}
                title="Forecasted achievement by month end"
              />
            )}
          </div>
        </div>
      </div>

      {/* Predictive Target Outcome Analysis */}
      <div className="mt-6 pt-5 border-t border-slate-200">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Sparkles className="text-amber-500" size={14} />
          Predictive Feasibility Model
        </h3>

        {monthlyRevenue === 0 ? (
          <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-xs font-semibold leading-relaxed border border-slate-200">
            Log transactions this month to activate target feasibility forecast modeling.
          </div>
        ) : isPredictedToSucceed ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3.5 leading-relaxed text-xs">
            <TrendingUp className="text-emerald-600 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <div className="font-extrabold text-emerald-950 uppercase tracking-wider text-[10px]">On Target to Succeed</div>
              <p className="text-slate-800 font-semibold mt-1">
                At current sales velocity (₦{dailyVelocity.toFixed(2)}/day), your business is projected to reach{' '}
                <strong className="text-emerald-900">₦{projectedTotalRevenue.toFixed(2)}</strong> ({projectedPercentage.toFixed(0)}% of goal) by month-end.
              </p>
              <div className="text-emerald-800 font-extrabold text-[10px] mt-2 italic">
                Recommendation: Maintain current product distribution level.
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3.5 leading-relaxed text-xs">
            <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <div className="font-extrabold text-amber-950 uppercase tracking-wider text-[10px]">Target Deficit Forecasted</div>
              <p className="text-slate-800 font-semibold mt-1">
                At current run-rate, your business is projected to reach{' '}
                <strong className="text-slate-900">₦{projectedTotalRevenue.toFixed(2)}</strong> ({projectedPercentage.toFixed(0)}% of goal), leaving a gap of ₦{(goal - projectedTotalRevenue).toFixed(2)}.
              </p>
              <div className="text-amber-800 font-extrabold text-[10px] mt-2 italic">
                Recommendation: Increase daily velocity by ₦{((goal - monthlyRevenue) / Math.max(1, daysRemaining) - dailyVelocity).toFixed(2)}/day to close the gap.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
