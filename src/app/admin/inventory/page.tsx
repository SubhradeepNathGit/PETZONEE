"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Search, Edit2, Trash2, Package, Filter,
    CheckCircle2, X, Upload, Save, Loader2, Star,
    Tag, IndianRupee, Image as ImageIcon, AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/sidebar";
import { toast } from "react-toastify";
import Image from "next/image";

/* Types */
type Product = {
    id: string;
    name: string;
    description: string | null;
    old_price: number | null;
    discount_price: number | null;
    img_1: string | null;
    img_2: string | null;
    badge: string | null;
    rating: number | null;
    category: string | null;
    tags: string | null;
    created_at: string;
};

type ProductForm = Omit<Product, 'id' | 'created_at'> & { id?: string };

function ProductGridItem({ product, handleOpenModal, handleDelete }: {
    product: Product;
    handleOpenModal: (p: Product) => void;
    handleDelete: (id: string) => void;
}) {
    const [hover, setHover] = useState(false);

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="group bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/50 hover:bg-white/[0.04] transition-all duration-300 relative flex flex-col h-full shadow-lg"
        >
            {/* Badge */}
            {product.badge && (
                <div className="absolute top-3 left-3 z-10">
                    <span className="bg-[#FF7A7A] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                        {product.badge}
                    </span>
                </div>
            )}

            {/* Action Overlays - Always visible on small screens, hover on larger */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => handleOpenModal(product)}
                    className="p-2 bg-white/10 hover:bg-orange-500 text-white rounded-xl transition-colors backdrop-blur-md shadow-lg"
                    title="Edit Product"
                >
                    <Edit2 size={16} />
                </button>
                <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 bg-white/10 hover:bg-red-500 text-white rounded-xl transition-colors backdrop-blur-md shadow-lg"
                    title="Delete Product"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Image Preview */}
            <div className="aspect-[4/3] relative overflow-hidden bg-black/40 border-b border-white/5">
                {(hover && product.img_2) ? (
                    <Image
                        src={product.img_2}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : product.img_1 ? (
                    <Image
                        src={product.img_1}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-white/10">
                        <ImageIcon size={32} />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1 text-center bg-[#0a0a0a]/50">
                <h3 className="text-sm font-bold text-white leading-tight mb-2 group-hover:text-orange-400 transition-colors truncate">
                    {product.name}
                </h3>

                <div className="mb-2 flex justify-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                            key={idx}
                            size={12}
                            className={
                                idx < Math.round(product.rating || 0)
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-white/20 group-hover:text-white/40"
                            }
                        />
                    ))}
                </div>

                <div className="mt-auto flex items-center justify-center gap-2">
                    {product.old_price && (
                        <p className="text-white/30 text-xs line-through font-bold">₹{product.old_price.toLocaleString()}</p>
                    )}
                    <p className="text-sm font-black text-orange-400">₹{product.discount_price?.toLocaleString() || 0}</p>
                </div>
            </div>
        </div>
    );
}


