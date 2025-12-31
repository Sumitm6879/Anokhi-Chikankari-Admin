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
  Box,
  AlertTriangle,
  X,
  Printer,
  CheckSquare,
  Square
} from 'lucide-react';
import { logAction } from '../lib/logger';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // --- NEW: Selection State ---
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // MODAL STATE
  const [actionModal, setActionModal] = useState({ open: false, order: null, newStatus: '', note: '' });
  const [processingAction, setProcessingAction] = useState(false);

  // Status Colors Helper
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
              id,
              stock_quantity,
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

  // --- NEW: Selection Logic ---
  const toggleSelectOrder = (id) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]); // Deselect all
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id)); // Select all visible
    }
  };

  // --- NEW: Print Manifest Logic ---
  const generateManifest = () => {
    if (selectedOrderIds.length === 0) return toast.error("Select orders to print");
    logAction('PRINT', 'Order', `Printed manifest for ${selectedOrderIds.length} orders`);
    const selectedData = orders.filter(o => selectedOrderIds.includes(o.id));
    const printWindow = window.open('', '_blank');

    // Calculate Batch Totals
    const totalBatchValue = selectedData.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const htmlContent = `
      <html>
        <head>
          <title>Order Manifest - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h1 { margin-bottom: 5px; }
            .meta { font-size: 14px; color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; border-bottom: 2px solid #e2e8f0; padding: 10px; font-size: 12px; text-transform: uppercase; color: #475569; }
            td { border-bottom: 1px solid #e2e8f0; padding: 10px; font-size: 14px; vertical-align: top; }
            .total-row td { border-top: 2px solid #0f172a; border-bottom: none; font-weight: bold; font-size: 16px; padding-top: 15px; }
            .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #ccc; }
            .item-list { font-size: 13px; color: #334155; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            @media print {
              button { display: none; }
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: end;">
            <div>
              <h1>Batch Order Sheet</h1>
              <div class="meta">Generated: ${new Date().toLocaleString()} | Orders: ${selectedData.length}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; color: #64748b;">Batch Total</div>
              <div style="font-size: 24px; font-weight: bold;">₹${totalBatchValue.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%;">Order #</th>
                <th style="width: 20%;">Customer</th>
                <th style="width: 50%;">Items to Make/Pack</th>
                <th style="width: 10%;">Status</th>
                <th style="width: 10%; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${selectedData.map(order => `
                <tr>
                  <td><strong>#${order.order_number}</strong></td>
                  <td>
                    <div>${order.customer_name}</div>
                    <div style="font-size: 12px; color: #64748b;">${order.customer_phone || ''}</div>
                  </td>
                  <td>
                    <div class="item-list">
                      ${order.items.map(item => `
                        <div class="item-row">
                          <span>
                            <strong>${item.quantity}x</strong>
                            ${item.variant?.product?.name}
                            <span style="color: #64748b;">(${item.variant?.color?.name} / ${item.variant?.size?.name})</span>
                          </span>
                        </div>
                      `).join('')}
                    </div>
                    ${order.notes ? `<div style="margin-top: 6px; font-size: 11px; background: #fffbeb; padding: 4px; color: #92400e;">Note: ${order.notes}</div>` : ''}
                  </td>
                  <td><span class="badge">${order.status.toUpperCase()}</span></td>
                  <td style="text-align: right;">₹${order.total_amount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8;">
            End of Report
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- Modal Logic ---
  const initiateStatusUpdate = (order, newStatus) => {
    setActionModal({ open: true, order: order, newStatus: newStatus, note: '' });
  };

  const confirmStatusUpdate = async () => {
    setProcessingAction(true);
    const { order, newStatus, note } = actionModal;

    try {
        if (newStatus === 'cancelled' && order.status !== 'cancelled') {
             for (const item of order.items) {
                 if (item.variant?.id) {
                     const { data: variantData } = await supabase.from('product_variants').select('stock_quantity').eq('id', item.variant.id).single();
                     if (variantData) {
                         const newStock = (variantData.stock_quantity || 0) + item.quantity;
                         await supabase.from('product_variants').update({ stock_quantity: newStock }).eq('id', item.variant.id);
                     }
                 }
             }
        }

        let updatedNotes = order.notes || '';
        if (note.trim()) {
            const timestamp = new Date().toLocaleString();
            updatedNotes += `\n[${timestamp}] Changed to ${newStatus.toUpperCase()}: ${note}`;
        }

        const { error } = await supabase.from('orders').update({ status: newStatus, notes: updatedNotes }).eq('id', order.id);

        if (error) throw error;
        await logAction('UPDATE', 'Order', `Updated Order #${order.order_number} to ${newStatus}`, { orderId: order.id });
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus, notes: updatedNotes } : o));
        toast.success(`Order ${newStatus.toUpperCase()}`);
        setActionModal({ open: false, order: null, newStatus: '', note: '' });

    } catch (error) {
        toast.error('Failed to update status');
        console.error(error);
    } finally {
        setProcessingAction(false);
    }
  };

  const sendWhatsAppUpdate = (order) => {
    const phone = order.customer_phone?.replace(/\+/g, '');
    if (!phone) return toast.error("No phone number found");
    // ... (Keep existing whatsapp logic)
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

  const renderActionButtons = (order) => {
      // ... (Keep existing button logic)
      if (order.status === 'cancelled' || order.status === 'delivered') return <span className="text-xs text-slate-400 italic">No actions available</span>;

      return (
      <div className="flex items-center justify-end gap-2">
        {order.status === 'pending' && <button onClick={() => initiateStatusUpdate(order, 'confirmed')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"><CheckCircle size={14} /> Confirm</button>}
        {order.status === 'confirmed' && <button onClick={() => initiateStatusUpdate(order, 'processing')} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm"><Box size={14} /> Pack Order</button>}
        {order.status === 'processing' && <button onClick={() => initiateStatusUpdate(order, 'shipped')} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors shadow-sm"><Truck size={14} /> Ship</button>}
        {order.status === 'shipped' && <button onClick={() => initiateStatusUpdate(order, 'delivered')} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors shadow-sm"><CheckCircle size={14} /> Complete</button>}
        <button onClick={() => initiateStatusUpdate(order, 'cancelled')} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Cancel Order"><XCircle size={18} /></button>
      </div>
    );
  };

  return (
    <div className="space-y-6 mb-20 relative">
      <Toaster position="top-right" richColors />

      {/* --- ACTION MODAL (Same as before) --- */}
      {actionModal.open && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                 <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                     <h3 className="font-semibold text-slate-900">
                        {actionModal.newStatus === 'cancelled' ? 'Cancel Order' : 'Update Status'}
                     </h3>
                     <button onClick={() => setActionModal({...actionModal, open: false})} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                 </div>
                 <div className="p-6 space-y-4">
                     {actionModal.newStatus === 'cancelled' && (
                         <div className="flex gap-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                             <AlertTriangle size={20} className="shrink-0"/><p>This will cancel the order and <strong>automatically return items to stock</strong>.</p>
                         </div>
                     )}
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Add a Note <span className="text-slate-400 font-normal">(Optional)</span></label>
                         <textarea rows={3} className="w-full text-sm border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Reason for change, internal memo..." value={actionModal.note} onChange={(e) => setActionModal({...actionModal, note: e.target.value})} />
                     </div>
                 </div>
                 <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                     <button onClick={() => setActionModal({...actionModal, open: false})} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Close</button>
                     <button onClick={confirmStatusUpdate} disabled={processingAction} className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all flex items-center gap-2 ${actionModal.newStatus === 'cancelled' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-900 hover:bg-indigo-800'}`}>{processingAction ? 'Updating...' : 'Confirm Update'}</button>
                 </div>
             </div>
         </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-slate-500">Track and fulfill customer orders.</p>
        </div>

        <div className="flex flex-wrap gap-3">
            {/* NEW: Batch Action Button */}
            {selectedOrderIds.length > 0 && (
              <button
                onClick={generateManifest}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-all shadow-md animate-in fade-in slide-in-from-bottom-2"
              >
                <Printer size={16} />
                Print Sheet ({selectedOrderIds.length})
              </button>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-48" />
            </div>
            {/* Filter */}
            <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer hover:bg-slate-50 focus:outline-none">
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
                {/* NEW: Select All Header */}
                <th className="px-6 py-4 w-12">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center text-slate-400 hover:text-slate-600">
                    {selectedOrderIds.length > 0 && selectedOrderIds.length === filteredOrders.length
                      ? <CheckSquare size={18} className="text-indigo-600" />
                      : <Square size={18} />
                    }
                  </button>
                </th>
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
                <tr><td colSpan="7" className="p-8 text-center text-slate-500"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div></div></td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="7" className="p-12 text-center text-slate-500">No orders found.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className={`hover:bg-slate-50 transition-colors ${selectedOrderIds.includes(order.id) ? 'bg-indigo-50/30' : ''}`}>
                      {/* NEW: Row Selection */}
                      <td className="px-6 py-4">
                        <button onClick={() => toggleSelectOrder(order.id)} className="flex items-center justify-center text-slate-400 hover:text-indigo-600">
                           {selectedOrderIds.includes(order.id)
                              ? <CheckSquare size={18} className="text-indigo-600" />
                              : <Square size={18} />
                           }
                        </button>
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-slate-700">#{order.order_number}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{order.customer_name}</div>
                        <div className="text-xs text-slate-400">{order.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">₹{order.total_amount}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                           {renderActionButtons(order)}
                           <div className="h-4 w-px bg-slate-200 mx-1"></div>
                           <button onClick={() => sendWhatsAppUpdate(order)} className="text-emerald-600 hover:text-emerald-700 transition-colors" title="WhatsApp"><MessageCircle size={18} /></button>
                           <button onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} className={`transition-colors ${expandedOrderId === order.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>{expandedOrderId === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                        </div>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                        <tr className="bg-slate-50/50">
                            <td colSpan="7" className="p-0 border-b border-slate-200 shadow-inner">
                                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-start"><h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><MapPin size={14}/> Shipping Details</h4></div>
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-1">
                                            <p><span className="font-semibold text-slate-900">{order.customer_name}</span></p>
                                            <p>{order.shipping_address?.street}</p>
                                            <p>{order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.zip}</p>
                                            <p>{order.shipping_address?.country}</p>
                                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center gap-2 text-slate-500"><Phone size={14} /> {order.customer_phone}</div>
                                            {order.notes && (<div className="mt-2 p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100 whitespace-pre-wrap"><strong>Internal Notes:</strong><br/> {order.notes}</div>)}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Package size={14}/> Items Ordered</h4>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                            {order.items?.map((item, idx) => (
                                                <div key={idx} className="p-3 flex justify-between items-center border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                    <div>
                                                        <div className="font-medium text-slate-900 text-sm">{item.variant?.product?.name || 'Unknown Product'}</div>
                                                        <div className="text-xs text-slate-500">{item.variant?.color?.name} • {item.variant?.size?.name}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-mono text-sm font-semibold">₹{item.price_at_purchase}</div>
                                                        <div className="text-xs text-slate-400">Qty: {item.quantity}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="p-3 bg-slate-50 text-right"><span className="text-xs font-bold text-slate-500 uppercase mr-2">Total</span><span className="font-bold text-slate-900">₹{order.total_amount}</span></div>
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