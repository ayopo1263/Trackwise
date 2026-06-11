export interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  user_id: string;
  created_at: string;
  product_name?: string; // Optional for joined queries
  customer_name?: string; // Customer name associated with transaction
}

export interface ForecastingResult {
  nextPeriodValue: number;
  trend: 'up' | 'down' | 'neutral';
  confidence?: number;
}
