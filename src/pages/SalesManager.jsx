import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  Zap,
  Tag,
  Trash2,
  Loader2,
  RefreshCcw,
  Plus,
  TrendingDown,
  AlertCircle,
  Calendar,
  Hash,
  DollarSign
} from 'lucide-react';
import { logAction } from '../lib/logger';

export default function SalesManager() {
  const [activeTab, setActiveTab] = useState('bulk');

  return (
    <div className="max-w-6xl mx-auto space-y-6 mb-20">
      <Toaster position="top-right" richColors />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Marketing & Sales</h1>
        <p className="text-slate-500">Manage coupons, run campaigns, and track active discounts.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('bulk')}
          className={`pb-3 px-1 text-sm font-medium transition-all border-b-2 ${activeTab === 'bulk' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}
        >
          Product Sales
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`pb-3 px-1 text-sm font-medium transition-all border-b-2 ${activeTab === 'coupons' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}
        >
          Coupon Codes
        </button>
      </div>

      {activeTab === 'bulk' ? <BulkSalesPanel /> : <CouponsPanel />}
    </div>
  );
}

// --- SUB-COMPONENT 1: BULK SALES PANEL ---
function BulkSalesPanel() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [percent, setPercent] = useState(10);
  const [activeSales, setActiveSales] = useState([]);
  const [fetchingSales, setFetchingSales] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchActiveSales();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    setCategories(data || []);
  };

  const fetchActiveSales = async () => {
    setFetchingSales(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`id, price, sale_price, category:categories(id, name)`)
        .eq('is_on_sale', true)
        .eq('is_active', true);

      if (error) throw error;

      const grouped = (data || []).reduce((acc, product) => {
        const catName = product.category?.name || 'Uncategorized';
        const catId = product.category?.id || 'unknown';
        if (!acc[catId]) {
          acc[catId] = { id: catId, name: catName, count: 0, totalDiscountPct: 0 };
        }
        const discount = 100 - ((product.sale_price / product.price) * 100);
        acc[catId].count += 1;
        acc[catId].totalDiscountPct += discount;
        return acc;
      }, {});

      setActiveSales(Object.values(grouped).map(group => ({
        ...group,
        avgDiscount: Math.round(group.totalDiscountPct / group.count)
      })));

    } catch (e) { console.error(e); }
    finally { setFetchingSales(false); }
  };

  const stopCategorySale = async (catId) => {
    if (!window.confirm("Stop the sale for this category? Prices will revert to normal.")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('products').update({ is_on_sale: false, sale_price: null }).eq('category_id', catId);
      if (error) throw error;
      await logAction('DELETE', 'Sale', `Removed sale for category ID: ${catId}`, { categoryId: catId });
      toast.success("Category sale stopped.");
      fetchActiveSales();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleCategorySale = async () => {
    if (!selectedCat) return toast.error("Please select a category");
    if (percent <= 0 || percent >= 100) return toast.error("Invalid percentage");
    if (!window.confirm(`Apply ${percent}% OFF to ALL active products in this category?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc('apply_category_discount', { target_category_id: selectedCat, discount_percent: parseFloat(percent) });
      if (error) throw error;
      await logAction('CREATE', 'Sale', `Launched ${percent}% sale for category ID: ${selectedCat}`, { categoryId: selectedCat, percent });
      toast.success("Sale live!");
      setPercent(10); setSelectedCat(''); fetchActiveSales();
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

const handleClearAll = async () => {
    if (!window.confirm("DANGER: This will remove ALL discounts from the entire store. Continue?")) return;

    setLoading(true);
    try {
      // FIX: We replace .rpc() with a direct update that includes a "dummy" filter.
      // .not('id', 'is', null) creates a "WHERE id IS NOT NULL" clause.
      // This satisfies the database safety check while still selecting every product.
      const { error } = await supabase
        .from('products')
        .update({ is_on_sale: false, sale_price: null })
        .not('id', 'is', null);

      if (error) throw error;
      await logAction('DELETE', 'Sale', 'Emergency Reset: Removed all discounts from store');
      toast.success("Store prices reset. All discounts removed.");
      fetchActiveSales();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to reset prices");
    }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Zap size={20} /></div>
            <h2 className="text-lg font-semibold text-slate-900">Launch New Sale</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Category</label>
                <select className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Off %</label>
                <div className="relative mt-1">
                  <input type="number" min="0" value={percent} onChange={(e) => setPercent(e.target.value)} className="w-full pl-3 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                </div>
              </div>
            </div>
            <button onClick={handleCategorySale} disabled={loading} className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all">{loading ? <Loader2 className="animate-spin" size={18} /> : "Apply Discount"}</button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertCircle size={20} /></div>
              <h2 className="text-lg font-semibold text-slate-900">Emergency Stop</h2>
            </div>
            <p className="text-sm text-slate-500">Instantly remove all discounts from every product in the store.</p>
          </div>
          <button onClick={handleClearAll} disabled={loading} className="w-full mt-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-lg flex items-center justify-center gap-2 transition-all">{loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />} Reset Store Prices</button>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingDown className="text-emerald-600" /> Current Active Discounts</h3>

        {/* FIXED: Added overflow-x-auto wrapper here */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {fetchingSales ? <div className="p-8 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div> : activeSales.length === 0 ? <div className="p-8 text-center text-slate-400">No active sales running.</div> : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <tr><th className="px-6 py-3">Category</th><th className="px-6 py-3">Items</th><th className="px-6 py-3">Avg. Discount</th><th className="px-6 py-3 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{sale.name}</td>
                      <td className="px-6 py-4 text-slate-600"><span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-medium text-xs">{sale.count} products</span></td>
                      <td className="px-6 py-4 text-emerald-600 font-bold">~{sale.avgDiscount}% Off</td>
                      <td className="px-6 py-4 text-right"><button onClick={() => stopCategorySale(sale.id)} className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline">Stop Sale</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT 2: COUPONS MANAGER (Unchanged) ---
function CouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Updated State for all fields
  const [formData, setFormData] = useState({
    code: '',
    value: '',
    type: 'percentage',
    minOrder: '',
    maxUses: '',
    expiry: ''
  });

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.value) return toast.error("Code and Value are required");

    const payload = {
      code: formData.code.toUpperCase(),
      value: parseFloat(formData.value),
      discount_type: formData.type,
      min_order_amount: formData.minOrder ? parseFloat(formData.minOrder) : 0,
      max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
      expires_at: formData.expiry ? new Date(formData.expiry).toISOString() : null,
      is_active: true
    };

    const { error } = await supabase.from('coupons').insert(payload);

    if (error) {
      toast.error(error.message);
    } else {
      await logAction('CREATE', 'Coupon', `Created coupon: ${payload.code}`, payload);
      toast.success("Coupon created successfully!");
      setIsCreating(false);
      setFormData({ code: '', value: '', type: 'percentage', minOrder: '', maxUses: '', expiry: '' });
      fetchCoupons();
    }
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm("Permanently delete this coupon?")) return;
    await logAction('DELETE', 'Coupon', `Deleted coupon ID: ${id}`);
    await supabase.from('coupons').delete().eq('id', id);
    fetchCoupons();
  };

  const toggleStatus = async (id, status) => {
    await supabase.from('coupons').update({ is_active: !status }).eq('id', id);
    fetchCoupons();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Active Coupons</h3>
        <button onClick={() => setIsCreating(!isCreating)} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg flex items-center gap-2">
          <Plus size={16} /> Create New
        </button>
      </div>

      {isCreating && (
        <form onSubmit={createCoupon} className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">New Coupon Details</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            {/* 1. CODE */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Coupon Code *</label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  className="w-full pl-9 p-2 rounded-lg border border-slate-200 uppercase font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder="SUMMER20"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* 2. TYPE */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Discount Type *</label>
              <select
                className="w-full p-2 rounded-lg border border-slate-200 bg-white text-sm"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Flat Amount (₹)</option>
              </select>
            </div>

            {/* 3. VALUE */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Value *</label>
              <input
                type="number"
                min="0"
                className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                placeholder="20"
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>

            {/* 4. MIN ORDER */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Min Order Amount (₹)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="number"
                  min="0"
                  className="w-full pl-9 p-2 rounded-lg border border-slate-200 text-sm"
                  placeholder="0"
                  value={formData.minOrder}
                  onChange={e => setFormData({ ...formData, minOrder: e.target.value })}
                />
              </div>
            </div>

            {/* 5. MAX USES */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Usage Limit</label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="number"
                  min="0"
                  className="w-full pl-9 p-2 rounded-lg border border-slate-200 text-sm"
                  placeholder="Unlimited"
                  value={formData.maxUses}
                  onChange={e => setFormData({ ...formData, maxUses: e.target.value })}
                />
              </div>
            </div>

            {/* 6. EXPIRY */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Expiry Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="datetime-local"
                  className="w-full pl-9 p-2 rounded-lg border border-slate-200 text-sm text-slate-600"
                  value={formData.expiry}
                  onChange={e => setFormData({ ...formData, expiry: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-all">Save Coupon</button>
            <button type="button" onClick={() => setIsCreating(false)} className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Discount</th>
                <th className="px-6 py-3">Min Order</th>
                <th className="px-6 py-3">Limits</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-slate-400">No coupons found.</td></tr> : coupons.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-bold font-mono text-slate-700">{c.code}</div>
                    {c.expires_at && <div className="text-[10px] text-slate-400">Expires: {new Date(c.expires_at).toLocaleDateString()}</div>}
                  </td>
                  <td className="px-6 py-4 font-medium text-emerald-600">{c.discount_type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</td>
                  <td className="px-6 py-4 text-slate-500">{c.min_order_amount > 0 ? `₹${c.min_order_amount}` : '-'}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {c.max_uses ? (
                      <span className="flex items-center gap-1">
                        {c.uses_count} / {c.max_uses} used
                      </span>
                    ) : '∞'}
                  </td>
                  <td className="px-6 py-4"><button onClick={() => toggleStatus(c.id, c.is_active)} className={`px-2 py-1 rounded text-xs font-bold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.is_active ? 'Active' : 'Inactive'}</button></td>
                  <td className="px-6 py-4 text-right"><button onClick={() => deleteCoupon(c.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}