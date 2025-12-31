import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  TrendingUp,
  Search,
  Plus,
  Trash2,
  Loader2,
  Package,
  ArrowUp,
  ArrowDown,
  Trophy,
  Sparkles,
  GripVertical,
  AlertCircle
} from 'lucide-react';
import { logAction } from '../lib/logger';

export default function TrendingManager() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trending_products')
        .select(`
          id,
          position,
          product:products (
            id, name, price, sale_price, is_on_sale,
            images:product_images(image_url)
          )
        `)
        .order('position', { ascending: true });

      if (error) throw error;
      setTrending(data || []);
    } catch (error) {
      toast.error('Error loading trending products');
    } finally {
      setLoading(false);
    }
  };

  // Search Logic with Debounce (Efficiency)
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);

      const existingIds = trending.map(t => t.product?.id);

      const { data } = await supabase
        .from('products')
        .select('id, name, price, sale_price, is_on_sale, images:product_images(image_url)')
        .ilike('name', `%${searchTerm}%`)
        .limit(5);

      if (data) {
        setSearchResults(data.filter(p => !existingIds.includes(p.id)));
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, trending]);

  const addToTrending = async (product) => {
    try {
      const newPosition = trending.length > 0
        ? Math.max(...trending.map(t => t.position)) + 1
        : 1;

      const { error } = await supabase
        .from('trending_products')
        .insert({ product_id: product.id, position: newPosition });

      if (error) throw error;

      toast.success('Added to Trending');
      await logAction('CREATE', 'Trending', `Added ${product.name} to trending list`, { productId: product.id });
      setSearchTerm('');
      fetchTrending();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const removeFromTrending = async (id) => {
    // Error Prevention: Could add a confirm dialog here if preferred
    try {
      const { error } = await supabase.from('trending_products').delete().eq('id', id);
      if (error) throw error;
      setTrending(prev => prev.filter(item => item.id !== id));
      await logAction('DELETE', 'Trending', `Removed item from trending list`, { id });
      toast.success('Removed from list');
    } catch (error) {
      toast.error('Error removing item');
    }
  };

  const moveItem = async (index, direction) => {
    // Error Prevention: Bounds check
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= trending.length) return;

    const itemA = trending[index];
    const itemB = trending[newIndex];

    // Efficiency: Optimistic UI Update (Instant Feedback)
    const newList = [...trending];
    newList[index] = { ...itemB, position: itemA.position };
    newList[newIndex] = { ...itemA, position: itemB.position };

    newList.sort((a, b) => a.position - b.position);
    setTrending(newList);

    try {
      await Promise.all([
        supabase.from('trending_products').update({ position: itemA.position }).eq('id', itemB.id),
        supabase.from('trending_products').update({ position: itemB.position }).eq('id', itemA.id)
      ]);
    } catch (error) {
      toast.error("Failed to reorder");
      fetchTrending(); // Recovery mechanism
    }
  };

  // Clarity: Helper for Rank Badge Styling
  const getRankBadge = (index) => {
    const rank = index + 1;
    if (rank === 1) return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: <Trophy size={14} className="text-yellow-600 fill-yellow-600" /> };
    if (rank === 2) return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: <span className="font-bold text-xs">#2</span> };
    if (rank === 3) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: <span className="font-bold text-xs">#3</span> };
    return { bg: 'bg-white', text: 'text-slate-400', border: 'border-slate-100', icon: <span className="font-medium text-xs">#{rank}</span> };
  };

  return (
    <div className="max-w-6xl mx-auto pb-32 pt-6 px-6">
      <Toaster position="top-right" richColors />

      {/* HEADER: Clarity & Simplicity */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
             Trending Products <Sparkles className="text-yellow-500 fill-yellow-500" size={24} />
          </h1>
          <p className="text-slate-500 mt-1">Curate the products that appear on your homepage highlight reel.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
          {trending.length} Items Live
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: ACTIVE LIST (Spans 7 columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="font-semibold text-slate-900 text-lg">Live Ranking</h2>
            <span className="text-xs text-slate-400">Order determines display priority</span>
          </div>

          <div className="space-y-3">
            {/* Feedback: Loading State */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 border-dashed">
                <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                <span className="text-slate-400 text-sm">Loading curation...</span>
              </div>
            ) : trending.length === 0 ? (
              /* Feedback: Empty State */
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <TrendingUp size={32} />
                </div>
                <h3 className="text-slate-900 font-medium">No trending items yet</h3>
                <p className="text-slate-500 text-sm mt-1">Search for products on the right to get started.</p>
              </div>
            ) : (
              trending.map((item, index) => {
                 const img = item.product?.images?.[0]?.image_url;
                 const rankStyle = getRankBadge(index);

                 return (
                  <div
                    key={item.id}
                    className={`relative flex items-center gap-4 p-3 pr-4 bg-white rounded-xl border transition-all duration-200 group hover:shadow-md ${index < 3 ? 'border-slate-200' : 'border-slate-100'}`}
                  >
                    {/* Visual Hierarchy: Rank Indicator */}
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border ${rankStyle.bg} ${rankStyle.border} ${rankStyle.text}`}>
                      {rankStyle.icon}
                    </div>

                    {/* Clarity: Product Image */}
                    <div className="w-16 h-20 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden shrink-0 relative">
                       {img ? (
                         <img src={img} className="w-full h-full object-cover" alt={item.product?.name} />
                       ) : (
                         <div className="flex items-center justify-center h-full text-slate-300"><Package size={20}/></div>
                       )}
                       {item.product?.is_on_sale && (
                         <div className="absolute top-0 right-0 bg-red-500 w-2.5 h-2.5 rounded-bl-lg rounded-tr-lg z-10" title="On Sale"></div>
                       )}
                    </div>

                    {/* Clarity: Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate text-sm md:text-base">{item.product?.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                         {item.product?.is_on_sale ? (
                           <>
                             <span className="text-emerald-600 font-bold text-sm">₹{item.product.sale_price}</span>
                             <span className="text-slate-400 line-through text-xs">₹{item.product.price}</span>
                           </>
                         ) : (
                           <span className="text-slate-600 font-medium text-sm">₹{item.product?.price}</span>
                         )}
                      </div>
                    </div>

                    {/* Efficiency & Accessibility: Actions */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1 mr-2 border-r border-slate-100 pr-3">
                        <button
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          title="Move Up"
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        >
                          <ArrowUp size={16}/>
                        </button>
                        <button
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === trending.length - 1}
                          title="Move Down"
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        >
                          <ArrowDown size={16}/>
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromTrending(item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remove from Trending"
                        aria-label="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Visual Grip Handle (Cue only) */}
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity -ml-2">
                        <GripVertical size={14} />
                    </div>
                  </div>
                 )
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SEARCH (Spans 5 columns) */}
        <div className="lg:col-span-5 relative">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Search size={20} />
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-900">Find Products</h3>
                   <p className="text-xs text-slate-500">Search your inventory to add items.</p>
                 </div>
              </div>

              {/* Accessibility: Search Input */}
              <div className="relative mb-6 group">
                <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Type product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                  aria-label="Search products"
                />
              </div>

              {/* Feedback: Results Area */}
              <div className="space-y-2 min-h-50">
                {isSearching && (
                  <div className="text-center py-8">
                    <Loader2 className="animate-spin text-indigo-400 mx-auto mb-2" size={24}/>
                    <span className="text-xs text-slate-400">Searching inventory...</span>
                  </div>
                )}

                {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
                   <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                      <AlertCircle className="text-slate-300 mx-auto mb-2" size={24} />
                      <p className="text-sm text-slate-600 font-medium">No matches found</p>
                      <p className="text-xs text-slate-400">Try a different keyword or check spelling.</p>
                   </div>
                )}

                {!isSearching && searchTerm.length < 2 && (
                    <div className="text-center py-12 text-slate-400">
                        <p className="text-sm">Start typing to see products...</p>
                    </div>
                )}

                <div className="space-y-2">
                  {searchResults.map(prod => (
                    <button
                      key={prod.id}
                      onClick={() => addToTrending(prod)}
                      className="w-full text-left p-2.5 flex items-center gap-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group bg-white hover:shadow-sm"
                      title="Add to Trending"
                    >
                      <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                         {prod.images?.[0]?.image_url ? (
                            <img src={prod.images[0].image_url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt={prod.name}/>
                         ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-slate-300"/></div>
                         )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-700 group-hover:text-indigo-700 truncate">{prod.name}</div>
                        <div className="flex items-center gap-2 text-xs">
                           {prod.is_on_sale ? (
                               <span className="text-emerald-600 font-medium">₹{prod.sale_price}</span>
                           ) : (
                               <span className="text-slate-500">₹{prod.price}</span>
                           )}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white transition-all shadow-sm">
                        <Plus size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}