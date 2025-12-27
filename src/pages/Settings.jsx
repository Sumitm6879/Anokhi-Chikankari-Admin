import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast, Toaster } from 'sonner';
import {
  Save,
  Loader2,
  Truck,
  Layout,
  Phone,
  Image as ImageIcon,
  Trash2,
  Upload,
  Link as LinkIcon,
  X
} from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // State Structure
  const [config, setConfig] = useState({
    store_name: '',
    support_phone: '',
    support_email: '',
    shipping_fee: 0,
    free_shipping_threshold: 0,
    banners: []
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setConfig(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load settings");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('store_settings')
        .upsert({ id: 1, ...config });

      if (error) throw error;
      toast.success("Store settings updated successfully!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- SUPABASE IMAGE UPLOAD LOGIC ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to 'banners' bucket
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data } = supabase.storage.from('banners').getPublicUrl(filePath);

      // 3. Add to state
      setConfig(prev => ({
        ...prev,
        banners: [...(prev.banners || []), {
          url: data.publicUrl,
          link: '',
          active: true
        }]
      }));

      toast.success("Banner uploaded!");
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
      // Reset input value so same file can be selected again if needed
      e.target.value = '';
    }
  };

  const removeBanner = (index) => {
    if (!window.confirm("Remove this banner?")) return;
    setConfig(prev => ({
      ...prev,
      banners: prev.banners.filter((_, i) => i !== index)
    }));
  };

  const updateBannerLink = (index, val) => {
    const newBanners = [...config.banners];
    newBanners[index].link = val;
    setConfig({...config, banners: newBanners});
  };

  if (fetching) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-32 pt-6 px-6 relative">
      <Toaster position="top-right" richColors />

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md py-4 mb-8 flex items-center justify-between border-b border-slate-200 -mx-6 px-6 shadow-sm">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Store Settings</h1>
           <p className="text-sm text-slate-500">Global configuration & appearance.</p>
        </div>
        <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-95 disabled:opacity-70"
        >
            {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
            Save Changes
        </button>
      </div>

      <div className="space-y-8">

        {/* --- TOP SECTION: FORMS (Grid Layout) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* 1. SHIPPING CONFIG */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Truck size={18}/></div>
                    <h2 className="font-semibold text-slate-900">Shipping Rules</h2>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Standard Fee (₹)</label>
                        <input
                            type="number"
                            min="0"
                            value={config.shipping_fee}
                            onChange={e => setConfig({...config, shipping_fee: e.target.value})}
                            className="w-full pl-3 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Free Shipping Above (₹)</label>
                        <input
                            type="number"
                            min="0"
                            value={config.free_shipping_threshold}
                            onChange={e => setConfig({...config, free_shipping_threshold: e.target.value})}
                            className="w-full pl-3 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                        />
                    </div>
                </div>
            </section>

            {/* 2. CONTACT INFO */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Phone size={18}/></div>
                    <h2 className="font-semibold text-slate-900">Contact Details</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Store Name</label>
                        <input
                            type="text"
                            value={config.store_name}
                            onChange={e => setConfig({...config, store_name: e.target.value})}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                            placeholder="My Awesome Brand"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Phone / WhatsApp</label>
                            <input
                                type="text"
                                value={config.support_phone}
                                onChange={e => setConfig({...config, support_phone: e.target.value})}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Email</label>
                            <input
                                type="email"
                                value={config.support_email}
                                onChange={e => setConfig({...config, support_email: e.target.value})}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>

        {/* --- BOTTOM SECTION: LARGE BANNER MANAGER --- */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl"><Layout size={24}/></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Homepage Banners</h2>
                        <p className="text-sm text-slate-500">Upload high-quality images for your main slider. (Recommended: 1920x600px)</p>
                    </div>
                </div>

                {/* Upload Button */}
                <div className="relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={uploading}
                    />
                    <button className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition-all shadow-md shadow-purple-200">
                        {uploading ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20}/>}
                        {uploading ? "Uploading..." : "Upload New Banner"}
                    </button>
                </div>
            </div>

            <div className="p-8 bg-slate-50 min-h-[300px]">
                {(!config.banners || config.banners.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-300 rounded-2xl bg-white/50 text-slate-400">
                        <ImageIcon size={48} className="mb-4 opacity-50"/>
                        <p className="text-lg font-medium text-slate-600">No active banners</p>
                        <p>Upload an image to get started</p>
                    </div>
                )}

                {/* Big Grid Layout for Banners */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {config.banners?.map((banner, index) => (
                        <div key={index} className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300">

                            {/* Large Image Preview */}
                            <div className="aspect-[21/9] w-full bg-slate-200 relative">
                                <img src={banner.url} alt="Banner" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <button
                                    onClick={() => removeBanner(index)}
                                    className="absolute top-4 right-4 p-2 bg-white text-red-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white transform hover:scale-110"
                                    title="Remove Banner"
                                >
                                    <X size={18}/>
                                </button>
                            </div>

                            {/* Banner Inputs */}
                            <div className="p-5">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <LinkIcon size={14}/> Redirect Link (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={banner.link || ''}
                                    onChange={(e) => updateBannerLink(index, e.target.value)}
                                    placeholder="e.g. /products/summer-sale"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

      </div>
    </div>
  );
}