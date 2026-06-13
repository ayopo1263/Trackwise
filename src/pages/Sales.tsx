import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Sale } from '../types';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2, 
  Search, 
  Calendar, 
  DollarSign, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ShoppingBag,
  FileText,
  Pencil,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import ReceiptModal from '../components/ReceiptModal';
import { addInventoryLog } from '../utils/inventoryLogger';

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [isOpenDropdown, setIsOpenDropdown] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  
  // Cart state for multi-product selection
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [cartError, setCartError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedReceiptSales, setSelectedReceiptSales] = useState<(Sale & { product_name?: string })[] | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');

  // Edit & Delete Transaction states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editItems, setEditItems] = useState<{ 
    saleId: string; 
    product_id: string; 
    product_name?: string; 
    quantity: number; 
    originalQuantity: number; 
    price: number;
    isDeleted?: boolean;
  }[]>([]);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<Transaction | null>(null);
  const [editTxError, setEditTxError] = useState<string | null>(null);
  const [updatingTx, setUpdatingTx] = useState<boolean>(false);

  const fetchBusinessName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.business_name) {
        setBusinessName(user.user_metadata.business_name);
      }
    } catch (err) {
      console.error('Error fetching dashboard user metadata:', err);
    }
  };

  const handleExportCSV = () => {
    if (sales.length === 0) return;
    const headers = ['Transaction ID', 'Date', 'Customer', 'Product', 'Quantity', 'Bill Total (₦)'];
    const rows = sales.map(s => [
      s.id,
      format(new Date(s.created_at), 'yyyy-MM-dd HH:mm:ss'),
      s.customer_name || 'Walk-in Customer',
      s.product_name || 'Deleted Product',
      s.quantity,
      s.total_price.toFixed(2)
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TrackWise_Sales_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, salesRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('sales').select('*').order('created_at', { ascending: false })
      ]);

      if (productsRes.error) throw productsRes.error;
      if (salesRes.error) throw salesRes.error;

      const prods = productsRes.data || [];
      const prodMap: Record<string, string> = {};
      prods.forEach((p: any) => {
        prodMap[p.id] = p.name;
      });

      setProducts(prods);
      setSales(salesRes.data?.map(s => {
        const localCustomer = localStorage.getItem(`trackwise_customer_name_${s.id}`);
        return {
          ...s,
          product_name: prodMap[s.product_id] || s.product_name,
          customer_name: s.customer_name || localCustomer || undefined
        };
      }) || []);
    } catch (err) {
      console.error('Error fetching sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBusinessName();
  }, []);

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    setCartError(null);
    setSuccessMessage(null);
    
    if (!customerName.trim()) {
      setCartError('Please input the Customer / Client Name (Step 1) before adding catalog items.');
      return;
    }

    if (!selectedProduct) {
      setCartError('Please search or choose a valid product first.');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    if (quantity <= 0) {
      setCartError('Please select a valid quantity of 1 or more.');
      return;
    }

    // Check existing count in cart
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    const existingQty = existingIndex >= 0 ? cart[existingIndex].quantity : 0;
    const newQty = existingQty + quantity;

    if (product.stock_quantity < newQty) {
      setCartError(`Insufficient stock for ${product.name}! Available: ${product.stock_quantity}, already in cart: ${existingQty}.`);
      return;
    }

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity = newQty;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantity }]);
    }

    // Reset simple add-to-form values
    setSelectedProduct('');
    setProductSearch('');
    setIsOpenDropdown(false);
    setQuantity(1);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    setCartError(null);
  };

  const handleUpdateCartQuantity = (productId: string, amount: number) => {
    setCartError(null);
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const targetQty = item.quantity + amount;
        if (targetQty < 1) return item;
        if (item.product.stock_quantity < targetQty) {
          setCartError(`Only ${item.product.stock_quantity} units of ${item.product.name} are available in stock.`);
          return item;
        }
        return { ...item, quantity: targetQty };
      }
      return item;
    }));
  };

  const handleClearCart = () => {
    setCart([]);
    setCartError(null);
    setSuccessMessage(null);
  };

  const handleRecordSale = async () => {
    if (cart.length === 0) {
      setCartError('Your sales cart is empty.');
      return;
    }

    if (!customerName.trim()) {
      setCartError('Customer / Client name is required to process the transaction.');
      return;
    }

    setSubmitting(true);
    setCartError(null);
    setSuccessMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to record transactions.');
      }

      // Re-fetch database stock levels to ensure consistency and prevent race conditions
      const { data: freshProducts, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      // Verify each cart item against fresh data
      for (const item of cart) {
        const freshProd = freshProducts?.find(p => p.id === item.product.id);
        if (!freshProd) {
          throw new Error(`Product "${item.product.name}" is no longer available in the database.`);
        }
        if (freshProd.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${item.product.name}"! Only ${freshProd.stock_quantity} available in stock.`);
        }
      }

      const savedCustomerName = customerName.trim();

      // 1. Bulk Record Sales
      const salesData = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        total_price: item.product.price * item.quantity,
        user_id: user.id,
        customer_name: savedCustomerName
      }));

      let { data: insertedRows, error: saleError } = await supabase
        .from('sales')
        .insert(salesData)
        .select();

      let usedFallback = false;
      if (saleError && (saleError.message?.includes('customer_name') || saleError.code === 'P0002' || saleError.code === '42703')) {
        console.warn('customer_name column does not exist in public.sales table. Falling back.');
        const backupSalesData = cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          total_price: item.product.price * item.quantity,
          user_id: user.id
        }));
        
        const fallbackRes = await supabase
          .from('sales')
          .insert(backupSalesData)
          .select();
          
        saleError = fallbackRes.error;
        insertedRows = fallbackRes.data;
        usedFallback = true;
      }

      if (saleError) throw saleError;

      // Map newly generated sale IDs with fallback customer name locally inside localStorage
      if (insertedRows && insertedRows.length > 0) {
        insertedRows.forEach(row => {
          localStorage.setItem(`trackwise_customer_name_${row.id}`, savedCustomerName);
        });
      }

      // 2. Sequential stock deductions and log them in inventory history
      for (const item of cart) {
        const freshProd = freshProducts!.find(p => p.id === item.product.id)!;
        const newStock = freshProd.stock_quantity - item.quantity;
        
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', item.product.id);

        if (stockError) throw stockError;

        // Add explicit entry to Audit History Log
        addInventoryLog(
          item.product.name,
          freshProd.stock_quantity,
          newStock,
          'Sale Deduction',
          `POS Unit (Cust: ${savedCustomerName})`
        );
      }

      // Beautiful clean success message
      setSuccessMessage(`Success! ${cart.length} line item(s) logged successfully for customer "${savedCustomerName}".`);
      setCart([]);
      setCustomerName('');
      await fetchData();

    } catch (err: any) {
      console.error('Error processing sales transaction:', err);
      setCartError(err.message || 'Failed to process recorded sales. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  interface Transaction {
    timestampId: string;
    items: (Sale & { product_name?: string })[];
    totalQuantity: number;
    totalPrice: number;
  }

  const transactions: Transaction[] = React.useMemo(() => {
    const groups: { [key: string]: (Sale & { product_name?: string })[] } = {};
    sales.forEach(sale => {
      const ts = sale.created_at;
      if (!groups[ts]) {
        groups[ts] = [];
      }
      groups[ts].push(sale);
    });

    return Object.keys(groups).map(ts => {
      const items = groups[ts];
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = items.reduce((sum, item) => sum + item.total_price, 0);
      return {
        timestampId: ts,
        items,
        totalQuantity,
        totalPrice
      };
    }).sort((a, b) => new Date(b.timestampId).getTime() - new Date(a.timestampId).getTime());
  }, [sales]);

  const startEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setEditCustomerName(tx.items[0]?.customer_name || 'Walk-in Customer');
    setEditItems(tx.items.map(item => {
      const matchingProduct = products.find(p => p.id === item.product_id);
      const unitPrice = matchingProduct ? matchingProduct.price : (item.quantity > 0 ? (item.total_price / item.quantity) : 0);
      return {
        saleId: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        originalQuantity: item.quantity,
        price: unitPrice,
        isDeleted: false
      };
    }));
    setEditTxError(null);
  };

  const handleSaveEditTransaction = async () => {
    const activeItems = editItems.filter(item => !item.isDeleted);
    if (activeItems.length === 0) {
      setEditTxError('At least one catalog item must remain active or use Delete entire Transaction instead.');
      return;
    }

    if (!editCustomerName.trim()) {
      setEditTxError('Customer / Client name is required.');
      return;
    }

    setUpdatingTx(true);
    setEditTxError(null);

    try {
      const { data: freshProducts, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      const updatedCustomerName = editCustomerName.trim();

      // Check stock
      for (const item of editItems) {
        if (item.isDeleted) continue;
        const changeQty = item.quantity - item.originalQuantity;
        if (changeQty > 0) {
          const freshProd = freshProducts?.find(p => p.id === item.product_id);
          if (!freshProd) {
            throw new Error(`Product "${item.product_name}" is missing.`);
          }
          if (freshProd.stock_quantity < changeQty) {
            throw new Error(`Insufficient stock for "${item.product_name}". Only ${freshProd.stock_quantity} available, requested extra +${changeQty}.`);
          }
        }
      }

      // Process DB
      for (const item of editItems) {
        const freshProd = freshProducts?.find(p => p.id === item.product_id);

        if (item.isDeleted) {
          if (freshProd) {
            const newStock = freshProd.stock_quantity + item.originalQuantity;
            await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product_id);
            addInventoryLog(
              item.product_name || 'Refunded Product',
              freshProd.stock_quantity,
              newStock,
              'Addition',
              `POS Sale Row Deleted (Cust: ${updatedCustomerName})`
            );
          }
          await supabase.from('sales').delete().eq('id', item.saleId);
          localStorage.removeItem(`trackwise_customer_name_${item.saleId}`);
        } else {
          const changeQty = item.quantity - item.originalQuantity;
          
          if (changeQty !== 0 && freshProd) {
            const newStock = freshProd.stock_quantity - changeQty;
            await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product_id);
            addInventoryLog(
              item.product_name || 'Adjusted Product',
              freshProd.stock_quantity,
              newStock,
              changeQty > 0 ? 'Sale Deduction' : 'Addition',
              `POS Transaction Adjusted (Cust: ${updatedCustomerName})`
            );
          }

          const { error: updateError } = await supabase
            .from('sales')
            .update({
              quantity: item.quantity,
              total_price: item.price * item.quantity,
              customer_name: updatedCustomerName
            })
            .eq('id', item.saleId);

          if (updateError) {
            await supabase
              .from('sales')
              .update({
                quantity: item.quantity,
                total_price: item.price * item.quantity
              })
              .eq('id', item.saleId);
          }
          localStorage.setItem(`trackwise_customer_name_${item.saleId}`, updatedCustomerName);
        }
      }

      setEditingTx(null);
      setSuccessMessage(`Success! Updated transaction details for customer "${updatedCustomerName}".`);
      await fetchData();

    } catch (err: any) {
      console.error('Error updating transaction:', err);
      setEditTxError(err.message || 'Failed to update transaction.');
    } finally {
      setUpdatingTx(false);
    }
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
    setUpdatingTx(true);
    try {
      const { data: freshProducts, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      const custName = tx.items[0]?.customer_name || 'Walk-in Customer';

      for (const item of tx.items) {
        const freshProd = freshProducts?.find(p => p.id === item.product_id);
        if (freshProd) {
          const newStock = freshProd.stock_quantity + item.quantity;
          await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product_id);
          addInventoryLog(
            item.product_name || 'Refunded Product',
            freshProd.stock_quantity,
            newStock,
            'Addition',
            `POS Total Reset (Cust: ${custName})`
          );
        }
        await supabase.from('sales').delete().eq('id', item.id);
        localStorage.removeItem(`trackwise_customer_name_${item.id}`);
      }

      setDeleteConfirmTx(null);
      setSuccessMessage(`Success! Deleted order receipt and refunded inventory for "${custName}".`);
      await fetchData();

    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction.');
    } finally {
      setUpdatingTx(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2">
            <ShoppingBag className="text-slate-800" size={28} />
            Sales Ledger
          </h1>
          <p className="text-slate-700 font-semibold mt-1">Add multiple products to record interactive, bulk-checked multi-item sales.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 lg:h-[calc(100vh-12rem)] lg:min-h-[550px] items-start">
        {/* Record Sale Container */}
        <div className="lg:col-span-1 lg:h-full lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]">
          <div className="bg-white border-2 border-slate-300 rounded-xl p-6 shadow-md space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 flex items-center gap-2">
                <ShoppingCart size={20} className="text-slate-800" />
                New Transaction
              </h2>
              <p className="text-xs text-slate-600 font-medium">Build a list of products to sell simultaneously</p>
            </div>

            {/* Error & Success Feeds */}
            <AnimatePresence>
              {cartError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold leading-normal flex gap-2 items-start"
                >
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{cartError}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-xs font-bold leading-normal flex gap-2 items-start"
                >
                  <CheckCircle2 size={16} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* STEP 1: CUSTOMER NAME AT THE TOP */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                1. Customer / Client Name
              </label>
              <input
                type="text"
                className="w-full text-xs font-bold border-2 border-slate-250 focus:border-slate-850 hover:border-slate-350 rounded-lg py-2 px-3 bg-white transition-colors"
                placeholder="Enter customer's full name..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Selector form (Step 2 and 3) */}
            <form onSubmit={handleAddToCart} className="space-y-4 pb-4 border-b border-slate-200">
              <div className="relative">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">2. Select Product</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Search size={15} />
                  </span>
                  <input
                    type="text"
                    required
                    className="w-full pl-9 pr-14 text-sm font-semibold border-2 border-slate-200 focus:border-slate-800 hover:border-slate-300 rounded-lg py-2 focus:ring-0 bg-white"
                    placeholder="Search/choose product..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsOpenDropdown(true);
                      
                      // Auto-bind selection if exactly matched
                      const match = products.find(p => p.name.toLowerCase() === e.target.value.toLowerCase().trim());
                      if (match) {
                        setSelectedProduct(match.id);
                      } else {
                        setSelectedProduct('');
                      }
                    }}
                    onFocus={() => setIsOpenDropdown(true)}
                  />
                  
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 font-sans">
                    {(productSearch || selectedProduct) && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch('');
                          setSelectedProduct('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 font-extrabold text-sm cursor-pointer"
                        title="Clear selection"
                      >
                        ×
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsOpenDropdown(!isOpenDropdown)}
                      className="p-1 text-slate-450 hover:text-slate-700 text-xs cursor-pointer focus:outline-none"
                    >
                      {isOpenDropdown ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* Dropdown suggestions wrapper */}
                {isOpenDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsOpenDropdown(false)}
                    />
                    <div className="absolute z-20 w-full mt-1.5 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto pr-1">
                      {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? (
                        <div className="p-4 text-xs text-slate-600 font-extrabold text-center bg-slate-50 text-slate-500">
                          No matching inventory items
                        </div>
                      ) : (
                        products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => {
                          const isSelected = p.id === selectedProduct;
                          const isOutOfStock = p.stock_quantity === 0;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => {
                                setSelectedProduct(p.id);
                                setProductSearch(p.name);
                                setIsOpenDropdown(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs font-bold border-b border-slate-100 last:border-0 transition-all flex justify-between items-center cursor-pointer ${
                                isSelected 
                                  ? 'bg-slate-900 text-white' 
                                  : isOutOfStock
                                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                    : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0 pr-2 col-span-3">
                                <p className="truncate font-bold">{p.name}</p>
                                <p className={`text-[10px] ${isSelected ? 'text-slate-350' : 'text-slate-500'} font-semibold font-mono`}>
                                  ₦{p.price.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                {isOutOfStock ? (
                                  <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Out of Stock</span>
                                ) : (
                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-850'}`}>
                                    {p.stock_quantity} Left
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">3. Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full text-sm font-semibold border-2 border-slate-200 focus:border-slate-800 hover:border-slate-300 rounded-lg"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="submit"
                    disabled={!selectedProduct}
                    className="w-full h-11 sm:h-[38px] bg-sky-50 text-sky-800 font-extrabold border-2 border-sky-200 hover:bg-sky-100 rounded-lg text-xs uppercase cursor-pointer flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} className="stroke-[3]" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Cart list section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-600" />
                  Sales Cart ({cart.length})
                </h3>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-[10px] uppercase font-black text-red-600 hover:underline cursor-pointer font-sans"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <ShoppingCart className="mx-auto text-slate-400 mb-2" size={24} />
                  <p className="text-xs font-semibold text-slate-600 leading-normal">
                    Sales cart is currently empty. Input customer name and add products above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div 
                      key={item.product.id} 
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center gap-2 animate-fade-in"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">{item.product.name}</div>
                        <div className="text-[10px] text-slate-500 font-semibold font-mono">
                          ₦{item.product.price.toFixed(2)} ea
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.product.id, -1)}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 hover:text-slate-950 transition-colors cursor-pointer"
                        >
                          <Minus size={10} className="stroke-[3]" />
                        </button>
                        <span className="text-xs font-black text-slate-950 w-4 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.product.id, 1)}
                          disabled={item.product.stock_quantity <= item.quantity}
                          className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 hover:text-slate-950 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <Plus size={10} className="stroke-[3]" />
                        </button>
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="flex items-center gap-2 flex-shrink-0 pl-1 text-right">
                        <div className="text-xs font-extrabold text-slate-900">
                          ₦{(item.product.price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded-xl">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-350 font-sans">Cart Total</span>
                    <span className="text-lg font-black tracking-tight font-mono">₦{cartTotal.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecordSale}
                    disabled={submitting}
                    className="w-full bg-slate-950 text-white font-extrabold py-3.5 rounded-xl hover:bg-slate-850 transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Processing Transactions...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={18} />
                        <span>Process Sale (₦{cartTotal.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sales History */}
        <div className="lg:col-span-2 lg:h-full lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]">
          <div className="bg-white border-2 border-slate-300 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-slate-250 flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-lg font-extrabold text-slate-950 flex items-center gap-2">
                <History size={20} className="text-slate-800" />
                History Log
              </h2>
              {sales.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles size={13} className="text-amber-400" />
                  Export CSV Log
                </button>
              )}
            </div>
            
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-slate-300" size={32} />
              </div>
            ) : sales.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-bold">
                No sales recorded yet.
              </div>
            ) : (
              <div>
                {/* Mobile View: Stacked Transaction list Cards */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <div key={tx.timestampId} className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-xs font-mono font-bold">
                          {format(new Date(tx.timestampId), 'MMM d, HH:mm')}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedReceiptSales(tx.items)}
                            className="px-2 py-1 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer border border-slate-200 hover:border-slate-300 transition-all inline-flex items-center gap-1 text-[10px] font-black uppercase font-sans"
                          >
                            <FileText size={12} />
                            <span>Receipt</span>
                          </button>
                          
                          <button
                            onClick={() => startEditTransaction(tx)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-150 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Edit Transaction"
                          >
                            <Pencil size={12} />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmTx(tx)}
                            className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                            title="Delete Transaction"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <span className="inline-block text-[10px] font-black text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase truncate">
                            {tx.items[0]?.customer_name || 'Walk-in Customer'}
                          </span>
                          <div className="space-y-1">
                            {tx.items.map((item, index) => (
                              <div key={item.id || index} className="text-xs text-slate-900 font-extrabold flex justify-between pr-4">
                                <span className="truncate pr-2">{item.product_name || 'Deleted Product'}</span>
                                <span className="text-slate-500 font-semibold whitespace-nowrap">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-[9px] text-slate-450 uppercase font-black block tracking-wider">Total</span>
                          <div className="text-sm font-black text-slate-950 font-mono">
                            ₦{tx.totalPrice.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold block bg-slate-100/50 px-1 py-0.5 rounded border border-slate-205 mt-1 text-center font-sans">
                            {tx.totalQuantity} items
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Full Grid Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Date</th>
                        <th className="table-header">Customer</th>
                        <th className="table-header">Products List</th>
                        <th className="table-header text-center flex-shrink-0">Qty</th>
                        <th className="table-header text-right">Total</th>
                        <th className="table-header text-center">Invoicing</th>
                        <th className="table-header text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.timestampId} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                          <td className="table-cell text-slate-500 text-xs font-semibold whitespace-nowrap">
                            {format(new Date(tx.timestampId), 'MMM d, HH:mm')}
                          </td>
                          <td className="table-cell font-extrabold text-slate-900 whitespace-nowrap">
                            <span className="text-xs font-black text-slate-950 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 uppercase">
                              {tx.items[0]?.customer_name || 'Walk-in Customer'}
                            </span>
                          </td>
                          <td className="table-cell font-bold text-slate-900">
                            <div className="space-y-1 py-1">
                              {tx.items.map((item, index) => (
                                <div key={item.id || index} className="text-xs text-slate-900 font-extrabold">
                                  {item.product_name || 'Deleted Product'}{" "}
                                  <span className="text-slate-500 font-bold ml-1 text-[10px]">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="table-cell text-center font-bold text-slate-850 font-sans">{tx.totalQuantity}</td>
                          <td className="table-cell text-right font-black text-slate-900 font-mono">
                            ₦{tx.totalPrice.toFixed(2)}
                          </td>
                          <td className="table-cell text-center">
                            <button
                              onClick={() => setSelectedReceiptSales(tx.items)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 cursor-pointer border border-slate-200 hover:border-slate-300 transition-all inline-flex items-center gap-1"
                              title="Generate Invoice Receipt"
                            >
                              <FileText size={14} />
                              <span className="text-[10px] font-black uppercase text-slate-700 font-sans">Receipt</span>
                            </button>
                          </td>
                          <td className="table-cell text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => startEditTransaction(tx)}
                                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 hover:border-slate-800 rounded-lg text-slate-800 hover:text-slate-950 transition-colors cursor-pointer text-[10px] font-extrabold uppercase flex items-center gap-1"
                                title="Edit Transaction"
                              >
                                <Pencil size={11} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteConfirmTx(tx)}
                                className="p-1 px-2 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg text-slate-500 hover:text-red-600 transition-colors cursor-pointer text-xs"
                                title="Delete Transaction"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice receipt modal feedback */}
      <AnimatePresence>
        {selectedReceiptSales && (
          <ReceiptModal 
            sales={selectedReceiptSales}
            businessName={businessName}
            onClose={() => setSelectedReceiptSales(null)}
          />
        )}
      </AnimatePresence>

      {/* 2. TRANSACTION EDIT DIAGNOSTICS OVERLAY MODAL */}
      {editingTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white border-4 border-slate-950 rounded-2xl p-6 shadow-2xl w-full max-w-xl relative duration-200">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-2 rounded-lg border">
                  <Pencil className="text-slate-700" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Correct Transaction</h3>
                  <p className="text-slate-500 text-[9px] font-bold">TIMELINE KEY: {format(new Date(editingTx.timestampId), 'yyyy-MM-dd HH:mm:ss')}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingTx(null)}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-lg transition-colors cursor-pointer border border-slate-250"
              >
                ✕
              </button>
            </div>

            {/* Error Indicators */}
            {editTxError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-semibold mb-4 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{editTxError}</span>
              </div>
            )}

            {/* Form Details */}
            <div className="space-y-4">
              {/* Customer input name */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  Customer / Client Name
                </label>
                <input 
                  type="text"
                  className="w-full text-xs font-bold border-2 border-slate-200 rounded-lg py-2 px-3 bg-slate-50 focus:bg-white focus:border-slate-850"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                />
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  Itemized Order Lines
                </label>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50">
                  {editItems.map((item, index) => {
                    const isDeleted = !!item.isDeleted;
                    const rowPrice = item.price * item.quantity;

                    return (
                      <div 
                        key={item.saleId || index}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border transition-all ${
                          isDeleted 
                            ? 'bg-red-50/40 border-red-200 opacity-60 line-through' 
                            : 'border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className={`font-extrabold text-xs ${isDeleted ? 'text-red-700' : 'text-slate-950'}`}>
                            {item.product_name || 'Deleted Product'}
                          </div>
                          <div className="text-[10px] text-slate-450 font-mono font-bold mt-0.5">
                            Unit Cost: ₦{item.price.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          {/* Math Adjuster */}
                          {!isDeleted ? (
                            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg bg-slate-50 p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditItems(prev => prev.map((itm, idx) => 
                                    idx === index ? { ...itm, quantity: Math.max(1, itm.quantity - 1) } : itm
                                  ));
                                }}
                                className="p-1 hover:bg-slate-250 bg-white border border-slate-200 font-extrabold rounded text-slate-800"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="text-xs font-mono font-black text-slate-900 w-6 text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditItems(prev => prev.map((itm, idx) => 
                                    idx === index ? { ...itm, quantity: itm.quantity + 1 } : itm
                                  ));
                                }}
                                className="p-1 hover:bg-slate-250 bg-white border border-slate-200 font-extrabold rounded text-slate-800"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-red-600 font-black uppercase tracking-wider">Marked for Delete</span>
                          )}

                          {/* Line total cost */}
                          <div className="text-right font-mono text-xs font-extrabold text-slate-900 min-w-16">
                            ₦{rowPrice.toFixed(2)}
                          </div>

                          {/* Action Delete/Restore checkbox button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditItems(prev => prev.map((itm, idx) => 
                                idx === index ? { ...itm, isDeleted: !itm.isDeleted } : itm
                              ));
                            }}
                            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                              isDeleted 
                                ? 'bg-green-55 hover:bg-green-100 border-green-200 text-green-700' 
                                : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-650'
                            }`}
                            title={isDeleted ? 'Restore line item' : 'Mark item as deleted'}
                          >
                            {isDeleted ? 'Restore' : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Total balance preview */}
            <div className="mt-5 p-3.5 bg-slate-950 text-white rounded-xl flex justify-between items-center font-sans">
              <span className="text-xs font-black uppercase tracking-wider text-slate-350">Revised Invoice Sum</span>
              <span className="text-md font-black font-mono text-emerald-400">
                ₦{editItems
                  .filter(i => !i.isDeleted)
                  .reduce((sum, i) => sum + (i.price * i.quantity), 0)
                  .toFixed(2)
                }
              </span>
            </div>

            {/* Action Save/Close button items */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                disabled={updatingTx}
                onClick={handleSaveEditTransaction}
                className="flex-1 bg-slate-950 hover:bg-slate-850 text-white font-black text-xs uppercase py-3 px-4 rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
              >
                {updatingTx ? 'Saving modifications...' : 'Confirm Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-4 py-3 bg-slate-50 border border-slate-350 hover:bg-slate-150 text-slate-700 font-black text-xs uppercase rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ENTIRE TRANSACTION DELETE CONFIRMATION ALERTS */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white border-4 border-red-600 rounded-2xl p-6 shadow-2xl w-full max-w-md relative duration-200 font-sans">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-red-600">
                <AlertCircle size={24} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-md font-black text-slate-950 uppercase tracking-tight">Delete Transaction?</h3>
                <p className="text-xs text-slate-500 font-bold">This operation is destructive and irreversible</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 font-semibold mb-4 leading-relaxed bg-red-50/40 p-3.5 rounded-xl border border-red-100">
              Are you sure you want to cancel and delete the recorded sale receipt for client{' '}
              <b className="text-red-750 uppercase">"{deleteConfirmTx.items[0]?.customer_name || 'Walk-in Customer'}"</b>? 
              This will automatically restore <b className="text-slate-950 font-black">{deleteConfirmTx.totalQuantity} items</b> back to active inventory stocks.
            </div>

            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 font-mono text-xs space-y-1 mb-6">
              <div>OrderID Timestamp: {format(new Date(deleteConfirmTx.timestampId), 'yyyy-MM-dd HH:mm')}</div>
              <div className="font-extrabold text-slate-900">Refunding Sum: ₦{deleteConfirmTx.totalPrice.toFixed(2)}</div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={updatingTx}
                onClick={() => handleDeleteTransaction(deleteConfirmTx)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase py-3 px-4 rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
              >
                {updatingTx ? 'Resetting Inventory...' : 'Yes, Delete Sale & Refund'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmTx(null)}
                className="px-4 py-3 bg-slate-50 border border-slate-300 hover:bg-slate-150 text-slate-700 font-black text-xs uppercase rounded-xl transition-colors cursor-pointer"
              >
                Keep File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
