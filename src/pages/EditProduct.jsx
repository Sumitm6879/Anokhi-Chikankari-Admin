import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Toaster, toast } from 'sonner';
import {
  Save,
  Image as ImageIcon,
  Loader2,
  Trash2,
  PackageOpen,
  Search,
  DollarSign,
  Globe,
  X,
  Check
} from 'lucide-react';

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 1. Metadata State
  const [meta, setMeta] = useState({
    categories: [], fabrics: [], designs: [], colors: [], sizes: [], tags: []
  });

  // 2. Local State for UI
  const [selectedColorIds, setSelectedColorIds] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [colorImages, setColorImages] = useState({});
  const [colorSearch, setColorSearch] = useState('');

  // 3. Form Setup (Added getValues to help with manual SKU check)
  const { register, handleSubmit, setValue, reset, watch, getValues, formState: { dirtyFields } } = useForm();

  // --- NEW: Handle Stock Changes & Auto-SKU ---
  const handleStockChange = (colorId, size, qty) => {
    // 1. If stock is less than 1 or empty, do nothing
    if (!qty || parseInt(qty) < 1) return;

    // 2. Check if SKU is already there (We don't overwrite existing SKUs)
    const skuFieldName = `variants.${colorId}.${size.id}.sku`;
    const currentSku = getValues(skuFieldName);
    if (currentSku) return;

    // 3. Generate SKU only if valid
    const productName = getValues('name') || '';
    const slug = productName.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const color = meta.colors.find(c => c.id === colorId);

    if (slug && color) {
         const colorName = color.name.toLowerCase().replace(/ /g, '-');
         const sizeName = size.name.toLowerCase();
         // SET THE SKU
         setValue(skuFieldName, `${slug}-${colorName}-${sizeName}`);
    }
  };

