import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  History,
  Search,
  Filter,
  User,
  Calendar,
  ShieldAlert,
  Edit3,
  Trash2,
  PlusCircle,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'create', 'update', 'delete'
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // 1 month retention is handled by DB policy/cron,
      // but we limit fetch to recent 500 for UI performance
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      toast.error('Failed to load logs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Action Badge
  const getActionStyle = (type) => {
    const t = type.toUpperCase();
    if (t.includes('CREATE') || t.includes('ADD')) return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <PlusCircle size={14} /> };
    if (t.includes('UPDATE') || t.includes('EDIT')) return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Edit3 size={14} /> };
    if (t.includes('DELETE') || t.includes('REMOVE')) return { bg: 'bg-red-100', text: 'text-red-700', icon: <Trash2 size={14} /> };
    if (t.includes('LOGIN')) return { bg: 'bg-purple-100', text: 'text-purple-700', icon: <ShieldAlert size={14} /> };
    return { bg: 'bg-slate-100', text: 'text-slate-600', icon: <FileText size={14} /> };
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.description?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.resource?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' || log.action_type.toLowerCase().includes(filter);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-6xl mx-auto pb-20 pt-6 px-6">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="text-indigo-600" /> Activity Logs
          </h1>
          <p className="text-slate-500">Audit trail of all admin actions (30-day retention).</p>
        </div>

        <div className="flex gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64"
            />
          </div>

          {/* Filter */}
          <div className="relative">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <select
               value={filter}
               onChange={(e) => setFilter(e.target.value)}
               className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
             >
               <option value="all">All Actions</option>
               <option value="create">Created</option>
               <option value="update">Updated</option>
               <option value="delete">Deleted</option>
             </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="4" className="p-12 text-center text-slate-400">No logs found matching criteria.</td></tr>
              ) : (
                filteredLogs.map((log) => {
                  const style = getActionStyle(log.action_type);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      {/* 1. Time */}
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <Calendar size={14} className="text-slate-400"/>
                           {new Date(log.created_at).toLocaleDateString()}
                           <span className="text-slate-300">|</span>
                           <Clock size={14} className="text-slate-400"/>
                           {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>

                      {/* 2. Action Badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-transparent ${style.bg} ${style.text}`}>
                          {style.icon}
                          {log.action_type}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider pl-1">{log.resource}</div>
                      </td>

                      {/* 3. Description */}
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-medium">{log.description}</div>
                        {log.meta_data && Object.keys(log.meta_data).length > 0 && (
                          <details className="mt-1">
                            <summary className="text-xs text-indigo-600 cursor-pointer hover:underline select-none">View Meta Data</summary>
                            <pre className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 text-[10px] text-slate-600 overflow-x-auto">
                              {JSON.stringify(log.meta_data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>

                      {/* 4. User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User size={16} />
                          </div>
                          <div className="max-w-37.5 truncate text-slate-600" title={log.user_email}>
                             {log.user_email || 'System'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}