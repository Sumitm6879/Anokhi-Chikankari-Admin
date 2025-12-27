import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  Tags,
  Palette,
  Layers,
  Scissors,
  Plus,
  Trash2,
  Loader2,
  Search,
  Hash // New Icon for Tags
} from 'lucide-react';

export default function Attributes() {
  const [activeTab, setActiveTab] = useState('categories');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', hex_code: '#000000' });
  const [search, setSearch] = useState('');

  // UPDATED: Added 'tags' to the list
  const tabs = [
    { id: 'categories', label: 'Categories', icon: Tags, table: 'categories' },
    { id: 'fabrics', label: 'Fabrics', icon: Scissors, table: 'fabrics' },
    { id: 'designs', label: 'Designs', icon: Layers, table: 'designs' },
    { id: 'colors', label: 'Colors', icon: Palette, table: 'colors' },
    { id: 'tags', label: 'Tags', icon: Hash, table: 'tags' }, // <--- NEW
  ];

  const currentTabInfo = tabs.find(t => t.id === activeTab);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from(currentTabInfo.table)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      toast.error(`Error loading ${currentTabInfo.label}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return toast.error("Name is required");

    setSubmitting(true);
    try {
      const payload = { name: newItem.name };
      if (activeTab === 'colors') {
        payload.hex_code = newItem.hex_code;
      }

      const { data: inserted, error } = await supabase
        .from(currentTabInfo.table)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setData(prev => [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name)));
      setNewItem({ name: '', hex_code: '#000000' });
      toast.success(`${currentTabInfo.label.slice(0, -1)} added successfully`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;

    try {
      const { error } = await supabase
        .from(currentTabInfo.table)
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '23503') {
          toast.error(
            `Cannot delete this ${currentTabInfo.label.slice(0, -1)}. It is currently assigned to one or more products.`
          );
          return;
        }
        throw error;
      }

      setData(prev => prev.filter(item => item.id !== id));
      toast.success("Item deleted successfully");

    } catch (error) {
      console.error(error);
      toast.error("Could not delete item. Please try again.");
    }
  };

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 mb-20">
      <Toaster position="top-right" richColors />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attributes</h1>
        <p className="text-slate-500">Manage your product classifications, variants, and tags.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${activeTab === tab.id
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-indigo-600" />
              Add New {currentTabInfo.label.slice(0, -1)}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder={`e.g. ${activeTab === 'colors' ? 'Midnight Blue' : activeTab === 'tags' ? 'Summer Sale' : 'New Item'}`}
                />
              </div>

              {activeTab === 'colors' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Color Picker</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={newItem.hex_code}
                      onChange={e => setNewItem({ ...newItem, hex_code: e.target.value })}
                      className="h-10 w-14 p-0.5 rounded border border-slate-200 cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={newItem.hex_code}
                      onChange={e => setNewItem({ ...newItem, hex_code: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm uppercase"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Item'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={`Search ${currentTabInfo.label.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : filteredData.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No items found.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredData.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      {activeTab === 'colors' ? (
                        <div className="w-10 h-10 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: item.hex_code }} />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                          <currentTabInfo.icon size={20} />
                        </div>
                      )}

                      <div>
                        <h3 className="font-medium text-slate-900">{item.name}</h3>
                        {activeTab === 'colors' && (
                          <p className="text-xs text-slate-400 font-mono uppercase">{item.hex_code}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete Item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}