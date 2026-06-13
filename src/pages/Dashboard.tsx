import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sale, Product } from '../types';
import { calculateSMA, calculateLinearRegression, groupSalesByDate } from '../utils/math';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  ShoppingBag, 
  BrainCircuit, 
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  HelpCircle,
  Calculator,
  Sparkles
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isSameDay, isWithinInterval } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import ForecastingChart from '../components/ForecastingChart';
import RestockRecommendations from '../components/RestockRecommendations';
import GoalTracker from '../components/GoalTracker';

export default function Dashboard() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [smaWindow, setSmaWindow] = useState(7);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [lowLimit, setLowLimit] = useState(() => {
    const saved = localStorage.getItem('trackwise_low_stock_limit');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [criticalLimit, setCriticalLimit] = useState(() => {
    const saved = localStorage.getItem('trackwise_critical_stock_limit');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [limitsCustomized, setLimitsCustomized] = useState(() => {
    const saved = localStorage.getItem('trackwise_limits_customized');
    return saved === 'true';
  });

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const welcomeKey = `trackwise_welcome_${user.id}`;
        const emailKey = user.email ? `trackwise_just_registered_${user.email.toLowerCase().trim()}` : '';
        const hasOnboarded = localStorage.getItem(welcomeKey) === 'true';
        const hasJustRegistered = emailKey ? localStorage.getItem(emailKey) === 'true' : false;

        // Account age limit of 24 hours to separate old and brand new users
        const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
        const isRecentlyCreated = accountAgeMs < 24 * 60 * 60 * 1000;

        const isNewUser = !hasOnboarded && (hasJustRegistered || isRecentlyCreated);

        if (isNewUser) {
          setShowWelcome(true);
        } else {
          // Old user: welcome back pick up where you left off
          const sessionGreetKey = `trackwise_greeted_${user.id}`;
          if (!sessionStorage.getItem(sessionGreetKey)) {
            setShowWelcomeBack(true);
          }
        }
        
        if (user.user_metadata) {
          if (user.user_metadata.business_name) {
            setBusinessName(user.user_metadata.business_name);
          }
          if (user.user_metadata.low_stock_limit !== undefined) {
            const lVal = parseInt(user.user_metadata.low_stock_limit);
            setLowLimit(lVal);
            localStorage.setItem('trackwise_low_stock_limit', lVal.toString());
            setLimitsCustomized(true);
            localStorage.setItem('trackwise_limits_customized', 'true');
          } else {
            const saved = localStorage.getItem('trackwise_limits_customized');
            if (saved === 'true') {
              setLimitsCustomized(true);
            } else {
              setLimitsCustomized(false);
              localStorage.setItem('trackwise_limits_customized', 'false');
            }
          }
          if (user.user_metadata.critical_stock_limit !== undefined) {
            const cVal = parseInt(user.user_metadata.critical_stock_limit);
            setCriticalLimit(cVal);
            localStorage.setItem('trackwise_critical_stock_limit', cVal.toString());
          }
        } else {
          setLimitsCustomized(false);
          localStorage.setItem('trackwise_limits_customized', 'false');
        }
      }
    } catch (err) {
      console.error('Error fetching user metadata:', err);
    }
  };

  const handleDismissWelcome = () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        localStorage.setItem(`trackwise_welcome_${user.id}`, 'true');
        const emailKey = user.email ? `trackwise_just_registered_${user.email.toLowerCase().trim()}` : '';
        if (emailKey) {
          localStorage.removeItem(emailKey);
        }
      }
    });
    setShowWelcome(false);
  };

  const fetchData = async () => {
    try {
      const [salesRes, productsRes] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: true }),
        supabase.from('products').select('*')
      ]);

      if (salesRes.error) throw salesRes.error;
      if (productsRes.error) throw productsRes.error;

      setSales(salesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUser();
  }, []);

  // Stats Calculations
  const today = new Date();
  const dailyRevenue = sales
    .filter(s => isSameDay(new Date(s.created_at), today))
    .reduce((sum, s) => sum + s.total_price, 0);

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthlyRevenue = sales
    .filter(s => isWithinInterval(new Date(s.created_at), { start: monthStart, end: monthEnd }))
    .reduce((sum, s) => sum + s.total_price, 0);

  const lowStockProducts = products.filter(p => p.stock_quantity <= criticalLimit);

  // AI Forecasting Logic
  const dailyChartData = groupSalesByDate(sales);
  const revenueValues = dailyChartData.map(d => d.amount);
  
  const smaPrediction = calculateSMA(revenueValues, smaWindow);
  const regression = calculateLinearRegression(revenueValues);
  const nextDayIndex = dailyChartData.length + 1;
  const regressionPrediction = regression.predict(nextDayIndex);

  const trend = regression.slope > 0 ? 'up' : regression.slope < 0 ? 'down' : 'neutral';

  return (
    <div className="space-y-8">
      {/* Welcome Back Session Banner */}
      {showWelcomeBack && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-sky-50 border-4 border-slate-950 rounded-2xl flex items-center justify-between shadow-lg relative"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 text-sky-400 rounded-xl">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <p className="text-base font-black text-slate-950">
                Welcome back, {businessName || 'TrackWise Partner'}! 👋
              </p>
              <p className="text-xs text-slate-700 font-bold">
                Pick up where you left off. Let's check today's performance insights.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => {
              supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                  sessionStorage.setItem(`trackwise_greeted_${user.id}`, 'true');
                }
              });
              setShowWelcomeBack(false);
            }}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-[10px] uppercase rounded-lg border-2 border-slate-950 transition-colors cursor-pointer select-none"
          >
            ✕ Dismiss
          </button>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-slate-950 tracking-tight">
            {businessName ? `${businessName} Dashboard` : 'Business Overview'}
          </h1>
          <p className="text-slate-700 font-bold mt-1">Real-time stats and intelligent sales forecasting with TrackWise.</p>
        </div>
        <button 
          onClick={() => setShowExplanation(prev => !prev)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white font-extrabold rounded-lg text-sm hover:bg-slate-800 transition-colors cursor-pointer w-fit self-start sm:self-auto"
        >
          <HelpCircle size={16} />
          {showExplanation ? 'Hide Guide' : 'How does AI Forecast work?'}
        </button>
      </div>

      {/* Revenue Summaries */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Today's Revenue" 
          value={`₦${dailyRevenue.toFixed(2)}`} 
          icon={<Coins className="text-blue-600" />} 
          color="bg-blue-50"
          onClick={() => navigate('/revenue/daily')}
          subtitle="Click to view daily balance sheet"
        />
        <StatCard 
          title="Monthly Revenue" 
          value={`₦${monthlyRevenue.toFixed(2)}`} 
          icon={<Calendar className="text-purple-600" />} 
          color="bg-purple-50"
          onClick={() => navigate('/revenue/monthly')}
          subtitle="Click to view monthly performance"
        />
        <StatCard 
          title="Total Products" 
          value={products.length.toString()} 
          icon={<ShoppingBag className="text-green-600" />} 
          color="bg-green-50"
          onClick={() => navigate('/products')}
          subtitle="Click to manage catalog"
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={limitsCustomized ? lowStockProducts.length.toString() : '—'} 
          icon={<AlertTriangle className={!limitsCustomized ? "text-slate-400" : (lowStockProducts.length > 0 ? "text-orange-600" : "text-slate-400")} />} 
          color={!limitsCustomized ? "bg-slate-50" : (lowStockProducts.length > 0 ? "bg-orange-50" : "bg-slate-50")}
          subtitle={!limitsCustomized ? "User has not customized stock limits" : (lowStockProducts.length > 0 ? `${lowStockProducts.length} items <= ${criticalLimit} units (Click to view)` : 'Click to see low stock levels')}
          onClick={() => {
            if (!limitsCustomized) {
              navigate('/account?tab=settings');
            } else {
              setShowLowStockModal(true);
            }
          }}
        />
      </div>

      {/* Forecasting Explanation Section (Moved under summaries, spans full screen width) */}
      {showExplanation && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-sky-50 border-2 border-sky-300 rounded-xl p-6 text-slate-900 shadow-md text-left w-full animate-fade-in"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <h3 className="text-lg font-extrabold text-sky-950 flex items-center gap-2">
              <Info className="text-sky-700 flex-shrink-0" size={18} />
              TrackWise Forecasting Engine: Guide & Methods
            </h3>
            <button
              onClick={() => navigate('/forecast-guide')}
              className="flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-extrabold uppercase rounded text-[10px] tracking-wider transition-colors cursor-pointer select-none"
            >
              <Calculator size={12} /> Open Demo Calculator
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm leading-relaxed">
            <div className="bg-white p-4 rounded-lg border border-sky-200">
              <h4 className="font-bold text-sky-900 mb-1 text-sm">1. Simple Moving Average (SMA)</h4>
              <p className="text-slate-800 font-medium mb-2 text-xs leading-normal">
                SMA calculates the average sales revenue over a fixed "moving index window" (e.g. your active 7-day scale).
              </p>
              <p className="text-slate-600 text-xs leading-normal">
                <b>Why it works:</b> It smoothes out unexpected outlier spikes or drops on single weekdays, presenting a stable look at what you can reasonably expect next.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-sky-200">
              <h4 className="font-bold text-sky-900 mb-1 text-sm">2. Linear Regression Forecast</h4>
              <p className="text-slate-800 font-medium mb-2 text-xs leading-normal">
                This utilizes least-squares mathematical modeling across all consecutive historic sales dates.
              </p>
              <p className="text-slate-600 text-xs leading-normal">
                <b>Why it works:</b> It fits a trend line to compute your growth trajectory. If your slope is positive, you are in a <b>Growing Trend</b>; if negative, a <b>Declining Trend</b>. It uses this trajectory to project tomorrow's predicted demand.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Group 1: TrackWise AI Predictions & Monthly Target goals directly below Revenue Summaries */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* TrackWise AI Predictions */}
        <div className="dashboard-card border-2 border-slate-300 shadow-md bg-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-500 pointer-events-none">
            <BrainCircuit size={160} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200">
                  <BrainCircuit size={24} className="text-sky-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">TrackWise AI Predictions</h2>
                  <p className="text-slate-700 text-sm font-bold">Forecasting based on historical trends</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-xl p-5 border-2 border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-slate-800 text-xs font-extrabold uppercase tracking-wider block">SMA (Next Period)</span>
                  <div className="flex items-center gap-1 bg-slate-200 px-2 py-0.5 rounded border border-slate-300">
                    <label className="text-[10px] text-slate-800 font-bold uppercase">Days:</label>
                    <input 
                      type="number" 
                      className="bg-transparent border-0 p-0 text-[10px] w-6 text-blue-600 font-extrabold focus:ring-0 text-center" 
                      value={smaWindow}
                      onChange={(e) => setSmaWindow(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">₦{smaPrediction.toFixed(2)}</div>
                <p className="text-[10px] text-slate-600 mt-2 font-semibold italic font-mono bg-slate-200/40 p-1.5 rounded">Moving average of last {smaWindow} days</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border-2 border-slate-200">
                <span className="text-slate-800 text-xs font-extrabold uppercase tracking-wider block mb-2">Regression Forecast</span>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">₦{regressionPrediction.toFixed(2)}</div>
                <div className="flex items-center gap-2 mt-2">
                  {trend === 'up' ? (
                    <span className="flex items-center gap-1 text-green-700 text-xs font-extrabold bg-green-100 px-2.5 py-1 rounded-lg border border-green-200">
                      <ArrowUpRight size={14} className="stroke-[3]" /> Growing Trend
                    </span>
                  ) : trend === 'down' ? (
                    <span className="flex items-center gap-1 text-red-700 text-xs font-extrabold bg-red-100 px-2.5 py-1 rounded-lg border border-red-200">
                      <ArrowDownRight size={14} className="stroke-[3]" /> Declining Trend
                    </span>
                  ) : (
                    <span className="text-slate-800 text-xs font-extrabold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">Stable Market</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-black mb-3 flex items-center gap-2 text-slate-950">
                <TrendingUp size={16} className="text-slate-800 stroke-[3]" />
                Strategic Insight
              </h3>
              <p className="text-slate-800 text-sm font-bold leading-relaxed bg-sky-50/50 p-4 rounded-lg border-2 border-sky-150">
                {dailyChartData.length < 5 ? (
                  "Not enough historical data for high-confidence predictions. Keep recording sales to improve TrackWise's accuracy."
                ) : trend === 'up' ? (
                  `Sales are projected to grow. Consider increasing stock of top-performing items to meet the predicted demand of ₦${regressionPrediction.toFixed(2)} tomorrow.`
                ) : (
                  `A potential decline is detected. Current prediction suggests ₦${regressionPrediction.toFixed(2)}. Review your marketing strategy or adjust inventory levels accordingly.`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Feature 3: Interactive Revenue Targets and Goal Metric forecasts */}
        <GoalTracker monthlyRevenue={monthlyRevenue} sales={sales} />
      </div>

      {/* Feature 1: Statistical Interactive Forecasting Graph Overlay moved BELOW */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md">
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
            <TrendingUp className="text-slate-900" size={22} />
            Statistical Sales Revenue & Predictive Regression Trend
          </h2>
          <p className="text-slate-700 text-xs font-bold mt-0.5">
            Historical day-by-day revenue overlay plotted alongside moving average indices and regression curves.
          </p>
        </div>
        <ForecastingChart dailySalesData={dailyChartData} smaWindow={smaWindow} />
      </div>

      {/* Bottom Group: Replenishment Velocity Slices and Inventory Distribution */}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Slipped slice restock recommendations dashboard view */}
        <RestockRecommendations products={products} sales={sales} isDashboard={true} />

        {/* Inventory Distribution Outline */}
        <div className="dashboard-card border-2 border-slate-300 shadow-md">
          <h2 className="text-xl font-black text-slate-950 mb-6 font-sans">Inventory Distribution</h2>
          <div className="space-y-4">
            {products.length === 0 ? (
              <p className="text-slate-800 font-bold text-center py-8">No products yet.</p>
            ) : (
              products.slice(0, 6).map(p => {
                const percentage = Math.min((p.stock_quantity / 100) * 100, 100);
                return (
                  <div key={p.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-800">{p.name}</span>
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{p.stock_quantity} units</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          p.stock_quantity <= criticalLimit ? 'bg-red-600' : p.stock_quantity <= lowLimit ? 'bg-yellow-500' : 'bg-slate-900'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })
            )}
            {products.length > 6 && (
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="w-full text-center text-xs text-slate-900 hover:text-slate-850 font-extrabold mt-4 italic underline cursor-pointer select-none block hover:font-black"
              >
                + {products.length - 6} more products in inventory catalog (Click to view)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Detailed Modal Overlay */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in" id="low-stock-modal">
          <div className="bg-white border-4 border-slate-950 rounded-2xl p-6 shadow-2xl w-full max-w-lg relative">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-orange-50 p-2 rounded-lg border border-orange-200">
                  <AlertTriangle className="text-orange-600 animate-pulse" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Low Stock Inventory</h3>
                  <p className="text-slate-500 text-[9px] font-bold uppercase">STOCKS &lt;= {criticalLimit} UNITS</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLowStockModal(false)}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-lg transition-colors cursor-pointer border border-slate-250 font-mono"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-700 font-semibold mb-4 leading-relaxed bg-orange-50/50 p-3 rounded-xl border border-orange-100">
              The following products require instant replenishment to prevent out-of-stock interruptions in your customer purchase flows.
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-bold">
                  All systems green! No low stock warnings.
                </div>
              ) : (
                lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-slate-400 transition-colors">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-extrabold text-xs text-slate-950 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono font-bold">Remaining Units Left: {p.stock_quantity}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-black text-slate-950">
                        ₦{p.price.toFixed(2)}
                      </span>
                      <span className={`px-2 py-1 text-[9px] font-black uppercase rounded border ${
                        p.stock_quantity === 0 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : 'bg-orange-100 text-orange-700 border-orange-250'
                      }`}>
                        {p.stock_quantity} units
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-6 pt-4 border-t border-slate-150 flex gap-3">
              <button
                onClick={() => {
                  setShowLowStockModal(false);
                  navigate('/products');
                }}
                className="flex-1 bg-slate-950 hover:bg-slate-850 text-white font-black text-xs uppercase py-3 px-4 rounded-xl transition-all cursor-pointer text-center"
              >
                Go to products Catalog
              </button>
              <button
                onClick={() => setShowLowStockModal(false)}
                className="px-4 py-3 bg-slate-50 border border-slate-300 hover:bg-slate-150 text-slate-700 font-black text-xs uppercase rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Onboarding Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white border-4 border-slate-950 rounded-2xl p-8 shadow-2xl w-full max-w-lg relative animate-fade-in text-center space-y-4">
            <div className="inline-flex p-3 bg-sky-50 text-sky-600 rounded-full border border-sky-200 animate-bounce">
              <Sparkles size={32} className="text-sky-600" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-950">Welcome to TrackWise! 🎉</h2>
            <p className="text-slate-700 text-sm font-semibold leading-relaxed">
              We're excited to help you manage your business sales and inventory with intelligent forecasting.
            </p>

            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-black text-slate-900 uppercase tracking-wide">
                To customize your workspace now:
              </p>
              <ul className="text-xs text-slate-700 font-bold list-disc list-inside space-y-1">
                <li>Set your <b>Monthly Sales Goal Target</b> values</li>
                <li>Configure your <b>Safety Stock Alerts</b> (Low & Critical stock)</li>
                <li>Customize your <b>Business Name</b> branding for receipts</li>
              </ul>
            </div>

            <p className="text-[10px] text-slate-500 font-semibold italic">
              These settings drive the real-time indicators and receipts across your workspace!
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  handleDismissWelcome();
                  navigate('/account?tab=settings');
                }}
                className="flex-1 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-xs uppercase py-3.5 px-4 rounded-xl transition-all cursor-pointer text-center shadow-md border-b-2 border-slate-800"
              >
                Go to Page Settings ⚙️
              </button>
              <button
                onClick={handleDismissWelcome}
                className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-extrabold text-xs uppercase rounded-xl transition-colors cursor-pointer"
              >
                Explore first
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle, 
  onClick 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color: string; 
  subtitle?: string; 
  onClick?: () => void;
}) {
  const isClickable = !!onClick;
  return (
    <div 
      onClick={onClick}
      className={`dashboard-card border-2 border-slate-300 shadow-md transition-all duration-200 ${
        isClickable 
          ? 'cursor-pointer hover:border-slate-800 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:shadow-md' 
          : ''
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <div className={`${color} p-3 rounded-xl border border-slate-200`}>
          {icon}
        </div>
        <div className="text-xs font-black text-slate-700 uppercase tracking-wider select-none">{title}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</div>
      {subtitle && (
        <p className="text-xs text-slate-800 mt-2 font-black bg-slate-100 px-2 py-1 rounded inline-block select-none">
          {subtitle}
        </p>
      )}
    </div>
  );
}
