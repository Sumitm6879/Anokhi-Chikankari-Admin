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
  SlidersHorizontal
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
    minPrice: '',
    maxPrice: ''
  });
  const [sortConfig, setSortConfig] = useState('newest'); // newest, price_asc, price_desc, stock_asc, stock_desc

  // Fetch Data
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // NOTE: Added fabric and design relations.
      // If these are text columns on the products table, remove the :fabrics(name) part.
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          fabric:fabrics(name),
          design:designs(name),
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
      setProducts(data || []);
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

  // Helper: Toggle Status
  const toggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setProducts(prev => prev.map(p =>
        p.id === id ? { ...p, is_active: !currentStatus } : p
      ));
      toast.success(currentStatus ? 'Product hidden' : 'Product published');
    } catch (error) {
      toast.error('Could not update status');
    }
  };

  // Helper: Archive
  const handleArchive = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive "${name}"? \n\nThis will:\n1. Set stock to 0\n2. Hide product from site`)) return;

    try {
      const { error: pError } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);
      if (pError) throw pError;

      const { error: vError } = await supabase
        .from('product_variants')
        .update({ stock_quantity: 0 })
        .eq('product_id', id);
      if (vError) throw vError;

      setProducts(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            is_active: false,
            variants: p.variants.map(v => ({ ...v, stock_quantity: 0 }))
          };
        }
        return p;
      }));
      toast.success("Product archived and stock reset.");
    } catch (error) {
      toast.error("Error archiving product");
      console.error(error);
    }
  };

  const toggleRow = (id) => {
    setExpandedProductId(expandedProductId === id ? null : id);
  };

  // --- DERIVED DATA & FILTER LOGIC ---

  // Get unique options for dropdowns based on current data
  const options = useMemo(() => {
    const getOptions = (key, nestedKey) => {
        return [...new Set(products.map(p => {
            if(nestedKey && p[key]) return p[key][nestedKey];
            return p[key];
        }).filter(Boolean))].sort();
    };

    return {
        categories: getOptions('category', 'name'),
        fabrics: getOptions('fabric', 'name'), // Assumes fabric is an object with name, or change logic if string
        designs: getOptions('design', 'name')
    };
  }, [products]);

  // Filter and Sort Products
  const processedProducts = useMemo(() => {
    let result = products.filter(p => {
      // 1. Text Search
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Dropdown Filters
      const matchesCategory = !filters.category || p.category?.name === filters.category;

      // Handle cases where fabric/design might be strings or objects
      const pFabric = p.fabric?.name || p.fabric;
      const matchesFabric = !filters.fabric || pFabric === filters.fabric;

      const pDesign = p.design?.name || p.design;
      const matchesDesign = !filters.design || pDesign === filters.design;

      // 3. Price Range
      const matchesMinPrice = !filters.minPrice || p.price >= Number(filters.minPrice);
      const matchesMaxPrice = !filters.maxPrice || p.price <= Number(filters.maxPrice);

      return matchesSearch && matchesCategory && matchesFabric && matchesDesign && matchesMinPrice && matchesMaxPrice;
    });

    // 4. Sorting
    result.sort((a, b) => {
        switch (sortConfig) {
            case 'price_asc': return a.price - b.price;
            case 'price_desc': return b.price - a.price;
            case 'stock_asc': return getTotalStock(a) - getTotalStock(b);
            case 'stock_desc': return getTotalStock(b) - getTotalStock(a);
            case 'newest':
            default: return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    return result;
  }, [products, searchTerm, filters, sortConfig]);

  const clearFilters = () => {
    setFilters({ category: '', fabric: '', design: '', minPrice: '', maxPrice: '' });
    setSearchTerm('');
    setSortConfig('newest');
  };

  return (
    <div className="space-y-6 mb-20">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
            <p className="text-slate-500">Manage your catalog, filter options, and stock.</p>
            </div>

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative grow md:grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
                    />
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        showFilters || Object.values(filters).some(Boolean)
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    {showFilters ? <X size={18} /> : <Filter size={18} />}
                    <span>Filters</span>
                    {Object.values(filters).some(Boolean) && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 ml-1"></span>
                    )}
                </button>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <ArrowUpDown size={16} />
                    </div>
                    <select
                        value={sortConfig}
                        onChange={(e) => setSortConfig(e.target.value)}
                        className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer hover:bg-slate-50"
                    >
                        <option value="newest">Newest First</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="stock_desc">Stock: High to Low</option>
                        <option value="stock_asc">Stock: Low to High</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <SlidersHorizontal size={16} />
                        Active Filters
                    </h3>
                    <button
                        onClick={clearFilters}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                    >
                        Clear All
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Category Filter */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Category</label>
                        <div className="relative">
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({...filters, category: e.target.value})}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                            >
                                <option value="">All Categories</option>
                                {options.categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Fabric Filter */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Fabric</label>
                        <div className="relative">
                            <select
                                value={filters.fabric}
                                onChange={(e) => setFilters({...filters, fabric: e.target.value})}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                            >
                                <option value="">All Fabrics</option>
                                {options.fabrics.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Design Filter */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Design</label>
                        <div className="relative">
                            <select
                                value={filters.design}
                                onChange={(e) => setFilters({...filters, design: e.target.value})}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                            >
                                <option value="">All Designs</option>
                                {options.designs.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="lg:col-span-2 space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Price Range (₹)</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Min"
                                value={filters.minPrice}
                                onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                                className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <span className="self-center text-slate-400">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                                className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading inventory...</td></tr>
              ) : processedProducts.length === 0 ? (
                <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Package size={32} className="text-slate-300" />
                            <p>No products match your filters.</p>
                            <button onClick={clearFilters} className="text-indigo-600 font-medium hover:underline">Clear all filters</button>
                        </div>
                    </td>
                </tr>
              ) : (
                processedProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    {/* Main Row */}
                    <tr className={`hover:bg-slate-50/50 transition-colors group ${!product.is_active ? 'bg-slate-50/80 grayscale opacity-75' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                            {product.images?.find(img => img.is_primary)?.image_url ? (
                              <img
                                src={product.images.find(img => img.is_primary).image_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Package size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{product.name}</div>
                            <div className="text-xs text-slate-400 flex gap-2">
                                <span>SKU: {product.id.slice(0, 8)}...</span>
                                {/* Display Fabric/Design if available */}
                                {(product.fabric?.name || product.fabric) && (
                                    <span className="hidden sm:inline">• {product.fabric.name || product.fabric}</span>
                                )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                          {product.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        ₹{product.price}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(product.id, product.is_active)}
                          className={`p-1.5 rounded-full transition-colors ${
                            product.is_active
                              ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {product.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <button
                           onClick={() => toggleRow(product.id)}
                           className={`flex items-center justify-center gap-2 mx-auto px-3 py-1.5 rounded-lg border transition-all text-xs font-medium ${
                             expandedProductId === product.id
                               ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                               : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                           }`}
                         >
                           <span>
                             {getTotalStock(product)} Units
                           </span>
                           {expandedProductId === product.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                         </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/edit-product/${product.id}`)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 size={18} />
                          </button>

                          <button
                            onClick={() => handleArchive(product.id, product.name)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Archive (Zero Stock)"
                          >
                            <Archive size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Matrix Row */}
                    {expandedProductId === product.id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="6" className="p-0">
                          <div className="p-6 border-y border-slate-100 shadow-inner bg-slate-50">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Distribution Matrix</h4>
                                <div className="text-xs text-slate-500">
                                    {(product.design?.name || product.design) && `Design: ${product.design.name || product.design} • `}
                                    {(product.fabric?.name || product.fabric) && `Fabric: ${product.fabric.name || product.fabric}`}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.values(
                                product.variants.reduce((acc, variant) => {
                                  const key = variant.color_id || 'unknown';
                                  if (!acc[key]) acc[key] = { color: variant.color, id: variant.color_id, items: [] };
                                  acc[key].items.push(variant);
                                  return acc;
                                }, {})
                              ).map((group, idx) => {
                                const variantImages = product.images.filter(img => img.color_id === group.id);

                                return (
                                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4">
                                    <div className="w-20 shrink-0 flex flex-col gap-2">
                                        {variantImages.length > 0 ? (
                                            <div className="flex flex-col gap-2 h-28 overflow-y-auto pr-1 custom-scrollbar">
                                                {variantImages.map((img, i) => (
                                                    <img
                                                        key={i}
                                                        src={img.image_url}
                                                        className="w-full aspect-3/4 object-cover rounded-md border border-slate-100"
                                                        alt=""
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-24 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-center text-slate-300">
                                                <Package size={16}/>
                                            </div>
                                        )}
                                        <div className="text-[10px] text-center text-slate-400">{variantImages.length} photos</div>
                                    </div>

                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-3">
                                        <div
                                          className="w-3 h-3 rounded-full border border-slate-300"
                                          style={{ backgroundColor: group.color?.hex_code }}
                                        ></div>
                                        <span className="font-semibold text-slate-900 text-sm">{group.color?.name}</span>
                                      </div>

                                      <div className="grid grid-cols-3 gap-2">
                                        {group.items.sort((a,b) => a.size.name.localeCompare(b.size.name)).map(v => (
                                          <div key={v.id} className="text-center">
                                            <div className="text-[10px] text-slate-400 font-medium mb-0.5">{v.size?.name}</div>
                                            <div className={`text-xs font-bold py-1 px-1 rounded border ${
                                              v.stock_quantity === 0
                                                ? 'bg-red-50 text-red-600 border-red-100'
                                                : v.stock_quantity < 5
                                                  ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                  : 'bg-slate-50 text-slate-700 border-slate-100'
                                            }`}>
                                              {v.stock_quantity}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
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