import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    lowStockCount: 0
  });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // 1. Get Counts
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // FIXED: Only count "Active" products for the "Active Products" card
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 2. Get Low Stock Items (< 5 quantity) AND Active Product
      // We use !inner to enforce filtering on the joined table
      const { data: lowStockData, error } = await supabase
        .from('product_variants')
        .select(`
          id,
          stock_quantity,
          size:sizes(name),
          color:colors(name),
          product:products!inner(name, is_active)
        `)
        .eq('product.is_active', true) // <--- The Fix: Ignore archived products
        .lt('stock_quantity', 5)
        .order('stock_quantity', { ascending: true })
        .limit(5);

      if (error) throw error;

      setStats({
        totalOrders: ordersCount || 0,
        totalProducts: productsCount || 0,
        lowStockCount: lowStockData?.length || 0
      });
      setLowStockItems(lowStockData || []);

    } catch (error) {
      console.error('Error fetching dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500">Welcome back to your store control center.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={<ShoppingBag className="text-blue-600" size={24} />}
          bg="bg-blue-50"
        />
        <StatCard
          title="Active Products"
          value={stats.totalProducts}
          icon={<Package className="text-emerald-600" size={24} />}
          bg="bg-emerald-50"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockCount}
          icon={<AlertTriangle className="text-amber-600" size={24} />}
          bg="bg-amber-50"
        />
      </div>

      {/* Low Stock Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Low Stock Inventory</h3>
          {lowStockItems.length > 0 && (
            <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
              Action Needed
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Variant</th>
                <th className="px-6 py-3">Stock Left</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lowStockItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                    All active stock levels are healthy!
                  </td>
                </tr>
              ) : (
                lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {item.product?.name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {item.color?.name} / {item.size?.name}
                    </td>
                    <td className="px-6 py-3 font-mono font-medium text-slate-700">
                      {item.stock_quantity}
                    </td>
                    <td className="px-6 py-3">
                      {item.stock_quantity === 0 ? (
                        <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded">Out of Stock</span>
                      ) : (
                        <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">Low Stock</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Simple Sub-component for Cards
function StatCard({ title, value, icon, bg }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${bg}`}>
        {icon}
      </div>
    </div>
  );
}