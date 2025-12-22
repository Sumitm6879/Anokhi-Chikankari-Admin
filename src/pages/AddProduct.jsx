import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Toaster, toast } from 'sonner';
import {
  Save,
  Image as ImageIcon,
  Loader2,
  Trash2,
  AlertCircle,
  Check,
  PackageOpen,
  Search,
  X
} from 'lucide-react';

export default function AddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 1. Metadata State
  const [meta, setMeta] = useState({
    categories: [], fabrics: [], designs: [], colors: [], sizes: []
  });

  // 2. Local State
  const [selectedColorIds, setSelectedColorIds] = useState([]);
  const [colorImages, setColorImages] = useState({});
  const [colorSearch, setColorSearch] = useState('');

  // 3. Form Setup
  const { register, handleSubmit, watch, setValue, formState: { dirtyFields } } = useForm({
    defaultValues: { name: '', price: '', category_id: '', fabric_id: '', design_id: '', description: '' }
  });

  const watchedName = watch('name');

  // 4. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      const [cats, fabs, des, cols, siz] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('fabrics').select('*'),
        supabase.from('designs').select('*'),
        supabase.from('colors').select('*'),
        supabase.from('sizes').select('*').order('name'),
      ]);

      setMeta({
        categories: cats.data || [],
        fabrics: fabs.data || [],
        designs: des.data || [],
        colors: cols.data || [],
        sizes: siz.data || []
      });
    };
    fetchData();
  }, []);

  // 5. Auto SKU Generator
  useEffect(() => {
    if (!watchedName) return;
    const slug = watchedName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    selectedColorIds.forEach(colorId => {
      const colorName = meta.colors.find(c => c.id === colorId)?.name.toLowerCase();
      meta.sizes.forEach(size => {
        const fieldName = `variants.${colorId}.${size.id}.sku`;
        if (!dirtyFields.variants?.[colorId]?.[size.id]?.sku) {
          setValue(fieldName, `${slug}-${colorName}-${size.name}`);
        }
      });
    });
  }, [watchedName, selectedColorIds, meta.colors, meta.sizes, setValue, dirtyFields]);

  // 6. CLOUDINARY WIDGET
  const openWidget = (colorId) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Missing Cloudinary credentials");
      return;
    }

    const myWidget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        sources: ['local', 'url'],
        multiple: true,
        maxImageFileSize: 10000000,
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#E2E8F0",
            tabIcon: "#0F172A",
            menuIcons: "#0F172A",
            textDark: "#0F172A",
            textLight: "#FFFFFF",
            link: "#4F46E5",
            action: "#4F46E5",
            inactiveTabIcon: "#64748B",
            error: "#EF4444",
            inProgress: "#3B82F6",
            complete: "#22C55E",
            sourceBg: "#F8FAFC"
          }
        }
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          setColorImages(prev => ({
            ...prev,
            [colorId]: [...(prev[colorId] || []), result.info.secure_url]
          }));
        }
      }
    );
    myWidget.open();
  };

  // 7. Submit Logic
  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      if (selectedColorIds.length === 0) throw new Error("Please select at least one color");

      for (const colorId of selectedColorIds) {
        if (!colorImages[colorId] || colorImages[colorId].length === 0) {
          const colorName = meta.colors.find(c => c.id === colorId)?.name;
          throw new Error(`Please upload images for ${colorName}`);
        }
      }

      // A. Create Product
      const { data: product, error: pError } = await supabase
        .from('products')
        .insert({
          name: formData.name, description: formData.description, price: parseFloat(formData.price),
          category_id: formData.category_id, fabric_id: formData.fabric_id, design_id: formData.design_id, is_active: true
        })
        .select().single();

      if (pError) throw pError;

      // B. Insert Images
      const allImages = [];
      selectedColorIds.forEach((colorId, colorIndex) => {
        const imagesForColor = colorImages[colorId] || [];
        imagesForColor.forEach((url, imgIndex) => {
          allImages.push({
            product_id: product.id, color_id: colorId, image_url: url, is_primary: colorIndex === 0 && imgIndex === 0
          });
        });
      });

      if (allImages.length > 0) {
        await supabase.from('product_images').insert(allImages);
      }

      // C. Insert Variants
      const variantsToInsert = [];
      selectedColorIds.forEach(colorId => {
        meta.sizes.forEach(size => {
          const vData = formData.variants?.[colorId]?.[size.id];
          const qty = parseInt(vData?.stock || 0);
          if (qty > 0) {
            variantsToInsert.push({
              product_id: product.id, color_id: colorId, size_id: size.id,
              stock_quantity: qty, sku: vData?.sku
            });
          }
        });
      });

      if (variantsToInsert.length > 0) {
        await supabase.from('product_variants').insert(variantsToInsert);
      }

      toast.success("Product launched successfully!");
      navigate('/');

    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleColor = (id) => {
    setSelectedColorIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const removeImage = (colorId, indexToRemove) => {
    setColorImages(prev => ({
      ...prev,
      [colorId]: prev[colorId].filter((_, i) => i !== indexToRemove)
    }));
  };

  const filteredColors = meta.colors.filter(c =>
    c.name.toLowerCase().includes(colorSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto pb-32 pt-6 px-6">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Product</h1>
            <p className="text-slate-500 mt-1">Add a new style to your collection</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: Main Info */}
        <div className="lg:col-span-8 space-y-8">

          {/* 1. Basic Details Card */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <PackageOpen size={20} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Product Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Product Name</label>
                <input {...register('name', { required: "Name is required" })} className="input-field" placeholder="e.g. Mul Cotton Straight Kurti" />
              </div>

              <div>
                <label className="label">Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                  <input type="number" {...register('price', { required: "Price is required" })} className="input-field pl-8" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="label">Category</label>
                <div className="relative">
                  <select {...register('category_id', { required: "Category is required" })} className="input-field appearance-none bg-white">
                    <option value="">Select Category</option>
                    {meta.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Fabric</label>
                <div className="relative">
                  <select {...register('fabric_id', { required: "Fabric is required" })} className="input-field appearance-none bg-white">
                    <option value="">Select Fabric</option>
                    {meta.fabrics.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Design Pattern</label>
                <div className="relative">
                  <select {...register('design_id', { required: "Design is required" })} className="input-field appearance-none bg-white">
                    <option value="">Select Pattern</option>
                    {meta.designs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="input-field resize-none"
                  placeholder="Describe the product material, fit, and style..."
                ></textarea>
              </div>
            </div>
          </section>

          {/* 3. Dynamic Color Sections */}
          <div className="space-y-6">
            {selectedColorIds.map((colorId, idx) => {
              const color = meta.colors.find(c => c.id === colorId);
              const myImages = colorImages[colorId] || [];

              return (
                <section key={colorId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full shadow-inner ring-1 ring-black/10" style={{ backgroundColor: color?.hex_code }}></div>
                      <h3 className="font-semibold text-slate-900 text-lg">{color?.name} Configuration</h3>
                    </div>
                    <button type="button" onClick={() => toggleColor(colorId)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Images Column */}
                    <div className="xl:col-span-1 space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-900">Gallery</label>
                        <span className="text-xs font-medium text-slate-400">{myImages.length} images</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {myImages.map((url, i) => (
                          <div key={i} className="group relative aspect-3/4 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <button
                              type="button"
                              onClick={() => removeImage(colorId, i)}
                              className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => openWidget(colorId)}
                          className="aspect-3/4 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
                        >
                          <div className="p-3 bg-slate-50 rounded-full mb-2 group-hover:bg-white group-hover:shadow-sm transition-all">
                            <ImageIcon size={20} />
                          </div>
                          <span className="text-xs font-medium">Add Photo</span>
                        </button>
                      </div>
                    </div>

                    {/* Inventory Matrix Column */}
                    <div className="xl:col-span-2">
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/60">
                        <label className="text-sm font-semibold text-slate-900 mb-4 block">Stock & SKU Management</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {meta.sizes.map(size => (
                            <div key={size.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex justify-between">
                                {size.name}
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 block">Quantity</label>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    {...register(`variants.${colorId}.${size.id}.stock`)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 block">SKU Code</label>
                                  <input
                                    type="text"
                                    {...register(`variants.${colorId}.${size.id}.sku`)}
                                    className="w-full px-2 py-1 bg-transparent border-b border-dashed border-slate-300 rounded-none text-xs text-slate-500 focus:border-indigo-500 focus:text-indigo-600 outline-none transition-all font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar/Status */}
        {/* CHANGED: Made the WHOLE sidebar sticky, not individual cards */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 lg:h-fit">

          {/* Color Picker Card */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Color Variants</h2>
            <p className="text-sm text-slate-500 mb-4">Select all colors available for this product.</p>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search colors..."
                value={colorSearch}
                onChange={(e) => setColorSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <div
              className="space-y-3 overflow-y-auto pr-2"
              style={{ maxHeight: '300px', scrollbarWidth: 'thin' }}
            >
              {filteredColors.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No colors found</div>
              ) : (
                filteredColors.map(col => {
                  const isSelected = selectedColorIds.includes(col.id);
                  return (
                    <button
                      type="button"
                      key={col.id}
                      onClick={() => toggleColor(col.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group ${isSelected
                          ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border ${isSelected ? 'border-white/20' : 'border-slate-200'}`} style={{ backgroundColor: col.hex_code }}></div>
                        <span className="font-medium text-left">{col.name}</span>
                      </div>
                      {isSelected && <Check size={16} className="text-white shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {selectedColorIds.length === 0 && (
              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-800">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm">Please select at least one color to begin adding inventory.</p>
              </div>
            )}
          </section>

          {/* Action Buttons - FIXED BOTTOM MOBILE / STATIC DESKTOP */}
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-slate-200 lg:static lg:z-auto lg:border-none lg:shadow-none lg:p-0 lg:bg-transparent">
            <div className="lg:bg-white lg:p-6 lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm">
              <div className="hidden lg:block mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Publishing</h2>
                <p className="text-sm text-slate-500">Ready to publish this product?</p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  <span>{loading ? 'Saving...' : 'Launch Product'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white text-slate-600 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <X size={20} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}