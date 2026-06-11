# Supabase Database Schema Setup

To use this application, you need to create the following tables in your Supabase project's SQL Editor.

### 1. Enable RLS (Recommended)
This application assumes Row Level Security is configured such that users can only see and manage their own data.

### 2. Products Table
```sql
create table public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price decimal not null,
  stock_quantity integer not null default 0,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.products enable row level security;

-- Policy: Users can manage their own products
create policy "Users can manage their own products" 
on public.products for all 
using (auth.uid() = user_id);
```

### 3. Sales Table
```sql
create table public.sales (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete restrict not null,
  quantity integer not null,
  total_price decimal not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  customer_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: For existing setups, if you already have the sales table, run this in your SQL Editor:
-- ALTER TABLE public.sales ADD COLUMN customer_name text;

-- Enable RLS
alter table public.sales enable row level security;

-- Policy: Users can manage their own sales
create policy "Users can manage their own sales" 
on public.sales for all 
using (auth.uid() = user_id);
```

### 4. Setup Environment Variables
Don't forget to add your Supabase URL and Anon Key to the environment variables in AI Studio (or your local `.env` file).
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
