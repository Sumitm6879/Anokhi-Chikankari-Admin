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
  X,
  DollarSign,
  Globe,
  Tag
} from 'lucide-react';

export default function AddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 1. Metadata State
  const [meta, setMeta] = useState({
    categories: [], fabrics: [], designs: [], colors: [], sizes: [], tags: []
  });

  // 2. Local State
  const [selectedColorIds, setSelectedColorIds] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [colorImages, setColorImages] = useState({});
  const [colorSearch, setColorSearch] = useState('');

  // 3. Form Setup
  const { register, handleSubmit, watch, setValue, formState: { dirtyFields } } = useForm({
    defaultValues: {
      name: '', description: '',
      price: '', sale_price: '', cost_price: '', is_on_sale: false,
      category_id: '', fabric_id: '', design_id: '',
      meta_title: '', meta_description: '', keywords: ''
    }
  });

  const watchedName = watch('name');

  // Helper to block negative inputs
  const preventNegative = (e) => {
    if (['-', 'e', 'E', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // 4. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      const [cats, fabs, des, cols, siz, tags] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('fabrics').select('*'),
        supabase.from('designs').select('*'),
        supabase.from('colors').select('*'),
        supabase.from('sizes').select('*').order('name'),
        supabase.from('tags').select('*').order('name'),
      ]);

      setMeta({
        categories: cats.data || [],
        fabrics: fabs.data || [],
        designs: des.data || [],
        colors: cols.data || [],
        sizes: siz.data || [],
        tags: tags.data || [],
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

  // 6. Cloudinary Widget
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

  // 7. Submit Logic
  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      if (selectedColorIds.length === 0) throw new Error("Please select at least one color");

      // Validations
      for (const colorId of selectedColorIds) {
        if (!colorImages[colorId] || colorImages[colorId].length === 0) {
          throw new Error(`Please upload images for ${meta.colors.find(c => c.id === colorId)?.name}`);
        }
      }

      const keywordsArray = formData.keywords
        ? formData.keywords.split(',').map(k => k.trim()).filter(k => k !== '')
        : [];

      // A. Create Product
      const { data: product, error: pError } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          is_on_sale: formData.is_on_sale,
          category_id: formData.category_id,
          fabric_id: formData.fabric_id,
          design_id: formData.design_id,
          is_active: true,
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          keywords: keywordsArray
        })
        .select().single();

      if (pError) throw pError;

      // B. Insert Cost Price
      if (formData.cost_price) {
        await supabase.from('product_costs').insert({
          product_id: product.id,
          cost_price: parseFloat(formData.cost_price)
        });
      }

      // C. Insert Tags
      if (selectedTagIds.length > 0) {
        const tagInserts = selectedTagIds.map(tagId => ({ product_id: product.id, tag_id: tagId }));
        await supabase.from('product_tags').insert(tagInserts);
      }

      // D. Insert Images
      const allImages = [];
      selectedColorIds.forEach((colorId, colorIndex) => {
        const imagesForColor = colorImages[colorId] || [];
        imagesForColor.forEach((url, imgIndex) => {
          allImages.push({
            product_id: product.id, color_id: colorId, image_url: url, is_primary: colorIndex === 0 && imgIndex === 0
          });
        });
      });
      if (allImages.length > 0) await supabase.from('product_images').insert(allImages);

      // E. Insert Variants
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
      if (variantsToInsert.length > 0) await supabase.from('product_variants').insert(variantsToInsert);

      toast.success("Product launched successfully!");
      navigate('/');

    } catch (error) {
      toast.error(error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleColor = (id) => setSelectedColorIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  const toggleTag = (id) => setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  const removeImage = (colorId, index) => setColorImages(prev => ({ ...prev, [colorId]: prev[colorId].filter((_, i) => i !== index) }));

  const filteredColors = meta.colors.filter(c => c.name.toLowerCase().includes(colorSearch.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto pb-32 pt-6 px-6">
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-bold text-slate-900">Create Product</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">

          {/* 1. MAIN INFO */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><PackageOpen size={20} /></div>
              <h2 className="text-lg font-semibold text-slate-900">Basic Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Product Name</label>
                <input {...register('name', { required: "Name is required" })} className="input-field" />
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

          {/* 2. PRICING & STRATEGY */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
              <h2 className="text-lg font-semibold text-slate-900">Pricing & Strategy</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="label">Base Price (₹)</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    onKeyDown={preventNegative}
                    {...register('price', { required: true, min: 0 })}
                    className="input-field"
                    placeholder="0.00"
                />
              </div>
              <div>
                <label className="label">Sale Price (₹) <span className="text-xs text-slate-400 font-normal">(Optional)</span></label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    onKeyDown={preventNegative}
                    {...register('sale_price', { min: 0 })}
                    className="input-field"
                    placeholder="0.00"
                />
              </div>
               <div>
                <label className="label">Cost Price (₹) <span className="text-xs text-slate-400 font-normal">(Internal)</span></label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    onKeyDown={preventNegative}
                    {...register('cost_price', { min: 0 })}
                    className="input-field bg-slate-50 border-slate-200"
                    placeholder="0.00"
                />
              </div>
              <div className="md:col-span-3">
                 <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" {...register('is_on_sale')} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                    <span className="font-medium text-slate-700">Activate "On Sale" Status</span>
                 </label>
              </div>
            </div>
          </section>

          {/* 3. SEO & METADATA */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Globe size={20} /></div>
              <h2 className="text-lg font-semibold text-slate-900">SEO & Metadata</h2>
            </div>
            <div className="space-y-4">
               <div>
                <label className="label">Meta Title</label>
                <input {...register('meta_title')} className="input-field" placeholder="SEO Title" />
              </div>
              <div>
                <label className="label">Meta Description</label>
                <textarea {...register('meta_description')} rows={2} className="input-field" placeholder="Short description..." />
              </div>
              <div>
                <label className="label">Keywords <span className="text-xs text-slate-400">(Comma separated)</span></label>
                <input {...register('keywords')} className="input-field" placeholder="cotton, summer, casual" />
              </div>
              {/* TAGS SELECTION */}
              <div>
                 <label className="label mb-2 block">Product Tags</label>
                 <div className="flex flex-wrap gap-2">
                    {meta.tags.map(tag => (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                selectedTagIds.includes(tag.id)
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {tag.name}
                        </button>
                    ))}
                    {meta.tags.length === 0 && <span className="text-xs text-slate-400">No tags available. Add them in Attributes.</span>}
                 </div>
              </div>
            </div>
          </section>

          {/* 4. VARIANTS & STOCK */}
          <div className="space-y-6">
            {selectedColorIds.map((colorId, idx) => {
               const color = meta.colors.find(c => c.id === colorId);
               const myImages = colorImages[colorId] || [];
               return (
                 <section key={colorId} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 font-semibold"><div className="w-4 h-4 rounded-full" style={{backgroundColor: color.hex_code}}></div> {color.name}</div>
                        <button type="button" onClick={() => toggleColor(colorId)}><Trash2 size={16} className="text-slate-400 hover:text-red-500"/></button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Images */}
                        <div>
                            <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                                {myImages.map((url, i) => (
                                    <div key={i} className="relative w-16 h-20 shrink-0">
                                        <img src={url} className="w-full h-full object-cover rounded-md" />
                                        <button type="button" onClick={() => removeImage(colorId, i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10}/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => openWidget(colorId)} className="w-16 h-20 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-md text-slate-400 hover:text-indigo-600 hover:border-indigo-400"><ImageIcon size={20}/></button>
                            </div>
                        </div>
                        {/* Stock Matrix with Negative Validation */}
                        <div className="grid grid-cols-3 gap-2">
                             {meta.sizes.map(size => (
                                 <div key={size.id} className="bg-slate-50 p-2 rounded border border-slate-200">
                                     <div className="text-[10px] font-bold text-slate-400 uppercase">{size.name}</div>
                                     <input
                                        type="number"
                                        min="0"
                                        onKeyDown={preventNegative}
                                        {...register(`variants.${colorId}.${size.id}.stock`, { min: 0 })}
                                        className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-xs mt-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="Qty"
                                     />
                                     <input
                                        type="text"
                                        {...register(`variants.${colorId}.${size.id}.sku`)}
                                        className="w-full bg-transparent border-b border-slate-300 rounded-none px-0 py-0.5 text-[10px] mt-1 font-mono focus:border-indigo-500 outline-none"
                                        placeholder="SKU"
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

        {/* SIDEBAR */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6 lg:h-fit">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Color Variants</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input type="text" placeholder="Search..." value={colorSearch} onChange={(e) => setColorSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
               {filteredColors.map(col => (
                  <button key={col.id} type="button" onClick={() => toggleColor(col.id)} className={`w-full flex items-center gap-3 p-2 rounded-lg border ${selectedColorIds.includes(col.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                      <div className="w-5 h-5 rounded-full border" style={{backgroundColor: col.hex_code}}></div>
                      <span className="text-sm font-medium">{col.name}</span>
                      {selectedColorIds.includes(col.id) && <Check size={14} className="ml-auto" />}
                  </button>
               ))}
            </div>
          </section>

          <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>{loading ? 'Publishing...' : 'Publish Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}