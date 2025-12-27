import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  MessageCircle,
  MapPin,
  Phone,
  Play,
  Box
} from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Status Colors Helper (Visual Badge)
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items (
            id, quantity, price_at_purchase,
            variant:product_variants (
              size:sizes(name),
              color:colors(name),
              product:products(name, id)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      toast.error('Error fetching orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order marked as ${newStatus.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const sendWhatsAppUpdate = (order) => {
    const phone = order.customer_phone?.replace(/\+/g, '');
    if (!phone) return toast.error("No phone number found");

    let msg = `Hi ${order.customer_name}, update on your Order #${order.order_number}: `;
    switch (order.status) {
        case 'confirmed': msg += `It has been confirmed and is being packed! Total: ₹${order.total_amount}.`; break;
        case 'shipped': msg += `It has been SHIPPED! 🚚 It is on the way to you.`; break;
        case 'delivered': msg += `It has been delivered! 🎉 We hope you love it.`; break;
        default: msg += `Current status: ${order.status.toUpperCase()}.`;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
        order.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        order.order_number?.toString().includes(search) ||
        order.customer_phone?.includes(search);
    const matchesFilter = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Helper to render action buttons based on current status
  const renderActionButtons = (order) => {
    if (order.status === 'cancelled' || order.status === 'delivered') {
      return <span className="text-xs text-slate-400 italic">No actions available</span>;
    }

    return (
      <div className="flex items-center justify-end gap-2">
        {/* Workflow Buttons */}
        {order.status === 'pending' && (
          <button
            onClick={() => updateStatus(order.id, 'confirmed')}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            <CheckCircle size={14} /> Confirm
          </button>
        )}

        {order.status === 'confirmed' && (
          <button
            onClick={() => updateStatus(order.id, 'processing')}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Box size={14} /> Pack Order
          </button>
        )}

        {order.status === 'processing' && (
          <button
            onClick={() => updateStatus(order.id, 'shipped')}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Truck size={14} /> Ship
          </button>
        )}

        {order.status === 'shipped' && (
          <button
            onClick={() => updateStatus(order.id, 'delivered')}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <CheckCircle size={14} /> Complete
          </button>
        )}

        {/* Cancel Button (Always available unless completed) */}
        <button
          onClick={() => {
            if(window.confirm('Are you sure you want to cancel this order?')) {
                updateStatus(order.id, 'cancelled');
            }
          }}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Cancel Order"
        >
          <XCircle size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 mb-20">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-slate-500">Track and fulfill customer orders.</p>
        </div>

        <div className="flex gap-3">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
                />
            </div>
            {/* Filter */}
            <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer hover:bg-slate-50 focus:outline-none"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-500"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div></div></td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-500">No orders found.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">
                        #{order.order_number}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{order.customer_name}</div>
                        <div className="text-xs text-slate-400">{order.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">₹{order.total_amount}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                           {/* Render Action Buttons based on Status */}
                           {renderActionButtons(order)}

                           <div className="h-4 w-px bg-slate-200 mx-1"></div>

                           <button
                             onClick={() => sendWhatsAppUpdate(order)}
                             className="text-emerald-600 hover:text-emerald-700 transition-colors"
                             title="WhatsApp"
                           >
                             <MessageCircle size={18} />
                           </button>
                           <button
                             onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                             className={`transition-colors ${expandedOrderId === order.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                             {expandedOrderId === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                           </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedOrderId === order.id && (
                        <tr className="bg-slate-50/50">
                            <td colSpan="6" className="p-0 border-b border-slate-200 shadow-inner">
                                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Shipping Address */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><MapPin size={14}/> Shipping Details</h4>

                                            {/* Manual Status Override */}
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-400">Manual Status:</span>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => updateStatus(order.id, e.target.value)}
                                                    className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="processing">Processing</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-1">
                                            <p><span className="font-semibold text-slate-900">{order.customer_name}</span></p>
                                            <p>{order.shipping_address?.street}</p>
                                            <p>
                                                {order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.zip}
                                            </p>
                                            <p>{order.shipping_address?.country}</p>
                                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-2 text-slate-500">
                                                <Phone size={14} /> {order.customer_phone}
                                            </div>
                                            {order.notes && (
                                                <div className="mt-2 p-2 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100">
                                                    <strong>Note:</strong> {order.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Package size={14}/> Items Ordered</h4>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                            {order.items?.map((item, idx) => (
                                                <div key={idx} className="p-3 flex justify-between items-center border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                    <div>
                                                        <div className="font-medium text-slate-900 text-sm">
                                                            {item.variant?.product?.name || 'Unknown Product'}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {item.variant?.color?.name} • {item.variant?.size?.name}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-mono text-sm font-semibold">₹{item.price_at_purchase}</div>
                                                        <div className="text-xs text-slate-400">Qty: {item.quantity}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="p-3 bg-slate-50 text-right">
                                                <span className="text-xs font-bold text-slate-500 uppercase mr-2">Total</span>
                                                <span className="font-bold text-slate-900">₹{order.total_amount}</span>
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