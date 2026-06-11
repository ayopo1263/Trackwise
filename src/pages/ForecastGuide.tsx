import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  HelpCircle, 
  BrainCircuit, 
  Calculator, 
  GitCommit, 
  TrendingUp, 
  RefreshCw, 
  Check, 
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function ForecastGuide() {
  const navigate = useNavigate();

  // Interactive playground state
  const [inputRaw, setInputRaw] = useState('12000, 15000, 14200, 18500, 21000, 19500, 24000');
  const [playgroundWindow, setPlaygroundWindow] = useState(3);
  const [successMsg, setSuccessMsg] = useState('');

  // Parse custom values
  const dataset = inputRaw
    .split(',')
    .map(val => parseFloat(val.trim()))
    .filter(val => !isNaN(val));

  // 1. SMA calculation step-by-step
  const targetSmaPeriod = Math.min(playgroundWindow, dataset.length);
  const activeSmaSubset = dataset.slice(-targetSmaPeriod);
  const smaSum = activeSmaSubset.reduce((sum, v) => sum + v, 0);
  const calculatedSma = targetSmaPeriod > 0 ? smaSum / targetSmaPeriod : 0;

  // 2. Linear Regression calculation step-by-step
  const n = dataset.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  const regressionSteps: { x: number; y: number; x2: number; xy: number }[] = [];

  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = dataset[i];
    const x2 = x * x;
    const xy = x * y;
    sumX += x;
    sumY += y;
    sumXY += xy;
    sumX2 += x2;
    regressionSteps.push({ x, y, x2, xy });
  }

  // Denominator for slope
  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;

  const nextIndex = n + 1;
  const predictedValue = slope * nextIndex + intercept;

  const handleResetDataset = () => {
    setInputRaw('12000, 15000, 14200, 18500, 21000, 19500, 24000');
    setPlaygroundWindow(3);
    setSuccessMsg('Dataset restored to default trial sequences.');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Back to Dashboard bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <span className="text-xs font-mono fg-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          TrackWise Analytics Sandbox v1.2
        </span>
      </div>

      <div className="bg-slate-950 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none transition-transform hover:scale-105">
          <BrainCircuit size={200} className="text-slate-200" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <span className="px-3 py-1 bg-sky-500 text-slate-950 text-[10px] uppercase font-black tracking-wider rounded-full">
            Under the hood
          </span>
          <h1 className="text-3xl md:text-4xl font-black mt-3 tracking-tight">Forecasting Algorithm Mechanics</h1>
          <p className="text-slate-300 font-bold mt-2 leading-relaxed">
            TrackWise combines deterministic moving averages and statistics-based ordinary least squares (OLS) regression models 
            to estimate your store inventory demand trajectories without relying on remote API black-boxes. Learn how the math works and experiment instantly below.
          </p>
        </div>
      </div>

      {/* Tabs / Method Highlight Cards */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Simple Moving Average Math Explainer */}
        <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl">
              <Layers size={22} />
            </div>
            <div>
              <h2 className="text-md font-black text-slate-950">Simple Moving Average</h2>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Smoothing Out Volatility</span>
            </div>
          </div>
          <p className="text-slate-700 text-xs font-semibold leading-relaxed mb-4">
            A simple moving average calculates the mean average of a specified subset of the most recent data points. It is "moving" because old data points drop off as new daily sales values are added to the list.
          </p>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-mono text-xs text-slate-800 space-y-2 mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase block">Calculation Formula</span>
            <div className="text-slate-950 font-bold border-b border-slate-200 pb-2 text-sm text-center">
              SMA = (x₁ + x₂ + ... + xₙ) / n
            </div>
            <p className="text-[10px] text-slate-600 leading-normal pt-1">
              Where <b>x</b> values are your daily sales values, and <b>n</b> is the user-configured daily observation scale. If you set observations to <b>7</b>, SMA averages only the last 7 recorded daily values.
            </p>
          </div>
          <div className="text-xs text-slate-600 space-y-1 bg-blue-50/50 border border-blue-250 p-3 rounded-lg">
            <p className="font-extrabold text-blue-900 flex items-center gap-1">
              <Info size={12} /> Strategic Advantage:
            </p>
            <p className="text-slate-800 font-semibold leading-normal">
              Eliminates freak spikes (e.g. one-day bumper purchases or holidays) so you do not double your production schedules unnecessarily.
            </p>
          </div>
        </div>

        {/* Linear Regression Trend Explainer */}
        <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-purple-50 border border-purple-200 text-purple-600 rounded-xl">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-md font-black text-slate-950">Linear Regression Trendline</h2>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Least-Squares Trend Analysis</span>
            </div>
          </div>
          <p className="text-slate-700 text-xs font-semibold leading-relaxed mb-4">
            We model daily sales as a function of chronological progression. It calculates the line of best fit (using minimization of residual sums) to establish whether sales are progressing higher or pulling lower over time.
          </p>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-mono text-xs text-slate-800 space-y-2 mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase block">Slope Equations</span>
            <div className="text-slate-950 font-bold border-b border-slate-200 pb-1.5 text-[11px] text-center">
              y = m · x + b
            </div>
            <div className="text-slate-950 font-bold text-[10px] text-center">
              m = (n·Σxy - Σx·Σy) / (n·Σx² - (Σx)²)
            </div>
            <div className="text-slate-950 font-bold text-[10px] text-center">
              b = (Σy - m·Σx) / n
            </div>
          </div>
          <div className="text-xs text-slate-600 space-y-1 bg-purple-50/50 border border-purple-250 p-3 rounded-lg">
            <p className="font-extrabold text-purple-900 flex items-center gap-1">
              <Info size={12} /> Strategic Advantage:
            </p>
            <p className="text-slate-800 font-semibold leading-normal">
              Quantifies momentum trajectory. Rather than looking backward, it allows us to project future numbers along the calculated trend mathematical tangent.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Sandbox Simulator */}
      <div className="bg-white border-2 border-slate-350 rounded-xl p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <Calculator className="text-slate-800" size={20} />
                Method Calculations & Playground Simulator
              </h2>
              <p className="text-xs text-slate-700 font-bold">Input actual daily revenue figures below to see live formula calculations.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDataset}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-lg border border-slate-250 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} /> Reset to Demo Series
              </button>
            </div>
          </div>
          {successMsg && (
            <div className="mt-2 text-xs bg-green-50 text-green-700 border border-green-200 font-bold px-3 py-1.5 rounded-lg">
              {successMsg}
            </div>
          )}
        </div>

        {/* Inputs row */}
        <div className="grid md:grid-cols-3 gap-6 bg-slate-50 p-5 border border-slate-200 rounded-xl">
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
              Historical Values (Daily Revenue Series - Comma Separated in ₦)
            </label>
            <input
              type="text"
              className="w-full text-xs font-mono font-bold bg-white"
              value={inputRaw}
              onChange={(e) => setInputRaw(e.target.value)}
              placeholder="e.g. 10000, 14000, 12000"
            />
            <span className="text-[10px] text-slate-500 font-bold block">
              Provide consecutive sales amounts representing consecutive days. Currently parsed: {dataset.length} valid days.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
              SMA Window Period (Days)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max={Math.max(1, dataset.length)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-950"
                value={playgroundWindow}
                onChange={(e) => setPlaygroundWindow(parseInt(e.target.value))}
              />
              <span className="text-xs font-extrabold text-slate-900 bg-white border px-2.5 py-1.5 rounded font-mono">
                {playgroundWindow}d
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold block">
              Must be less or equal to parsed dataset array length.
            </span>
          </div>
        </div>

        {dataset.length === 0 ? (
          <div className="p-8 border border-dashed text-center text-slate-500 text-xs font-bold">
            Please enter a valid comma-separated set of numerical daily sales values.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Live Calculations Part 1: Moving Average */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-2">
                <span className="text-xs font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">Step 1</span>
                <h3 className="text-sm font-black text-slate-900">Moving Average Dynamic Run</h3>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3 font-mono text-xs">
                <div className="text-slate-800">
                  <span className="font-bold text-slate-900">Target Scale Window (n):</span> {targetSmaPeriod} days
                </div>
                <div className="text-slate-800">
                  <span className="font-bold text-slate-900">Filtered Observation Subset:</span>{' '}
                  <span className="font-extrabold text-blue-600 font-sans">
                    [{activeSmaSubset.map(num => `₦${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`).join(', ')}]
                  </span>
                </div>
                <div className="text-slate-800">
                  <span className="font-bold text-slate-900">Aggregate Sum (Σx):</span>{' '}
                  ₦{smaSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>

                <div className="p-3 bg-white border-l-4 border-blue-500 text-xs text-slate-800 rounded">
                  <p className="font-black text-slate-900 mb-1 font-sans">Arithmetic Formula Solution:</p>
                  <p className="font-bold text-blue-900 text-[13px]">
                    SMA = ({activeSmaSubset.map(n => n.toLocaleString()).join(' + ')}) / {targetSmaPeriod}
                  </p>
                  <p className="text-[13px] font-black text-slate-950 mt-1.5 flex items-center gap-1.5">
                    <span>= ₦{smaSum.toLocaleString()} / {targetSmaPeriod}</span>
                    <span className="text-blue-700">= ₦{calculatedSma.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Live Calculations Part 2: Linear Regression Table & Formula */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-2">
                <span className="text-xs font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase">Step 2</span>
                <h3 className="text-sm font-black text-slate-900">Ordinary Least Squares Regression Method</h3>
              </div>

              <div className="overflow-x-auto border-2 border-slate-200 bg-white rounded-xl">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-250">
                      <th className="p-3 font-semibold text-[10px] uppercase">Observation (Day X)</th>
                      <th className="p-3 font-semibold text-[10px] uppercase">Revenue Value (Y)</th>
                      <th className="p-3 font-semibold text-[10px] uppercase text-center">X² (Time Index Squared)</th>
                      <th className="p-3 font-semibold text-[10px] uppercase text-right">XY (Value Coefficient)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regressionSteps.map((step) => (
                      <tr key={step.x} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{step.x}</td>
                        <td className="p-3 font-extrabold text-slate-950">₦{step.y.toLocaleString()}</td>
                        <td className="p-3 text-center text-slate-600">{step.x2}</td>
                        <td className="p-3 text-right font-bold text-slate-900">₦{step.xy.toLocaleString()}</td>
                      </tr>
                    ))}
                    {/* Summation Row */}
                    <tr className="bg-slate-150 border-t-2 border-slate-300">
                      <td className="p-3.5 font-black text-slate-900 uppercase">
                        SUMS (Σ, N = {n})
                      </td>
                      <td className="p-3.5 font-black text-slate-950 bg-slate-100/50">
                        Σy = ₦{sumY.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center font-black text-slate-900">
                        Σx² = {sumX2}
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-950 font-mono">
                        Σxy = ₦{sumXY.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Formula and dynamic calculation results */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 font-mono text-xs">
                <h4 className="font-extrabold font-sans text-xs text-slate-900 border-b pb-1.5">Calculating Slope (m) & Intercept (b):</h4>
                
                <div className="space-y-2.5">
                  <div className="bg-white border p-3.5 rounded-lg space-y-1">
                    <span className="font-black text-slate-500 uppercase text-[9px] block">Slope Formula Equation</span>
                    <p className="text-slate-950 font-bold">m = (N·Σxy - Σx·Σy) / (N·Σx² - (Σx)²)</p>
                    <p className="text-slate-600 font-sans text-xs pt-1">Plugging in sandbox coefficients:</p>
                    <p className="font-extrabold text-blue-900">
                      m = ({n} · {sumXY} - {sumX} · {sumY}) / ({n} · {sumX2} - {sumX}²)
                    </p>
                    <p className="font-extrabold text-slate-800">
                      m = ({(n * sumXY).toLocaleString()} - {(sumX * sumY).toLocaleString()}) / ({(n * sumX2).toLocaleString()} - {(sumX * sumX).toLocaleString()})
                    </p>
                    <p className="font-black text-slate-950 text-sm mt-1">
                      m = {(n * sumXY - sumX * sumY).toLocaleString()} / {denominator.toLocaleString()}{' '}
                      <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-xs ml-2">
                        = ₦{slope.toFixed(4)} slope per day
                      </span>
                    </p>
                    <span className="text-[10px] text-slate-500 font-bold block pt-1.5 font-sans leading-normal">
                      {slope > 0 ? (
                        <span className="text-green-700 font-extrabold">▲ Positive Slope: Sales are trending upwards across this observation period.</span>
                      ) : slope < 0 ? (
                        <span className="text-red-600 font-extrabold">▼ Negative Slope: Sales are trending downward across this observation period.</span>
                      ) : (
                        <span className="text-slate-600 font-extrabold">■ Neutral Slope: Flat sales curve detected.</span>
                      )}
                    </span>
                  </div>

                  <div className="bg-white border p-3.5 rounded-lg space-y-1">
                    <span className="font-black text-slate-500 uppercase text-[9px] block">Y-Intercept Formula Equation</span>
                    <p className="text-slate-950 font-bold">b = (Σy - m·Σx) / N</p>
                    <p className="text-slate-600 font-sans text-xs pt-1">Plugging in sandbox coefficients:</p>
                    <p className="font-extrabold text-slate-800">
                      b = ({sumY.toLocaleString()} - {slope.toFixed(4)} · {sumX}) / {n}
                    </p>
                    <p className="font-black text-slate-950 text-sm">
                      b = {(sumY - slope * sumX).toLocaleString()} / {n}
                      <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-xs ml-2">
                        = ₦{intercept.toFixed(4)} standard intercept
                      </span>
                    </p>
                  </div>

                  <div className="bg-purple-950 text-white border border-purple-900 p-5 rounded-lg space-y-1.5 font-sans">
                    <span className="font-black text-sky-400 uppercase tracking-widest text-[9px] block">Next Period Projection Prediction</span>
                    <h5 className="text-sm font-black flex items-center gap-1">
                      Day Index For Tomorrow (x) = <span className="text-yellow-300">{nextIndex}</span>
                    </h5>
                    <p className="font-mono text-sm font-bold text-slate-200">
                      Forecast Value = m · x + b <br />
                      Forecast Value = {slope.toFixed(4)} · {nextIndex} + {intercept.toFixed(4)}
                    </p>
                    <div className="bg-slate-900/40 p-3 rounded border border-purple-800 text-md font-extrabold mt-3 flex items-center gap-2">
                      <span className="text-slate-300 font-bold">Predicted Sales Target (Day {nextIndex}):</span>
                      <span className="text-green-400 font-black font-mono">
                        ₦{predictedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guide to reading the visual forecast charts */}
      <div className="bg-slate-100 border border-slate-350 rounded-xl p-6 font-sans space-y-4">
        <h3 className="text-base font-black text-slate-950 flex items-center gap-1.5">
          <Info size={16} className="text-slate-700" />
          Reading the Dashboard Trend Overlay
        </h3>
        <p className="text-slate-800 text-xs font-semibold leading-relaxed">
          When navigating to your <b>Dashboard</b>, TrackWise charts these exact curves dynamically in real-time. Look out for these indicators to optimize your procurement orders:
        </p>
        <div className="grid sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-slate-950 inline-block"></span>
              Solid Sales Curve
            </h4>
            <p className="text-slate-600 text-[11px] leading-normal">
              Represents your raw historical daily aggregate revenue. Highly volatile and depends on daily customer traffic.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-blue-600 mb-1 flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
              Moving Average Band
            </h4>
            <p className="text-slate-600 text-[11px] leading-normal">
              Indicates the local moving average. If this curve points upwards, it shows solid weekly consistency regardless of singular bad days.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-indigo-500 mb-1 flex items-center gap-1">
              <span className="w-3 h-3 bg-indigo-400 inline-block"></span>
              Dashed Regression Line
            </h4>
            <p className="text-slate-600 text-[11px] leading-normal">
              Illustrates systemic momentum trajectory. It shows your business's overall macro growth trend line across the entire chronological scope.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
