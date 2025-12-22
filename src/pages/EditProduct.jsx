import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Toaster, toast } from 'sonner';
import {
  Save,
  Image as ImageIcon,
  Loader2,
  ArrowLeft,
  Trash2,
  AlertCircle,
  Check,
  PackageOpen,
  Search
} from 'lucide-react';

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 1. Metadata State
  const [meta, setMeta] = useState({
    categories: [], fabrics: [], designs: [], colors: [], sizes: []
  });

  // 2. Local State
  const [selectedColorIds, setSelectedColorIds] = useState([]);
  const [colorImages, setColorImages] = useState({});
  const [colorSearch, setColorSearch] = useState('');

  // 3. Form Setup
  const { register, handleSubmit, setValue, reset, watch, getValues, formState: { dirtyFields } } = useForm();
  const watchedName = watch('name');

  // 4. LOAD DATA (Metadata + Product)
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // A. Fetch Metadata
        const [cats, fabs, des, cols, siz] = await Promise.all([
          supabase.from('categories').select('*'),
          supabase.from('fabrics').select('*'),
          supabase.from('designs').select('*'),
          supabase.from('colors').select('*'),
          supabase.from('sizes').select('*').order('name'),
        ]);

        setMeta({
          categories: cats.data || [], fabrics: fabs.data || [],
          designs: des.data || [], colors: cols.data || [], sizes: siz.data || []
        });

        // B. Fetch Product
        const { data: product, error } = await supabase
          .from('products')
          .select(`*, variants:product_variants(*), images:product_images(*)`)
          .eq('id', id)
          .single();

        if (error) throw error;

        // C. Populate Form
        reset({
          name: product.name,
          price: product.price,
          description: product.description,
          category_id: product.category_id,
          fabric_id: product.fabric_id,
          design_id: product.design_id,
        });

        // D. Reconstruct State (Colors & Images)
        const activeColors = new Set();
        const imgMap = {};

        // Process Images
        if (product.images) {
          product.images.forEach(img => {
            if (img.color_id) {
              activeColors.add(img.color_id);
              if (!imgMap[img.color_id]) imgMap[img.color_id] = [];
              if (!imgMap[img.color_id].includes(img.image_url)) {
                 imgMap[img.color_id].push(img.image_url);
              }
            }
          });
        }

        // Process Variants (in case a color has stock but no images yet)
        if (product.variants) {
          product.variants.forEach(v => activeColors.add(v.color_id));
        }

        setSelectedColorIds(Array.from(activeColors));
        setColorImages(imgMap);

        // E. Populate Matrix Inputs
        if (product.variants) {
          product.variants.forEach(v => {
            setValue(`variants.${v.color_id}.${v.size_id}.stock`, v.stock_quantity);
            setValue(`variants.${v.color_id}.${v.size_id}.sku`, v.sku);
          });
        }

      } catch (error) {
        toast.error("Error loading product details");
        console.error(error);
      } finally {
        setFetching(false);
      }
    };

    loadAllData();
  }, [id, reset, setValue]);

  // 5. AUTO SKU GENERATOR (Crucial for Edit Mode)
  useEffect(() => {
    if (!watchedName) return;
    const slug = watchedName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    selectedColorIds.forEach(colorId => {
      const colorName = meta.colors.find(c => c.id === colorId)?.name.toLowerCase();
      if (!colorName) return;

      meta.sizes.forEach(size => {
        const fieldName = `variants.${colorId}.${size.id}.sku`;
        const currentSku = getValues(fieldName);

        // Only generate if the field is empty (preserves existing SKUs)
        if (!currentSku) {
          setValue(fieldName, `${slug}-${colorName}-${size.name}`);
        }
      });
    });
  }, [watchedName, selectedColorIds, meta.colors, meta.sizes, setValue, getValues]);


  // 6. Cloudinary Widget
  const openWidget = (colorId) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Missing Cloudinary credentials");
      return;
    }

    const myWidget = window.cloudinary.createUploadWidget(
      {
        cloudName, uploadPreset,
        sources: ['local', 'url'], multiple: true, maxImageFileSize: 10000000,
        styles: { palette: { window: "#FFFFFF", sourceBg: "#F8FAFC", action: "#4F46E5" } }
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

  // 7. UPDATE LOGIC
  const onUpdate = async (formData) => {
    setLoading(true);
    try {
      if (selectedColorIds.length === 0) throw new Error("Please select at least one color");

      // A. Update Basic Details
      const { error: pError } = await supabase
        .from('products')
        .update({
          name: formData.name, description: formData.description, price: parseFloat(formData.price),
          category_id: formData.category_id, fabric_id: formData.fabric_id, design_id: formData.design_id
        })
        .eq('id', id);

      if (pError) throw pError;

      // B. Update Images (Unlink All -> Re-link New)
      await supabase.from('product_images').delete().eq('product_id', id);

      const allImages = [];
      selectedColorIds.forEach((colorId, colorIndex) => {
        const imagesForColor = colorImages[colorId] || [];
        imagesForColor.forEach((url, imgIndex) => {
          allImages.push({
            product_id: id, color_id: colorId, image_url: url,
            is_primary: colorIndex === 0 && imgIndex === 0
          });
        });
      });
      if (allImages.length > 0) await supabase.from('product_images').insert(allImages);

      // C. Update Variants (Smart Upsert)
      const variantsToUpsert = [];

      selectedColorIds.forEach(colorId => {
        meta.sizes.forEach(size => {
          const vData = formData.variants?.[colorId]?.[size.id];
          const qty = vData?.stock !== "" ? parseInt(vData?.stock || 0) : null;

          // Fallback SKU Generator (Safety Net)
          let finalSku = vData?.sku;
          if (!finalSku) {
             const colorName = meta.colors.find(c => c.id === colorId)?.name.toLowerCase();
             const slug = formData.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
             finalSku = `${slug}-${colorName}-${size.name}`;
          }

          if (qty !== null && !isNaN(qty)) {
            variantsToUpsert.push({
              product_id: id,
              color_id: colorId,
              size_id: size.id,
              stock_quantity: qty,
              sku: finalSku // Use the ensured SKU
            });
          }
        });
      });

      if (variantsToUpsert.length > 0) {
        // 1. Delete removed colors
        const keptColorIds = selectedColorIds;
        if (keptColorIds.length > 0) {
             await supabase
            .from('product_variants')
            .delete()
            .eq('product_id', id)
            .not('color_id', 'in', `(${keptColorIds.join(',')})`);
        }

        // 2. Upsert active variants
        const { error: vError } = await supabase
          .from('product_variants')
          .upsert(variantsToUpsert, {
            onConflict: 'product_id, color_id, size_id'
          });

        if (vError) throw vError;
      } else {
        await supabase.from('product_variants').delete().eq('product_id', id);
      }

      toast.success("Product updated successfully!");
      navigate('/products');

    } catch (error) {
      toast.error(error.message);
      console.error(error);
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

  if (fetching) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-500 font-medium">Loading product data...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-32 pt-6 px-6">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate(-1)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Edit Product</h1>
            <p className="text-slate-500 mt-1">Update details and inventory levels</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onUpdate)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-8">

          {/* 1. Basic Details */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><PackageOpen size={20} /></div>
              <h2 className="text-lg font-semibold text-slate-900">Product Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Product Name</label>
                <input {...register('name')} className="input-field" />
              </div>
              <div>
                <label className="label">Price (₹)</label>
                <input type="number" {...register('price')} className="input-field" />
              </div>
              <div>
                <label className="label">Category</label>
                <select {...register('category_id')} className="input-field appearance-none bg-white">
                    {meta.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fabric</label>
                <select {...register('fabric_id')} className="input-field appearance-none bg-white">
                    {meta.fabrics.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Design</label>
                <select {...register('design_id')} className="input-field appearance-none bg-white">
                    {meta.designs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea {...register('description')} rows={4} className="input-field resize-none" />
              </div>
            </div>
          </section>

          {/* 2. Color Sections */}
          <div className="space-y-6">
            {selectedColorIds.map((colorId, idx) => {
              const color = meta.colors.find(c => c.id === colorId);
              const myImages = colorImages[colorId] || [];

              return (
                <section key={colorId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full shadow-inner ring-1 ring-black/10" style={{ backgroundColor: color?.hex_code }}></div>
                      <h3 className="font-semibold text-slate-900 text-lg">{color?.name} Setup</h3>
                    </div>
                    <button type="button" onClick={() => toggleColor(colorId)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>

                  <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Images */}
                    <div className="xl:col-span-1 space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-900">Gallery</label>
                        <span className="text-xs font-medium text-slate-400">{myImages.length} images</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {myImages.map((url, i) => (
                          <div key={i} className="group relative aspect-3/4 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeImage(colorId, i)} className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => openWidget(colorId)} className="aspect-3/4 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                          <ImageIcon size={20} />
                          <span className="text-xs font-medium mt-2">Add Photo</span>
                        </button>
                      </div>
                    </div>

                    {/* Matrix */}
                    <div className="xl:col-span-2">
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/60">
                            <label className="text-sm font-semibold text-slate-900 mb-4 block">Inventory</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {meta.sizes.map(size => (
                                    <div key={size.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="text-xs font-bold text-slate-400 mb-3 uppercase flex justify-between">{size.name}</div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 block">Quantity</label>
                                                <input type="number" {...register(`variants.${colorId}.${size.id}.stock`)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="0" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 block">SKU</label>
                                                <input type="text" {...register(`variants.${colorId}.${size.id}.sku`)} className="w-full px-2 py-1 bg-transparent border-b border-dashed border-slate-300 rounded-none text-xs" placeholder="SKU" />
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

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4">
            {/* STICKY WRAPPER: Holds both Colors & Actions on Desktop */}
            <div className="space-y-6 lg:sticky lg:top-6">

                {/* Colors Card */}
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Color Variants</h2>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text" placeholder="Search colors..."
                            value={colorSearch} onChange={(e) => setColorSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '300px', scrollbarWidth: 'thin' }}>
                        {filteredColors.map(col => {
                            const isSelected = selectedColorIds.includes(col.id);
                            return (
                                <button type="button" key={col.id} onClick={() => toggleColor(col.id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border ${isSelected ? 'border-white/20' : 'border-slate-200'}`} style={{backgroundColor: col.hex_code}}></div>
                                        <span className="font-medium">{col.name}</span>
                                    </div>
                                    {isSelected && <Check size={16} className="text-white" />}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:static lg:z-auto lg:p-6 lg:rounded-2xl lg:border lg:shadow-sm">
                     <div className="hidden lg:block"><h2 className="text-lg font-semibold text-slate-900 mb-4">Publishing</h2></div>
                     <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                        <button type="submit" disabled={loading} className="w-full py-3.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> <span className="hidden sm:inline">Update Product</span><span className="sm:hidden">Update</span></>}
                        </button>
                        <button type="button" onClick={() => navigate('/products')} className="w-full py-3.5 bg-white text-slate-600 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                     </div>
                </div>

            </div>
        </div>
      </form>
    </div>
  );
}