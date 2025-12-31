import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  Search, Plus, Minus, ShoppingCart, User, MapPin,
  Save, Loader2, Trash2, Package, CreditCard, FileText
} from 'lucide-react';
import { logAction } from '../lib/logger';

export default function CreateOrder() {
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);

  // Customer Form
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    payment_method: 'upi',
    notes: ''
  });

  // Address Form
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'India'
  });

  // 1. Live Product Search (Using RPC for Name OR SKU)
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (productSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      // We call the SQL function 'search_inventory' we just created
      // Then we chain .select() to get the variants and images as usual
      const { data, error } = await supabase
        .rpc('search_inventory', { term: productSearch })
        .select(`
          id, name, price, sale_price, is_on_sale,
          variants:product_variants(id, sku, size:sizes(name), color:colors(name), stock_quantity),
          images:product_images(image_url, is_primary)
        `)
        .limit(10);

      if (error) {
        console.error("Search error:", error);
        toast.error("Search failed");
      } else {
        setSearchResults(data || []);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [productSearch]);

  // 2. Add to Cart Logic
  const addToCart = (product, variant) => {
    if (variant.stock_quantity <= 0) return toast.error("Out of stock");

    setCart(prev => {
      const existing = prev.find(item => item.variant_id === variant.id);
      if (existing) {
        if (existing.qty + 1 > variant.stock_quantity) {
          toast.error("Max stock reached");
          return prev;
        }
        return prev.map(item => item.variant_id === variant.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, {
        product_id: product.id,
        variant_id: variant.id,
        name: product.name,
        price: product.is_on_sale ? product.sale_price : product.price,
        size: variant.size.name,
        color: variant.color.name,
        image: product.images?.find(i => i.is_primary)?.image_url,
        qty: 1,
        max_stock: variant.stock_quantity
      }];
    });
    setProductSearch('');
    setSearchResults([]);
  };

  const removeFromCart = (variantId) => {
    setCart(prev => prev.filter(item => item.variant_id !== variantId));
  };

  const updateQty = (variantId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.variant_id === variantId) {
        const newQty = item.qty + delta;
        if (newQty > item.max_stock) return item;
        if (newQty < 1) return item;
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // 3. Submit Order
  const handleCreateOrder = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (!customer.name || !customer.phone) return toast.error("Customer Name & Phone required");

    setLoading(true);
    try {
      // A. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customer.name,
          customer_phone: customer.phone,
          shipping_address: address,
          payment_method: customer.payment_method,
          status: 'confirmed',
          total_amount: cartTotal,
          notes: customer.notes,
          user_id: null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // B. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        variant_id: item.variant_id,
        quantity: item.qty,
        price_at_purchase: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // C. Deduct Stock
      for (const item of cart) {
        await supabase
          .from('product_variants')
          .update({ stock_quantity: item.max_stock - item.qty })
          .eq('id', item.variant_id);
      }
      await logAction('CREATE', 'Order', `Created Manual Order #${order.order_number}`, { total: cartTotal, items: cart.length });
      toast.success(`Order #${order.order_number} Created!`);
      setCart([]);
      setCustomer({ name: '', phone: '', payment_method: 'upi', notes: '' });
      setAddress({ street: '', city: '', state: '', zip: '', country: 'India' });

    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 pb-32">
      <Toaster position="top-right" richColors />

      {/* PAGE HEADER (Full Width) */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Manual Order</h1>
          <p className="text-slate-500 mt-1">Process phone and WhatsApp orders instantly.</p>
        </div>
        <div className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
          <ShoppingCart size={18} className="text-indigo-600" />
          <span>{cart.length} Items in Cart</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: Search & Cart (Spans 7) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Product Search */}
          <div className="relative z-20">
            <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Scan or search products..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-lg transition-all"
            />

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-96 overflow-y-auto">
                {searchResults.map(prod => (
                  <div key={prod.id} className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-semibold text-slate-900 block">{prod.name}</span>
                        <span className="text-xs text-slate-400">Select a variant to add</span>
                      </div>
                      <span className="font-mono font-medium text-slate-700">₹{prod.is_on_sale ? prod.sale_price : prod.price}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {prod.variants.map(v => (
                        <button
                          key={v.id}
                          disabled={v.stock_quantity === 0}
                          onClick={() => addToCart(prod, v)}
                          className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-2 transition-all ${v.stock_quantity === 0
                              ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                        >
                          <span className="font-medium">{v.color?.name} / {v.size?.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.stock_quantity < 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {v.stock_quantity}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <ShoppingCart size={18} className="text-slate-400" /> Current Cart
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-600 hover:underline">Clear All</button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <Package size={24} />
                  </div>
                  <div className="text-slate-500 font-medium">Cart is empty</div>
                  <p className="text-sm text-slate-400">Search for products above to begin.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.variant_id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    {/* Image */}
                    <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      {item.image ? (
                        <img src={item.image} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20} /></div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{item.name}</h4>
                      <p className="text-sm text-slate-500 mb-1">{item.color} • {item.size}</p>
                      <div className="text-xs font-mono text-slate-400">₹{item.price} x {item.qty}</div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <button onClick={() => updateQty(item.variant_id, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Minus size={14} /></button>
                        <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.variant_id, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Plus size={14} /></button>
                      </div>
                      <div className="font-bold text-slate-900">₹{(item.price * item.qty).toFixed(2)}</div>
                    </div>

                    <button onClick={() => removeFromCart(item.variant_id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Total Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-sm text-slate-500 block">Total Payable</span>
                <span className="text-xs text-slate-400">Includes all taxes</span>
              </div>
              <span className="text-3xl font-bold text-slate-900 tracking-tight">₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Forms (Spans 5) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">

          {/* Customer Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <User size={18} className="text-slate-400" /> Customer Details
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Full Name <span className="text-red-500">*</span></label>
                <input
                  value={customer.name}
                  onChange={e => setCustomer({ ...customer, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Aditya Kumar"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">WhatsApp Number <span className="text-red-500">*</span></label>
                <input
                  value={customer.phone}
                  onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>
          </div>

          {/* Shipping Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <MapPin size={18} className="text-slate-400" /> Shipping Address
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Street / Apartment</label>
                <input
                  value={address.street}
                  onChange={e => setAddress({ ...address, street: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Flat 101, Galaxy Apts"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">City</label>
                  <input
                    value={address.city}
                    onChange={e => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Pincode</label>
                  <input
                    value={address.zip}
                    onChange={e => setAddress({ ...address, zip: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">State</label>
                  <input
                    value={address.state}
                    onChange={e => setAddress({ ...address, state: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Country</label>
                  <input
                    value={address.country}
                    disabled
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard size={18} className="text-slate-400" /> Payment & Notes
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Method</label>
                <select
                  value={customer.payment_method}
                  onChange={e => setCustomer({ ...customer, payment_method: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                >
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="cod">Cash on Delivery</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Internal Notes</label>
                <textarea
                  value={customer.notes}
                  onChange={e => setCustomer({ ...customer, notes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                  rows={2}
                  placeholder="Gift wrap request, special delivery instructions..."
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCreateOrder}
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Confirm & Create Order
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}