export default function AdminInventoryPage() {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [me, setMe] = useState<{ name: string; avatar: string | null }>({ name: "Admin", avatar: null });

    const fetchProducts = useCallback(async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to fetch products");
        } else {
            setProducts(data || []);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('users').select('first_name, avatar_url').eq('id', user.id).maybeSingle();
                setMe({ name: profile?.first_name || "Admin", avatar: profile?.avatar_url || null });
            }
            await fetchProducts();
            setLoading(false);
        };
        init();
    }, [fetchProducts]);

    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category?.trim()).filter(Boolean));
        return ["all", ...Array.from(cats)];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.category?.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, search, categoryFilter]);

    const handleOpenModal = (product: Product | null = null) => {
        if (product) {
            setEditingProduct({ ...product });
        } else {
            setEditingProduct({
                name: "",
                description: "",
                old_price: 0,
                discount_price: 0,
                img_1: "",
                img_2: "",
                badge: "",
                rating: 5,
                category: "",
                tags: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            toast.error("Delete failed: " + error.message);
        } else {
            toast.success("Product removed");
            fetchProducts();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        setSubmitting(true);

        try {
            const productData = { ...editingProduct };
            // Ensure prices are numbers
            productData.old_price = Number(productData.old_price);
            productData.discount_price = Number(productData.discount_price);
            productData.rating = Number(productData.rating);

            if (productData.id) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', productData.id);
                if (error) throw error;
                toast.success("Product updated");
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);
                if (error) throw error;
                toast.success("Product added");
            }
            setIsModalOpen(false);
            fetchProducts();
        } catch (error: any) {
            toast.error("Operation failed: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                    <Sidebar role="admin" name={me.name} avatarUrl={me.avatar || undefined} />
                </aside>
                <main className="lg:ml-72 flex h-screen items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest tracking-widest">Inventory Manifest Synchronizing...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            <aside className="hidden lg:block w-72 fixed h-screen left-0 top-0 z-50">
                <Sidebar role="admin" name={me.name} avatarUrl={me.avatar || undefined} />
            </aside>

            <main className="lg:ml-72 p-6 md:p-10 space-y-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Inventory Management</h1>
                        <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.3em]">Control Stock & Product Listings</p>
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-3 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-500/20 transition-all font-bold uppercase text-xs tracking-widest group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Add New Product
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-white/[0.03] border border-white/10 p-4 rounded-3xl backdrop-blur-3xl">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input
                            type="text"
                            placeholder="Search products by name or category..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent border-none outline-none pl-12 pr-6 py-2 text-white text-sm font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                        <Filter size={16} className="text-orange-500 ml-2 mr-1 flex-shrink-0" />
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat as string)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all
                                    ${categoryFilter === cat ? 'bg-orange-500 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {filteredProducts.map((product) => (
                        <ProductGridItem key={product.id} product={product} handleOpenModal={handleOpenModal} handleDelete={handleDelete} />
                    ))}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]">
                        <Package className="w-20 h-20 text-white/5 mx-auto mb-6" />
                        <h3 className="text-2xl font-bold text-white/20 uppercase tracking-tighter">No products found</h3>
                        <p className="text-white/10 text-[11px] font-bold uppercase tracking-widest mt-2">Try adjusting your filters or add a new item</p>
                    </div>
                )}
            </main>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && editingProduct && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.9 }}
                            className="relative w-full max-w-4xl bg-zinc-900/50 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="mb-10">
                                <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">
                                    {editingProduct.id ? 'Edit Product' : 'Add New Product'}
                                </h2>
                                <p className="text-orange-500 text-[11px] font-bold uppercase tracking-[0.3em] mt-2 italic">Product identity & pricing profile</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Left Column */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Product Name</label>
                                            <input
                                                required
                                                value={editingProduct.name}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all font-bold"
                                                placeholder="Enter product title..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Original Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={editingProduct.old_price || 0}
                                                    onChange={(e) => setEditingProduct({ ...editingProduct, old_price: Number(e.target.value) })}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Discount Price (₹)</label>
                                                <input
                                                    required
                                                    type="number"
                                                    value={editingProduct.discount_price || 0}
                                                    onChange={(e) => setEditingProduct({ ...editingProduct, discount_price: Number(e.target.value) })}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all font-bold"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Category</label>
                                                <input
                                                    required
                                                    value={editingProduct.category || ''}
                                                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all font-bold placeholder:italic"
                                                    placeholder="Dog, Cat, etc..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Badge</label>
                                                <input
                                                    value={editingProduct.badge || ''}
                                                    onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all font-bold"
                                                    placeholder="New, Hot, Trending..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Description</label>
                                            <textarea
                                                rows={4}
                                                value={editingProduct.description || ''}
                                                onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] px-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all font-bold resize-none"
                                                placeholder="Tell customers about the product..."
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Primary Image URL</label>
                                            <div className="flex gap-4">
                                                <div className="relative flex-1">
                                                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                                    <input
                                                        value={editingProduct.img_1 || ''}
                                                        onChange={(e) => setEditingProduct({ ...editingProduct, img_1: e.target.value })}
                                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all text-xs"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Secondary Image URL</label>
                                            <div className="flex gap-4">
                                                <div className="relative flex-1">
                                                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                                    <input
                                                        value={editingProduct.img_2 || ''}
                                                        onChange={(e) => setEditingProduct({ ...editingProduct, img_2: e.target.value })}
                                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all text-xs"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Initial Rating</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="5"
                                                    value={editingProduct.rating || 5}
                                                    onChange={(e) => setEditingProduct({ ...editingProduct, rating: Number(e.target.value) })}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-white/40 tracking-widest ml-4">Tags</label>
                                                <input
                                                    value={editingProduct.tags || ''}
                                                    onChange={(e) => setEditingProduct({ ...editingProduct, tags: e.target.value })}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-orange-500/50 transition-all font-bold"
                                                    placeholder="tag1, tag2..."
                                                />
                                            </div>
                                        </div>

                                        {/* Preview Card */}
                                        <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6">
                                            <div className="flex items-center gap-6">
                                                <div className="flex gap-2">
                                                    <div className="w-16 h-16 rounded-xl bg-black overflow-hidden relative border border-white/10">
                                                        {editingProduct.img_1 ? (
                                                            <Image src={editingProduct.img_1} alt="Primary Preview" fill className="object-cover" />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-white/10"><ImageIcon size={16} /></div>
                                                        )}
                                                    </div>
                                                    <div className="w-16 h-16 rounded-xl bg-black overflow-hidden relative border border-white/10">
                                                        {editingProduct.img_2 ? (
                                                            <Image src={editingProduct.img_2} alt="Secondary Preview" fill className="object-cover" />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-white/5"><ImageIcon size={16} /></div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-bold text-sm">{editingProduct.name || 'Untitled'}</p>
                                                    <p className="text-orange-500 text-[10px] font-bold uppercase">{editingProduct.category || 'No Category'}</p>
                                                    <p className="text-white/40 text-[10px] font-bold mt-1">₹{editingProduct.discount_price?.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-6 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-10 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={submitting}
                                        type="submit"
                                        className="flex items-center gap-3 px-12 py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl shadow-xl shadow-orange-500/20 transition-all font-bold uppercase text-xs tracking-[0.2em] disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        {editingProduct.id ? 'Save Changes' : 'Create Product'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

