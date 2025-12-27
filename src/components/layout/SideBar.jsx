import React from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  LogOut,
  PlusCircle,
  X,
  Tags,
  Percent,
  ShoppingCart,
  Settings,
} from 'lucide-react';

export default function SideBar({ isOpen, onClose }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'New Order', path: '/orders/create', icon: ShoppingCart },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Sales & Offers', path: '/sales', icon: Percent },
    { name: 'Order Management', path: '/orders', icon: ShoppingBag },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Attributes', path: '/attributes', icon: Tags },
    { name: 'Store Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-slate-200 flex flex-col h-full
          transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* NEW LOGO IMPLEMENTATION */}
            <img
              src="/logo.svg"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="font-semibold text-slate-900 text-lg tracking-tight">AC Admin</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/' || item.path === '/orders'}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={20} strokeWidth={2} />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}

          {/* Separator for "Add Product" */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <NavLink
              to="/add-product"
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                }`
              }
            >
              <PlusCircle size={20} strokeWidth={2} />
              <span className="font-medium">Add Product</span>
            </NavLink>
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} strokeWidth={2} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}