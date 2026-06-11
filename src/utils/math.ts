/**
 * AI Forecasting Utilities
 */

/**
 * Simple Moving Average (SMA)
 * Formula: SMA = (x1 + x2 + ... + xn) / n
 */
export function calculateSMA(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const window = data.slice(-period);
  const sum = window.reduce((acc, val) => acc + val, 0);
  return sum / window.length;
}

/**
 * Simple Linear Regression
 * y = mx + b
 */
export function calculateLinearRegression(data: number[]): { slope: number; intercept: number; predict: (x: number) => number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, predict: (x: number) => data[0] || 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i + 1; // Time values: 1, 2, 3...
    const y = data[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
    predict: (nextX: number) => slope * nextX + intercept,
  };
}

/**
 * Group sales by day for forecasting
 */
export function groupSalesByDate(sales: { created_at: string; total_price: number }[]): { date: string; amount: number }[] {
  const grouped: Record<string, number> = {};
  
  sales.forEach(sale => {
    const date = sale.created_at.split('T')[0];
    grouped[date] = (grouped[date] || 0) + sale.total_price;
  });

  return Object.entries(grouped)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