// 4. LOAD DATA
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // A. Metadata
        const [cats, fabs, des, cols, siz, tags] = await Promise.all([
          supabase.from('categories').select('*'),
          supabase.from('fabrics').select('*'),
          supabase.from('designs').select('*'),
          supabase.from('colors').select('*'),
          // Remove .order('name') as we will sort manually in JS
          supabase.from('sizes').select('*'),
          supabase.from('tags').select('*').order('name'),
        ]);

        // --- CUSTOM SORTING LOGIC ---
        const sizeOrder = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];

        const sortedSizes = (siz.data || []).sort((a, b) => {
          const indexA = sizeOrder.indexOf(a.name);
          const indexB = sizeOrder.indexOf(b.name);

          // If both are in our list, sort by the index
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          // If only A is in list, put A first
          if (indexA !== -1) return -1;
          // If only B is in list, put B first
          if (indexB !== -1) return 1;
          // Otherwise keep original order
          return 0;
        });
        // -----------------------------

        setMeta({
          categories: cats.data || [],
          fabrics: fabs.data || [],
          designs: des.data || [],
          colors: cols.data || [],
          sizes: sortedSizes, // Use the sorted array here
          tags: tags.data || []
        });

        // B. Fetch Product
        const { data: product, error } = await supabase
          .from('products')
          .select(`
            *,
            costs:product_costs(cost_price),
            p_tags:product_tags(tag_id),
            variants:product_variants(*),
            images:product_images(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!product) throw new Error("Product not found");

        // C. Populate Form
        reset({
          name: product.name,
          description: product.description,
          category_id: product.category_id,
          fabric_id: product.fabric_id,
          design_id: product.design_id,
          price: product.price,
          sale_price: product.sale_price,
          cost_price: product.costs?.[0]?.cost_price || '',
          is_on_sale: product.is_on_sale,
          meta_title: product.meta_title,
          meta_description: product.meta_description,
          keywords: product.keywords ? product.keywords.join(', ') : ''
        });

        // D. Populate Tags
        if (product.p_tags) {
          setSelectedTagIds(product.p_tags.map(t => t.tag_id));
        }

        // E. Populate Images & Variants
        const activeColors = new Set();
        const imgMap = {};

        if (product.images) {
          product.images.sort((a, b) => (b.is_primary === a.is_primary) ? 0 : b.is_primary ? 1 : -1);
          product.images.forEach(img => {
            if (img.color_id) {
              activeColors.add(img.color_id);
              if (!imgMap[img.color_id]) imgMap[img.color_id] = [];
              imgMap[img.color_id].push(img.image_url);
            }
          });
        }

        if (product.variants) {
          product.variants.forEach(v => {
            activeColors.add(v.color_id);
            setValue(`variants.${v.color_id}.${v.size_id}.stock`, v.stock_quantity);
            setValue(`variants.${v.color_id}.${v.size_id}.sku`, v.sku);
          });
        }

        setSelectedColorIds(Array.from(activeColors));
        setColorImages(imgMap);

      } catch (error) {
        toast.error("Error loading product");
        console.error(error);
      } finally {
        setFetching(false);
      }
    };
    loadAllData();
  }, [id, reset, setValue]);

  // 5. HELPER FUNCTIONS
  const openWidget = (colorId) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) return toast.error("Missing Cloudinary credentials");

    window.cloudinary.createUploadWidget(
      { cloudName, uploadPreset, sources: ['local', 'url'], multiple: true, maxImageFileSize: 10000000 },
      (error, result) => {
        if (!error && result && result.event === "success") {
          setColorImages(prev => ({ ...prev, [colorId]: [...(prev[colorId] || []), result.info.secure_url] }));
        }
      }
    ).open();
  };

  const toggleColor = (id) => setSelectedColorIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  const toggleTag = (id) => setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  const removeImage = (colorId, index) => setColorImages(prev => ({ ...prev, [colorId]: prev[colorId].filter((_, i) => i !== index) }));

  const filteredColors = meta.colors.filter(c => c.name.toLowerCase().includes(colorSearch.toLowerCase()));

  // 6. SUBMIT LOGIC (Final Version)
  const onUpdate = async (formData) => {
    setLoading(true);
    try {
      if (selectedColorIds.length === 0) throw new Error("Select at least one color");

      const keywordsArray = formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean) : [];

      // --- STEP 0: PRE-VALIDATE SKUs ---
      const skusToCheck = [];
      selectedColorIds.forEach(colorId => {
        meta.sizes.forEach(size => {
          const sku = formData.variants?.[colorId]?.[size.id]?.sku?.trim();
          if (sku) skusToCheck.push(sku);
        });
      });

      if (skusToCheck.length > 0) {
        // Check for SKU conflicts with OTHER products
        const { data: conflicts } = await supabase
          .from('product_variants')
          .select('sku, products(name)')
          .in('sku', skusToCheck)
          .neq('product_id', id);

        if (conflicts && conflicts.length > 0) {
          const conflict = conflicts[0];
          throw new Error(`SKU '${conflict.sku}' is already taken by product "${conflict.products?.name}".`);
        }
      }

      // --- STEP A: Update Product ---
      const { error: pError } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          is_on_sale: formData.is_on_sale,
          category_id: formData.category_id,
          fabric_id: formData.fabric_id,
          design_id: formData.design_id,
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          keywords: keywordsArray
        })
        .eq('id', id);

      if (pError) throw pError;

      // --- STEP B: Update Extras ---
      if (formData.cost_price) {
        await supabase.from('product_costs').upsert({ product_id: id, cost_price: parseFloat(formData.cost_price) });
      }

      await supabase.from('product_tags').delete().eq('product_id', id);
      if (selectedTagIds.length > 0) {
        await supabase.from('product_tags').insert(selectedTagIds.map(tid => ({ product_id: id, tag_id: tid })));
      }

      await supabase.from('product_images').delete().eq('product_id', id);
      const allImages = [];
      selectedColorIds.forEach((colorId, idx) => {
        (colorImages[colorId] || []).forEach((url, i) => {
          allImages.push({ product_id: id, color_id: colorId, image_url: url, is_primary: idx === 0 && i === 0 });
        });
      });
      if (allImages.length > 0) await supabase.from('product_images').insert(allImages);

      // --- STEP C: VARIANTS ---

      // 1. Fetch Fresh IDs
      const { data: currentDbVariants } = await supabase
        .from('product_variants')
        .select('id, color_id, size_id')
        .eq('product_id', id);

      const dbVariantMap = {};
      currentDbVariants?.forEach(v => {
        dbVariantMap[`${v.color_id}-${v.size_id}`] = v.id;
      });

      // 2. Soft Delete removed variants
      const variantsToDelete = currentDbVariants
        ?.filter(v => !selectedColorIds.includes(v.color_id))
        .map(v => v.id) || [];

      if (variantsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('product_variants').delete().in('id', variantsToDelete);
        if (deleteError) {
           await supabase.from('product_variants').update({ stock_quantity: 0 }).in('id', variantsToDelete);
        }
      }

      // 3. Prepare Batches
      const updates = [];
      const inserts = [];

      selectedColorIds.forEach(colorId => {
        meta.sizes.forEach(size => {
          const vData = formData.variants?.[colorId]?.[size.id];
          // Prevent negative values from form data
          const rawQty = parseInt(vData?.stock || 0);
          const qty = rawQty > 0 ? rawQty : 0;
          const sku = vData?.sku;

          const existingId = dbVariantMap[`${colorId}-${size.id}`];

          const payload = {
            product_id: id,
            color_id: colorId,
            size_id: size.id,
            stock_quantity: qty,
            sku: sku
          };

          if (existingId) {
            updates.push({ ...payload, id: existingId });
          } else {
            inserts.push(payload);
          }
        });
      });

      // 4. Execute
      if (updates.length > 0) {
        const { error: updateError } = await supabase.from('product_variants').upsert(updates);
        if (updateError) throw updateError;
      }

      if (inserts.length > 0) {
        // Safe Upsert for inserts
        const { error: insertError } = await supabase.from('product_variants').upsert(inserts, { onConflict: 'product_id,color_id,size_id' });
        if (insertError) throw insertError;
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

  if (fetching) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto pb-32 pt-6 px-6">
      <Toaster position="top-right" richColors />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Edit Product</h1>
      </div>

      <form onSubmit={handleSubmit(onUpdate)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">

          {/* 1. BASIC INFO */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><PackageOpen size={20} /></div>
              <h2 className="text-lg font-semibold text-slate-900">Basic Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Product Name</label>
                <input {...register('name', { required: true })} className="input-field" />
              </div>
              <div>
                <label className="label">Category</label>
                <select {...register('category_id', { required: true })} className="input-field bg-white">
                  <option value="">Select Category</option>
                  {meta.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fabric</label>
                <select {...register('fabric_id', { required: true })} className="input-field bg-white">
                  <option value="">Select Fabric</option>
                  {meta.fabrics.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Design</label>
                <select {...register('design_id', { required: true })} className="input-field bg-white">
                  <option value="">Select Design</option>
                  {meta.designs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea {...register('description')} rows={3} className="input-field" />
              </div>
            </div>
          </section>

          {/* 2. PRICING STRATEGY */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
              <h2 className="text-lg font-semibold text-slate-900">Pricing & Strategy</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="label">Base Price (₹)</label>
                <input type="number" step="0.01" {...register('price', { required: true })} className="input-field" placeholder="0.00" />
              </div>
              <div>
                <label className="label">Sale Price (₹) <span className="text-xs text-slate-400 font-normal">(Optional)</span></label>
                <input type="number" step="0.01" {...register('sale_price')} className="input-field" placeholder="0.00" />
              </div>
              <div>
                <label className="label">Cost Price (₹) <span className="text-xs text-slate-400 font-normal">(Internal)</span></label>
                <input type="number" step="0.01" {...register('cost_price')} className="input-field bg-slate-50 border-slate-200" placeholder="0.00" />
              </div>
              <div className="md:col-span-3">
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" {...register('is_on_sale')} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                  <span className="font-medium text-slate-700">Activate "On Sale" Status</span>
                </label>
              </div>
            </div>
          </section>

          {/* 3. SEO & TAGS */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Globe size={20} /></div>
              <h2 className="text-lg font-semibold text-slate-900">SEO & Metadata</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Meta Title</label>
                <input {...register('meta_title')} className="input-field" />
              </div>
              <div>
                <label className="label">Meta Description</label>
                <textarea {...register('meta_description')} rows={2} className="input-field" />
              </div>
              <div>
                <label className="label">Keywords <span className="text-xs text-slate-400">(Comma separated)</span></label>
                <input {...register('keywords')} className="input-field" />
              </div>
              {/* TAGS UI */}
              <div>
                <label className="label mb-2 block">Product Tags</label>
                <div className="flex flex-wrap gap-2">
                  {meta.tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedTagIds.includes(tag.id)
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 4. VARIANTS */}
          <div className="space-y-6">
            {selectedColorIds.map((colorId, idx) => {
              const color = meta.colors.find(c => c.id === colorId);
              const myImages = colorImages[colorId] || [];
              return (
                <section key={colorId} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 font-semibold text-lg">
                      <div className="w-5 h-5 rounded-full border border-slate-200" style={{ backgroundColor: color?.hex_code }}></div>
                      {color?.name}
                    </div>
                    <button type="button" onClick={() => toggleColor(colorId)} className="text-slate-400 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Images */}
                    <div>
                      <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                        {myImages.map((url, i) => (
                          <div key={i} className="relative w-20 h-24 shrink-0 group">
                            <img src={url} className="w-full h-full object-cover rounded-md border border-slate-200" />
                            <button type="button" onClick={() => removeImage(colorId, i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => openWidget(colorId)} className="w-20 h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-md text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                          <ImageIcon size={20} />
                          <span className="text-[10px] mt-1">Add</span>
                        </button>
                      </div>
                    </div>

                    {/* Stock Matrix */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {meta.sizes.map(size => (
                        <div key={size.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{size.name}</div>

                          {/* UPDATED STOCK INPUT: Validated & Trigger for SKU */}
                          <input
                            type="number"
                            min="0"
                            onKeyDown={(e) => { if(e.key === '-' || e.key === 'e') e.preventDefault(); }}
                            placeholder="Qty"
                            {...register(`variants.${colorId}.${size.id}.stock`, {
                                min: 0,
                                onChange: (e) => handleStockChange(colorId, size, e.target.value)
                            })}
                            className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs mb-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />

                          <input
                            type="text"
                            placeholder="SKU"
                            {...register(`variants.${colorId}.${size.id}.sku`)}
                            className="w-full bg-transparent border-b border-dashed border-slate-300 rounded-none px-0 py-0.5 text-[10px] focus:border-indigo-500 outline-none font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 lg:h-fit">
          {/* SIDEBAR: COLOR PICKER */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Variants</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input type="text" placeholder="Search colors..." value={colorSearch} onChange={(e) => setColorSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {filteredColors.map(col => (
                <button key={col.id} type="button" onClick={() => toggleColor(col.id)} className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${selectedColorIds.includes(col.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border border-slate-200" style={{ backgroundColor: col.hex_code }}></div>
                    <span className="text-sm font-medium">{col.name}</span>
                  </div>
                  {selectedColorIds.includes(col.id) && <Check size={14} />}
                </button>
              ))}
            </div>
          </section>

          <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 transition-all">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>{loading ? 'Updating...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}