import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  X, 
  AlertCircle, 
  Search, 
  Settings, 
  Check, 
  History, 
  User, 
  ClipboardList,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { addInventoryLog, getInventoryLogs, clearInventoryLogs, InventoryLog } from '../utils/inventoryLogger';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Deletion modal states
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteStaffName, setDeleteStaffName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  
  // Single product edit form state
  const [formData, setFormData] = useState({ name: '', price: '', stock: '' });
  
  // Batch insertion form state
  const [batchProducts, setBatchProducts] = useState<{ id: string; name: string; price: string; stock: string }[]>([
    { id: '1', name: '', price: '', stock: '' }
  ]);
  
  // Required staff name for accountability log
  const [staffName, setStaffName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search and custom stock limit thresholds states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [lowLimit, setLowLimit] = useState(() => {
    const saved = localStorage.getItem('trackwise_low_stock_limit');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [criticalLimit, setCriticalLimit] = useState(() => {
    const saved = localStorage.getItem('trackwise_critical_stock_limit');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [newLowLimit, setNewLowLimit] = useState(() => {
    const saved = localStorage.getItem('trackwise_low_stock_limit');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [newCriticalLimit, setNewCriticalLimit] = useState(() => {
    const saved = localStorage.getItem('trackwise_critical_stock_limit');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [savingLimits, setSavingLimits] = useState(false);

  // Inventory Change Log internal state
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);

  const mergedLogs = React.useMemo(() => {
    const localLogs = [...inventoryLogs];
    
    // Synthesize "Addition" logs for any product currently in the database that doesn't have an "Addition" or "Adjustment" entry in localLogs
    products.forEach(product => {
      const hasAddedLog = localLogs.some(
        log => log.productName.toLowerCase() === product.name.toLowerCase() && (log.actionType === 'Addition' || log.actionType === 'Adjustment')
      );
      
      if (!hasAddedLog) {
        localLogs.push({
          id: `db-synth-${product.id}`,
          createdAt: product.created_at || product.updated_at || new Date().toISOString(),
          productName: product.name,
          quantityBefore: 0,
          quantityAfter: product.stock_quantity,
          difference: product.stock_quantity,
          actionType: 'Addition',
          staffName: 'System Catalog'
        });
      }
    });

    return localLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [inventoryLogs, products]);

  const handleExportInventoryCSV = () => {
    if (mergedLogs.length === 0) return;
    const headers = ['Log ID', 'Date/Time', 'Catalog Product', 'Action Type', 'Qty Before', 'Qty After', 'Difference', 'Staff Member'];
    const rows = mergedLogs.map(log => [
      log.id,
      format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      log.productName,
      log.actionType,
      log.quantityBefore,
      log.quantityAfter,
      log.difference >= 0 ? `+${log.difference}` : log.difference,
      log.staffName
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TrackWise_Inventory_Audit_Log_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        if (user.user_metadata.low_stock_limit !== undefined) {
          const val = parseInt(user.user_metadata.low_stock_limit);
          setLowLimit(val);
          setNewLowLimit(val);
          localStorage.setItem('trackwise_low_stock_limit', val.toString());
        }
        if (user.user_metadata.critical_stock_limit !== undefined) {
          const val = parseInt(user.user_metadata.critical_stock_limit);
          setCriticalLimit(val);
          setNewCriticalLimit(val);
          localStorage.setItem('trackwise_critical_stock_limit', val.toString());
        }
      }
    } catch (err) {
      console.error('Error fetching user stock limits metadata:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshLogs = () => {
    setInventoryLogs(getInventoryLogs());
  };

  useEffect(() => {
    fetchProducts();
    fetchLimits();
    refreshLogs();
  }, []);

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLimits(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          low_stock_limit: newLowLimit,
          critical_stock_limit: newCriticalLimit
        }
      });
      if (error) throw error;
      setLowLimit(newLowLimit);
      setCriticalLimit(newCriticalLimit);
      localStorage.setItem('trackwise_low_stock_limit', newLowLimit.toString());
      localStorage.setItem('trackwise_critical_stock_limit', newCriticalLimit.toString());
      setIsEditingLimits(false);
    } catch (err: any) {
      alert('Error updating thresholds: ' + err.message);
    } finally {
      setSavingLimits(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) {
      alert('Representative Staff Member Name is compulsory to log auditing updates.');
      return;
    }
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be signed in to execute stock modifications.');

      if (editingProduct) {
        const productData = {
          name: formData.name.trim(),
          price: parseFloat(formData.price),
          stock_quantity: parseInt(formData.stock),
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;

        // Record log entry
        addInventoryLog(
          productData.name,
          editingProduct.stock_quantity,
          productData.stock_quantity,
          'Adjustment',
          staffName
        );
      } else {
        // Multi-product batch insert
        const validBatch = batchProducts.filter(p => p.name.trim() !== '');
        if (validBatch.length === 0) {
          throw new Error('Please fill in at least one product row with a valid name.');
        }

        const insertBatch = validBatch.map(p => ({
          name: p.name.trim(),
          price: parseFloat(p.price) || 0,
          stock_quantity: parseInt(p.stock) || 0,
          user_id: user.id,
          updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('products')
          .insert(insertBatch);
        if (error) throw error;

        // Record logs for each product added in the batch
        insertBatch.forEach(prod => {
          addInventoryLog(
            prod.name,
            0,
            prod.stock_quantity,
            'Addition',
            staffName
          );
        });
      }

      await fetchProducts();
      refreshLogs();
      closeModal();
    } catch (err: any) {
      alert('Error saving product: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteStaffName('');
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    if (!deleteStaffName.trim()) {
      setDeleteError('A valid staff operator name is required.');
      return;
    }

    setSubmitting(true);
    setDeleteError('');

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);
      if (error) throw error;

      // Log deletion activity
      addInventoryLog(
        productToDelete.name,
        productToDelete.stock_quantity,
        0,
        'Deletion',
        deleteStaffName.trim()
      );

      await fetchProducts();
      refreshLogs();
      setProductToDelete(null);
    } catch (err: any) {
      setDeleteError('Error deleting product. It might be linked to existing sales.');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (product?: Product) => {
    setStaffName('');
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        stock: product.stock_quantity.toString(),
      });
    } else {
      setEditingProduct(null);
      setBatchProducts([{ id: '1', name: '', price: '', stock: '' }]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', price: '', stock: '' });
    setBatchProducts([{ id: '1', name: '', price: '', stock: '' }]);
    setStaffName('');
  };

  const filteredProducts = React.useMemo(() => {
    const searchFiltered = products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [field, direction] = sortBy.split('-');
    return [...searchFiltered].sort((a, b) => {
      let comparison = 0;
      if (field === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (field === 'price') {
        comparison = a.price - b.price;
      } else if (field === 'stock') {
        comparison = a.stock_quantity - b.stock_quantity;
      } else if (field === 'updated') {
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [products, searchQuery, sortBy]);

  const handleUpdateBatchRow = (idx: number, field: 'name' | 'price' | 'stock', value: string) => {
    setBatchProducts(prev => prev.map((row, i) => {
      if (i === idx) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleAddBatchRow = () => {
    setBatchProducts(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), name: '', price: '', stock: '' }
    ]);
  };

  const handleRemoveBatchRow = (idx: number) => {
    if (batchProducts.length === 1) return;
    setBatchProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to purge all local inventory activity audit logs? This action is non-reversible.')) {
      clearInventoryLogs();
      refreshLogs();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-slate-800" size={28} />
            Products Inventory
          </h1>
          <p className="text-slate-700 font-bold mt-1">Manage your product catalog and custom safety stock levels.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsEditingLimits(prev => !prev)}
            className="px-4 py-2 bg-white text-slate-800 border-2 border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 font-bold cursor-pointer select-none"
          >
            <Settings size={18} className="text-slate-500" />
            Stock Levels Settings
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('inventory-activity-log');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-4 py-2 bg-white text-slate-800 border-2 border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 font-bold cursor-pointer select-none"
          >
            <History size={18} className="text-slate-500" />
            See Inventory Activity
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="bg-slate-900 text-white px-5 py-2 hover:bg-slate-800 border-2 border-slate-900 rounded-lg font-extrabold flex items-center gap-2 transition-colors cursor-pointer select-none"
          >
            <Plus size={20} />
            New Product
          </button>
        </div>
      </div>

      {isEditingLimits && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 border-2 border-slate-300 p-5 rounded-xl font-sans"
        >
          <h3 className="text-sm font-black text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Settings size={16} /> Customize Safety Stock Limits
          </h3>
          <form onSubmit={handleSaveLimits} className="grid sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase mb-1">
                Critical Threshold (Red Alert)
              </label>
              <input
                type="number"
                min="0"
                required
                className="w-full text-xs font-bold"
                placeholder="e.g. 0"
                value={newCriticalLimit}
                onChange={(e) => setNewCriticalLimit(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">Stock below or equal to this shows RED.</span>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase mb-1">
                Low Threshold (Yellow Warning)
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full text-xs font-bold"
                placeholder="e.g. 10"
                value={newLowLimit}
                onChange={(e) => setNewLowLimit(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">Stock below or equal to this (and &gt; Critical) shows YELLOW.</span>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingLimits}
                className="px-4 py-2 bg-slate-950 text-white rounded-lg font-black text-xs uppercase hover:bg-slate-850 transition-colors cursor-pointer disabled:opacity-55 flex-1 h-[38px] flex items-center justify-center gap-1"
              >
                {savingLimits ? 'Saving...' : 'Save Limits'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingLimits(false);
                  setNewCriticalLimit(criticalLimit);
                  setNewLowLimit(lowLimit);
                }}
                className="px-4 py-2 bg-white text-slate-850 border border-slate-300 rounded-lg font-black text-xs uppercase hover:bg-slate-50 transition-colors cursor-pointer flex-1 h-[38px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Search and Sort Dropdown Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full">
        {/* Search Input Control */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border-2 border-slate-250 focus:border-slate-800 focus:ring-0 text-sm font-semibold rounded-lg placeholder-slate-400"
            placeholder="Search products in inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sort Controls (identical design block to search bar) */}
        <div className="relative w-full max-w-md">
          <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border-2 border-slate-250 focus:border-slate-800 focus:ring-0 text-sm font-semibold rounded-lg bg-white appearance-none cursor-pointer outline-none text-slate-900"
          >
            <option value="name-asc">Sort: Alphabetical (A - Z)</option>
            <option value="name-desc">Sort: Alphabetical (Z - A)</option>
            <option value="price-asc">Sort: Price (Low to High)</option>
            <option value="price-desc">Sort: Price (High to Low)</option>
            <option value="stock-asc">Sort: Stock Quantity (Low to High)</option>
            <option value="stock-desc">Sort: Stock Quantity (High to Low)</option>
            <option value="updated-desc">Sort: Last Updated (Newest)</option>
            <option value="updated-asc">Sort: Last Updated (Oldest)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 grid place-items-center">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <Package className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900">No products yet</h3>
          <p className="text-slate-500 mb-6">Start by adding your first product to the inventory.</p>
          <button
            onClick={() => openModal()}
            className="text-slate-900 font-semibold hover:underline"
          >
            Add Product →
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <Search className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900">No search results</h3>
          <p className="text-slate-500">We couldn't find any products matching "{searchQuery}" in your catalog.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Price</th>
                  <th className="table-header">In Stock</th>
                  <th className="table-header">Last Updated</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell font-bold text-slate-950">{product.name}</td>
                    <td className="table-cell font-mono font-bold text-slate-900">₦{product.price.toFixed(2)}</td>
                    <td className="table-cell">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        product.stock_quantity > lowLimit 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : product.stock_quantity > criticalLimit 
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-250' 
                            : 'bg-red-50 text-red-700 border border-red-250'
                      }`}>
                        {product.stock_quantity} units
                      </span>
                    </td>
                    <td className="table-cell text-slate-500 font-semibold">
                      {format(new Date(product.updated_at), 'MMM d, yyyy')}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(product)}
                          className="p-2 text-slate-500 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                        >
                          <Trash2 size={18} />
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

      {/* Audit Log Section */}
      <div id="inventory-activity-log" className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
              <History size={18} className="text-slate-800" />
              Inventory Activity Audit Log
            </h2>
            <p className="text-xs text-slate-600 font-medium">Tracks additions, stock level adjustments, sales deductions, and deletions.</p>
          </div>
          {mergedLogs.length > 0 && (
            <button
              onClick={handleExportInventoryCSV}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm flex items-center gap-1.5"
            >
              Export Log File
            </button>
          )}
        </div>

        {mergedLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-500 font-bold text-xs bg-white">
            No stock updates recorded yet in the audit sequence logs.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 bg-slate-50 text-[10px] uppercase font-black text-slate-500 leading-none">Date/Time</th>
                  <th className="px-4 py-3 bg-slate-50 text-[10px] uppercase font-black text-slate-500 leading-none">Catalog Product</th>
                  <th className="px-4 py-3 bg-slate-50 text-[10px] uppercase font-black text-slate-500 leading-none text-center">Action Type</th>
                  <th className="px-4 py-3 bg-slate-50 text-[10px] uppercase font-black text-slate-500 leading-none text-center">Quantity Delta</th>
                  <th className="px-4 py-3 bg-slate-50 text-[10px] uppercase font-black text-slate-500 leading-none">Updated By (Staff)</th>
                </tr>
              </thead>
              <tbody>
                {mergedLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 font-semibold">
                      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 text-xs font-extrabold text-slate-900">
                      {log.productName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider leading-none select-none ${
                        log.actionType === 'Addition'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : log.actionType === 'Adjustment'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : log.actionType === 'Sale Deduction'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-mono font-bold text-slate-950">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-slate-400 font-medium text-[10px]">({log.quantityBefore})</span>
                        <span>→</span>
                        <span className={log.difference >= 0 ? 'text-green-600 font-extrabold' : 'text-red-500 font-extrabold'}>
                          {log.quantityAfter}
                        </span>
                        <span className={`text-[10px] font-bold ${log.difference >= 0 ? 'text-green-600 bg-green-50/50' : 'text-red-600 bg-red-50/50'} px-1.5 py-0.5 rounded`}>
                          {log.difference >= 0 ? `+${log.difference}` : log.difference}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded font-black text-slate-800">
                        <User size={10} className="text-slate-600" />
                        {log.staffName}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h2 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                  <ClipboardList size={20} className="text-slate-800" />
                  {editingProduct ? 'Edit Product Item' : 'New Products Registry (Batch Mode)'}
                </h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-900 cursor-pointer p-1">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-1 flex-grow pb-4">
                {/* COMPULSORY STAFF OPERATOR NAME */}
                <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-1.5">
                  <label className="block text-xs font-black text-slate-850 uppercase tracking-wider">
                    Auditor Staff Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full text-xs font-bold border-2 border-slate-250 focus:border-slate-850 rounded-lg py-2 px-3"
                    placeholder="Enter your authorized staff name (e.g. Sandra Manager)..."
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                  />
                </div>

                {editingProduct ? (
                  /* SINGLE EDIT MODE FORM */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">Product Catalog Name</label>
                      <input
                        type="text"
                        required
                        className="w-full text-xs font-bold"
                        placeholder="e.g. Wireless Mouse"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">Price per unit (₦)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          className="w-full text-xs font-bold font-mono"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">In Stock Quantity</label>
                        <input
                          type="number"
                          required
                          className="w-full text-xs font-bold"
                          placeholder="0"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* BATCH INSERT NEW PRODUCTS MODE FORM */
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Product Addition Rows</h3>
                      <button
                        type="button"
                        onClick={handleAddBatchRow}
                        className="text-xs bg-slate-900 border border-slate-900 text-white font-black px-2.5 py-1.5 rounded-lg hover:bg-slate-800 uppercase tracking-wider select-none cursor-pointer"
                      >
                        + Add Form Row
                      </button>
                    </div>

                    <div className="space-y-4">
                      {batchProducts.map((row, idx) => (
                        <div 
                          key={row.id} 
                          className="p-4 bg-white border border-slate-200 rounded-xl relative space-y-3 shadow-inner hover:border-slate-350 transition-colors group"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Product Item #{idx + 1}</span>
                            {batchProducts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBatchRow(idx)}
                                className="text-[10px] text-red-500 font-black hover:underline cursor-pointer flex items-center gap-0.5 uppercase tracking-wider"
                              >
                                Delete Row
                              </button>
                            )}
                          </div>

                          <div className="grid md:grid-cols-6 gap-3">
                            <div className="md:col-span-3">
                              <label className="block text-[9px] font-black text-slate-450 uppercase mb-1">Product Name</label>
                              <input
                                type="text"
                                required
                                className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50/50"
                                placeholder="e.g. High-density Toner Cartridges"
                                value={row.name}
                                onChange={(e) => handleUpdateBatchRow(idx, 'name', e.target.value)}
                              />
                            </div>
                            <div className="md:col-span-2 grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-black text-slate-450 uppercase mb-1">Price (₦)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  min="0"
                                  className="w-full text-xs font-semibold py-1.5 px-2 font-mono bg-slate-50/50"
                                  placeholder="0.00"
                                  value={row.price}
                                  onChange={(e) => handleUpdateBatchRow(idx, 'price', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-slate-450 uppercase mb-1">Stock Qty</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50/50"
                                  placeholder="0"
                                  value={row.stock}
                                  onChange={(e) => handleUpdateBatchRow(idx, 'stock', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBatchRow}
                      className="w-full py-3.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:text-slate-900 font-black text-xs uppercase hover:bg-slate-50 hover:border-slate-450 transition-all select-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Append Another Product Row
                    </button>
                  </div>
                )}

                <div className="pt-4 flex-shrink-0">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-slate-950 text-white font-extrabold py-3.5 rounded-xl hover:bg-slate-850 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Saving modifications...</span>
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        <span>{editingProduct ? 'Commit Product Update' : `Register ${batchProducts.filter(p => p.name.trim() !== '').length} New Products`}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Deletion Accountability Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 font-sans">
          <div className="bg-white border-4 border-slate-950 rounded-2xl p-6 shadow-2xl w-full max-w-sm relative duration-200">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-red-50 p-2 rounded-lg border border-red-200 text-red-600">
                  <Trash2 size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Delete Product</h3>
                  <p className="text-slate-500 text-[9px] font-bold">PERMANENT DELETION PURGE</p>
                </div>
              </div>
              <button 
                onClick={() => setProductToDelete(null)}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-lg transition-colors cursor-pointer border border-slate-250"
              >
                ✕
              </button>
            </div>

            {/* Warn Info */}
            <div className="text-xs text-slate-700 font-semibold mb-4 leading-relaxed bg-red-50/40 p-3.5 rounded-xl border border-red-100">
              Are you absolutely sure you want to permanently delete <b className="text-red-750 font-black uppercase">"{productToDelete.name}"</b> from the system catalog? This will void all audit trails for this product record.
            </div>

            {/* Error Message */}
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-semibold mb-4 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Input fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  Staff / Operator Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    required
                    placeholder="Type name to authorize..."
                    className="w-full pl-9 pr-3 py-2 border-2 border-slate-200 rounded-lg text-xs font-bold bg-slate-50 focus:bg-white focus:border-slate-850 outline-none"
                    value={deleteStaffName}
                    onChange={(e) => setDeleteStaffName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={confirmDelete}
                className="flex-1 bg-slate-950 hover:bg-slate-850 text-white font-black text-xs uppercase py-3 px-4 rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
              >
                {submitting ? 'Purging Product Catalogue...' : 'Yes, Delete Product'}
              </button>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-3 bg-slate-50 border border-slate-350 hover:bg-slate-150 text-slate-700 font-black text-xs uppercase rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Package({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m7.5 4.27 9 5.15" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  );
}
