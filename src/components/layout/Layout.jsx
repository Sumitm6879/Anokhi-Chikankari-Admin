import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from './SideBar';
import { Menu } from 'lucide-react';

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Sidebar - Controlled by State */}
      <SideBar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">

        {/* Mobile Header (Only visible on small screens) */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
           <div className="flex items-center gap-3">
             <button
               onClick={() => setSidebarOpen(true)}
               className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
             >
               <Menu size={24} />
             </button>
             <span className="font-semibold text-slate-900">AC Admin</span>
           </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto transition-all duration-300">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}