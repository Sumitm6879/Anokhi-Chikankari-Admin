import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  AlertTriangle,
  Loader2,
  Clock,
  IndianRupee,
  ArrowRight
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Dashboard State
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingOrders: 0,
    totalProducts: 0,
    lowStockCount: 0,
    productsOnSale: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // 1. Fetch Order Metrics (Revenue & Pending Counts)
      const { data: allOrders, error: orderError } = await supabase
        .from('orders')
        .select('total_amount, status');

      if (orderError) throw orderError;

      // UPDATED LOGIC: Filter out 'cancelled' orders before calculating revenue
      const totalRevenue = allOrders
        ?.filter(o => o.status !== 'cancelled')
        .reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      const pendingOrders = allOrders?.filter(o => o.status === 'pending').length || 0;

      // 2. Fetch Product Metrics (Active & On Sale)
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, is_on_sale')
        .eq('is_active', true);

      if (prodError) throw prodError;

      const totalProducts = products?.length || 0;
      const productsOnSale = products?.filter(p => p.is_on_sale).length || 0;

      // 3. Fetch Recent Orders (Last 5)
      const { data: recent, error: recentError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // 4. Fetch Low Stock Items (< 5 quantity)
      const { data: lowStockData, error: lowStockError } = await supabase
        .from('product_variants')
        .select(`
          id,
          stock_quantity,
          size:sizes(name),
          color:colors(name),
          product:products!inner(name, is_active)
        `)
        .eq('product.is_active', true)
        .lt('stock_quantity', 5)
        .order('stock_quantity', { ascending: true })
        .limit(5);

      if (lowStockError) throw lowStockError;

      // Set State
      setStats({
        totalRevenue,
        pendingOrders,
        totalProducts,
        productsOnSale,
        lowStockCount: lowStockData?.length || 0
      });
      setRecentOrders(recent || []);
      setLowStockItems(lowStockData || []);

    } catch (error) {
      console.error('Error fetching dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // Helper for Status Badges
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500">Real-time business insights and tasks.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/orders/create')}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-all"
          >
            + New Order
          </button>
        </div>
      </div>

      {/* 1. KEY METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <StatCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={<IndianRupee className="text-emerald-600" size={24} />}
          bg="bg-emerald-50"
          subtext="Excludes cancelled orders"
        />

        {/* Pending Orders */}
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={<Clock className="text-amber-600" size={24} />}
          bg="bg-amber-50"
          subtext="Requires attention"
          highlight={stats.pendingOrders > 0}
        />

        {/* Active Inventory */}
        <StatCard
          title="Active Products"
          value={stats.totalProducts}
          icon={<Package className="text-blue-600" size={24} />}
          bg="bg-blue-50"
          subtext={`${stats.productsOnSale} currently on sale`}
        />

        {/* Low Stock Alerts */}
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockCount}
          icon={<AlertTriangle className="text-red-600" size={24} />}
          bg="bg-red-50"
          subtext="Variants below 5 qty"
        />
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COL: Recent Orders (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <ShoppingBag size={18} className="text-slate-400"/> Recent Orders
              </h3>
              <button onClick={() => navigate('/orders')} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View All <ArrowRight size={12}/>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Order #</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400">No orders placed yet.</td></tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-slate-700">#{order.order_number}</td>
                        <td className="px-6 py-4 text-slate-900">{order.customer_name}</td>
                        <td className="px-6 py-4 font-medium">₹{order.total_amount}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COL: Low Stock & Actions */}
        <div className="space-y-6">

          {/* Low Stock Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500"/> Low Stock
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
               {lowStockItems.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm">Inventory levels are healthy.</div>
               ) : (
                 lowStockItems.map((item) => (
                   <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="font-medium text-slate-900 text-sm">{item.product?.name}</div>
                        <div className="text-xs text-slate-500">{item.color?.name} • {item.size?.name}</div>
                      </div>
                      <div className="text-center">
                         <div className={`text-sm font-bold ${item.stock_quantity === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                           {item.stock_quantity}
                         </div>
                         <div className="text-[10px] text-slate-400 uppercase">Left</div>
                      </div>
                   </div>
                 ))
               )}
            </div>
            {lowStockItems.length > 0 && (
               <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                  <button onClick={() => navigate('/products')} className="text-xs font-medium text-slate-600 hover:text-slate-900">Manage Inventory</button>
               </div>
            )}
          </div>

          {/* Quick Stats / Info */}
          <div className="bg-indigo-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="font-bold text-lg mb-1">Store Performance</h3>
                <p className="text-indigo-200 text-sm mb-4">You have {stats.productsOnSale} active discount campaigns running.</p>
                <button onClick={() => navigate('/sales')} className="w-full py-2 bg-white text-indigo-900 text-sm font-bold rounded-lg hover:bg-indigo-50 transition-colors">
                   Manage Sales
                </button>
             </div>
             {/* Decorative Circle */}
             <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Sub-component for Top Cards
function StatCard({ title, value, icon, bg, subtext, highlight }) {
  return (
    <div className={`bg-white p-6 rounded-xl border ${highlight ? 'border-amber-200 ring-2 ring-amber-500/10' : 'border-slate-200'} shadow-sm flex items-start justify-between transition-all hover:shadow-md`}>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${bg}`}>
        {icon}
      </div>
    </div>
  );
}