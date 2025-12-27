import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Search,
  Edit2,
  ChevronDown,
  ChevronUp,
  Package,
  Filter,
  Eye,
  EyeOff,
  Archive,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  Tag,
  Globe,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProductId, setExpandedProductId] = useState(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    fabric: '',
    design: '',
    tag: '', // New Filter
    status: '' // New Filter: 'active', 'archived', 'on_sale'
  });
  const [sortConfig, setSortConfig] = useState('newest');

  // Fetch Data
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          fabric:fabrics(name),
          design:designs(name),
          costs:product_costs(cost_price),
          product_tags(
            tag:tags(name)
          ),
          variants:product_variants(
            id,
            color_id,
            stock_quantity,
            size:sizes(name),
            color:colors(name, hex_code)
          ),
          images:product_images(image_url, is_primary, color_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Flatten tags for easier usage
      const cleanedData = (data || []).map(p => ({
        ...p,
        tagsList: p.product_tags?.map(pt => pt.tag?.name).filter(Boolean) || [],
        cost_price: p.costs?.[0]?.cost_price || 0 // Handle array return from join
      }));

      setProducts(cleanedData);
    } catch (error) {
      toast.error('Error loading products');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get Total Stock
  const getTotalStock = (product) => {
    return product.variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0;
  };

  // Helper: Calculate Margin
  const getMargin = (price, cost) => {
    if (!cost || !price) return null;
    const profit = price - cost;
    const margin = (profit / price) * 100;
    return { profit, margin: margin.toFixed(1) };
  };

  // Helper: Toggle Status
  const toggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
      toast.success(currentStatus ? 'Product hidden' : 'Product published');
    } catch (error) { toast.error('Could not update status'); }
  };

  // Helper: Archive
  const handleArchive = async (id, name) => {
    if (!window.confirm(`Archive "${name}"? Stock will be reset to 0.`)) return;
    try {
      await supabase.from('products').update({ is_active: false }).eq('id', id);
      await supabase.from('product_variants').update({ stock_quantity: 0 }).eq('product_id', id);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: false, variants: p.variants.map(v => ({ ...v, stock_quantity: 0 })) } : p));
      toast.success("Archived");
    } catch (error) { toast.error("Error archiving"); }
  };

  // --- DERIVED DATA & FILTER LOGIC ---
  const options = useMemo(() => {
    const getOptions = (key, nestedKey) => [...new Set(products.map(p => nestedKey ? p[key]?.[nestedKey] : p[key]).filter(Boolean))].sort();
    const allTags = [...new Set(products.flatMap(p => p.tagsList))].sort();

    return {
        categories: getOptions('category', 'name'),
        fabrics: getOptions('fabric', 'name'),
        designs: getOptions('design', 'name'),
        tags: allTags
    };
  }, [products]);

  const processedProducts = useMemo(() => {
    let result = products.filter(p => {
      // Search
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.tagsList.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filters
      const matchesCategory = !filters.category || p.category?.name === filters.category;
      const matchesFabric = !filters.fabric || (p.fabric?.name || p.fabric) === filters.fabric;
      const matchesDesign = !filters.design || (p.design?.name || p.design) === filters.design;
      const matchesTag = !filters.tag || p.tagsList.includes(filters.tag);

      let matchesStatus = true;
      if (filters.status === 'active') matchesStatus = p.is_active;
      if (filters.status === 'archived') matchesStatus = !p.is_active;
      if (filters.status === 'on_sale') matchesStatus = p.is_on_sale;

      return matchesSearch && matchesCategory && matchesFabric && matchesDesign && matchesTag && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
        switch (sortConfig) {
            case 'price_asc': return (a.is_on_sale ? a.sale_price : a.price) - (b.is_on_sale ? b.sale_price : b.price);
            case 'price_desc': return (b.is_on_sale ? b.sale_price : b.price) - (a.is_on_sale ? a.sale_price : a.price);
            case 'stock_asc': return getTotalStock(a) - getTotalStock(b);
            case 'stock_desc': return getTotalStock(b) - getTotalStock(a);
            case 'newest': default: return new Date(b.created_at) - new Date(a.created_at);
        }
    });
    return result;
  }, [products, searchTerm, filters, sortConfig]);

  const clearFilters = () => {
    setFilters({ category: '', fabric: '', design: '', tag: '', status: '' });
    setSearchTerm('');
    setSortConfig('newest');
  };

  return (
    <div className="space-y-6 mb-20">
      <Toaster position="top-right" richColors />

      {/* Header & Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
              <p className="text-slate-500">Manage catalog, pricing, and stock levels.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative grow md:grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search products, tags..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full md:w-64" />
                </div>

                <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${showFilters || Object.values(filters).some(Boolean) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {showFilters ? <X size={18} /> : <Filter size={18} />} Filters
                </button>

                <div className="relative">
                    <select value={sortConfig} onChange={(e) => setSortConfig(e.target.value)} className="pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 appearance-none cursor-pointer hover:bg-slate-50">
                        <option value="newest">Newest First</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="stock_desc">Stock: High to Low</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-in slide-in-from-top-2">
                <div className="flex justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><SlidersHorizontal size={16} /> Active Filters</h3>
                    <button onClick={clearFilters} className="text-xs text-indigo-600 hover:underline">Clear All</button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Category */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Category</label>
                        <select value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                            <option value="">All</option>
                            {options.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    {/* Status */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                        <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="on_sale">On Sale</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                    {/* Tags */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Tags</label>
                        <select value={filters.tag} onChange={(e) => setFilters({...filters, tag: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                            <option value="">All Tags</option>
                            {options.tags.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                     {/* Fabric */}
                     <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">Fabric</label>
                        <select value={filters.fabric} onChange={(e) => setFilters({...filters, fabric: e.target.value})} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                            <option value="">All</option>
                            {options.fabrics.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Pricing</th>
                <th className="px-6 py-4">Category / Tags</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : processedProducts.length === 0 ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-500">No products found.</td></tr>
              ) : (
                processedProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr className={`hover:bg-slate-50/50 transition-colors ${!product.is_active ? 'opacity-60 bg-slate-50' : ''}`}>

                      {/* 1. Product Name & Image */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                            {product.images?.find(img => img.is_primary)?.image_url ? (
                              <img src={product.images.find(img => img.is_primary).image_url} className="w-full h-full object-cover" />
                            ) : <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20} /></div>}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{product.name}</div>
                            <div className="text-[10px] text-slate-400">SKU: {product.id.slice(0,6)}...</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Pricing (Smart Display) */}
                      <td className="px-6 py-4">
                        {product.is_on_sale ? (
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-emerald-600">₹{product.sale_price}</span>
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">SALE</span>
                                </div>
                                <span className="text-xs text-slate-400 line-through">₹{product.price}</span>
                            </div>
                        ) : (
                            <span className="font-medium text-slate-900">₹{product.price}</span>
                        )}
                      </td>

                      {/* 3. Category & Tags */}
                      <td className="px-6 py-4">
                        <div className="text-slate-600 font-medium mb-1">{product.category?.name}</div>
                        <div className="flex flex-wrap gap-1">
                            {product.tagsList.slice(0, 3).map(t => (
                                <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">{t}</span>
                            ))}
                            {product.tagsList.length > 3 && <span className="text-[10px] text-slate-400">+{product.tagsList.length - 3}</span>}
                        </div>
                      </td>

                      {/* 4. Stock */}
                      <td className="px-6 py-4 text-center">
                         <button onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all ${expandedProductId === product.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                           {getTotalStock(product)} <ChevronDown size={12} className={`transition-transform ${expandedProductId === product.id ? 'rotate-180' : ''}`} />
                         </button>
                      </td>

                      {/* 5. Status Toggle */}
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => toggleStatus(product.id, product.is_active)} title={product.is_active ? "Hide Product" : "Publish Product"}>
                            {product.is_active
                                ? <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100"><Eye size={18}/></div>
                                : <div className="p-1.5 bg-slate-100 text-slate-400 rounded-md hover:bg-slate-200"><EyeOff size={18}/></div>
                            }
                        </button>
                      </td>

                      {/* 6. Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => navigate(`/edit-product/${product.id}`)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 size={18} /></button>
                          <button onClick={() => handleArchive(product.id, product.name)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg"><Archive size={18} /></button>
                        </div>
                      </td>
                    </tr>

                    {/* --- EXPANDED DETAILS PANEL --- */}
                    {expandedProductId === product.id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="6" className="p-0 border-b border-slate-100 shadow-inner">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

                            {/* COL 1: STOCK MATRIX */}
                            <div className="lg:col-span-2 space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Package size={14}/> Stock Distribution</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.values(product.variants.reduce((acc, v) => {
                                        const k = v.color_id || 'unk';
                                        if(!acc[k]) acc[k] = { ...v, items: [] };
                                        acc[k].items.push(v);
                                        return acc;
                                    }, {})).map(group => (
                                        <div key={group.color_id} className="bg-white border border-slate-200 p-3 rounded-lg flex items-start gap-3">
                                            <div className="w-3 h-3 rounded-full border border-slate-200 mt-1" style={{backgroundColor: group.color?.hex_code}}></div>
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold text-slate-900 mb-2">{group.color?.name}</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.items.sort((a,b)=>a.size.name.localeCompare(b.size.name)).map(v => (
                                                        <div key={v.id} className="text-center bg-slate-50 border border-slate-100 rounded px-2 py-1 min-w-12">
                                                            <div className="text-[10px] text-slate-400 font-bold">{v.size.name}</div>
                                                            <div className={`text-xs font-medium ${v.stock_quantity < 5 ? 'text-amber-600' : 'text-slate-700'}`}>{v.stock_quantity}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* COL 2: FINANCIALS & SEO */}
                            <div className="space-y-6 border-l border-slate-200 pl-6 border-t lg:border-t-0 pt-6 lg:pt-0">
                                {/* Financials */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign size={14}/> Financials</h4>
                                    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Selling Price:</span>
                                            <span className="font-medium text-slate-900">₹{product.is_on_sale ? product.sale_price : product.price}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Cost Price:</span>
                                            <span className="font-medium text-slate-900">₹{product.cost_price || '0.00'}</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                            <span className="text-slate-500 text-xs uppercase font-bold">Margin</span>
                                            {product.cost_price > 0 ? (
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getMargin(product.is_on_sale ? product.sale_price : product.price, product.cost_price)?.margin > 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {getMargin(product.is_on_sale ? product.sale_price : product.price, product.cost_price)?.margin}%
                                                </span>
                                            ) : <span className="text-xs text-slate-300">N/A</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* SEO Metadata */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Globe size={14}/> SEO Details</h4>
                                    <div className="text-xs space-y-2">
                                        <div>
                                            <span className="block text-slate-400">Meta Title</span>
                                            <span className="text-slate-700 font-medium">{product.meta_title || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-slate-400">Keywords</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {product.keywords?.map((k, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">{k}</span>
                                                )) || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}