import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  Filter,
  Eye,
  EyeOff,
  MoreHorizontal
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Toggle Product Status (Active/Inactive)
  const toggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      // Optimistic Update (Update UI instantly)
      setProducts(prev => prev.map(p =>
        p.id === id ? { ...p, is_active: !currentStatus } : p
      ));
      toast.success(currentStatus ? 'Product hidden' : 'Product published');
    } catch (error) {
      toast.error('Could not update status');
    }
  };

  const toggleRow = (id) => {
    setExpandedProductId(expandedProductId === id ? null : id);
  };

  // Filter Logic
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 mb-20">
      <Toaster position="top-right" richColors />

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500">Manage your catalog and stock levels.</p>
        </div>
        <div className="flex gap-3">
           {/* Search Bar */}
           <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            <Filter size={20} />
          </button>
        </div>
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
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No products found.</td></tr>
              ) : (
                filteredProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    {/* Main Row */}
                    <tr className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
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
                            <div className="text-xs text-slate-400">SKU: {product.id.slice(0, 8)}...</div>
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
                           {/* Calculate Total Stock */}
                           <span>
                             {product.variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0} Units
                           </span>
                           {expandedProductId === product.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                         </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Matrix Row */}
                    {expandedProductId === product.id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="6" className="p-0">
                          <div className="p-6 border-y border-slate-100 shadow-inner bg-slate-50">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Stock Distribution Matrix</h4>

                            {/* The Matrix Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.values(
                                product.variants.reduce((acc, variant) => {
                                  // Use color_id as key for safer grouping
                                  const key = variant.color_id || 'unknown';
                                  if (!acc[key]) acc[key] = { color: variant.color, id: variant.color_id, items: [] };
                                  acc[key].items.push(variant);
                                  return acc;
                                }, {})
                              ).map((group, idx) => {
                                // Filter ALL images for this color
                                const variantImages = product.images.filter(img => img.color_id === group.id);

                                return (
                                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4">

                                    {/* Scrollable Image Gallery */}
                                    <div className="w-20 flex-shrink-0 flex flex-col gap-2">
                                        {variantImages.length > 0 ? (
                                            <div className="flex flex-col gap-2 h-28 overflow-y-auto pr-1 custom-scrollbar">
                                                {variantImages.map((img, i) => (
                                                    <img
                                                        key={i}
                                                        src={img.image_url}
                                                        className="w-full aspect-[3/4] object-cover rounded-md border border-slate-100"
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

                                    {/* Color & Size Grid */}
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