"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Heart,
    ShoppingCart,
    Star,
    X,
    ChevronLeft,
    ChevronRight,
    Truck,
    ShieldCheck,
    Minus,
    Plus,
    ArrowLeft
} from "lucide-react";
import { Product, ProductDetail } from "@/types/product";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const TABLE_NAME = "cart";

export default function ProductDetailsClient({
    product,
    details
}: {
    product: Product;
    details: ProductDetail[];
}) {
    const router = useRouter();
    const [activeImage, setActiveImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [selectedDetail, setSelectedDetail] = useState<ProductDetail | null>(
        details.length > 0 ? details[0] : null
    );

    // Drawer state
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [liked, setLiked] = useState(false);

    const images = [product.img_1, product.img_2].filter(Boolean);

    const closeDrawer = useCallback(() => {
        setOpen(false);
        setMsg(null);
    }, []);

    const goToCart = () => router.push("/cart");

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
        if (open) window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [open, closeDrawer]);

    // Auto-slide gallery logic
    useEffect(() => {
        if (images.length <= 1 || open) return;

        const interval = setInterval(() => {
            setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
        }, 4000); // Change image every 4 seconds

        return () => clearInterval(interval);
    }, [images.length, open]);

    const addToCart = async () => {
        try {
            setBusy(true);
            setMsg(null);

            const { data: userData, error: userErr } = await supabase.auth.getUser();
            if (userErr || !userData?.user) {
                setMsg("Please sign in to add items to your cart.");
                setOpen(true);
                return;
            }

            const user_id = userData.user.id;

            const { data: existing, error: fetchErr } = await supabase
                .from(TABLE_NAME)
                .select("id, quantity")
                .eq("user_id", user_id)
                .eq("product_id", product.id)
                .single();

            if (fetchErr && fetchErr.code !== "PGRST116") throw fetchErr;

            if (existing) {
                // Restore original "5 unit" limit
                if (existing.quantity >= 5) {
                    setMsg("Limit reached: Maximum 5 units allowed.");
                    setOpen(true);
                    return;
                }

                const newQuantity = Math.min(5, existing.quantity + quantity);

                const { error: updateErr } = await supabase
                    .from(TABLE_NAME)
                    .update({ quantity: newQuantity })
                    .eq("id", existing.id)
                    .eq("user_id", user_id);

                if (updateErr) throw updateErr;
                setMsg("Updated quantity in Cart");
            } else {
                const payload = {
                    user_id,
                    product_id: product.id,
                    name: product.name,
                    price: Number(product.discount_price ?? 0),
                    quantity: Math.min(5, quantity),
                    image_url: product.img_1 ?? null,
                    inserted_at: new Date().toISOString(),
                };

                const { error: insertErr } = await supabase
                    .from(TABLE_NAME)
                    .insert([payload]);
                if (insertErr) throw insertErr;
                setMsg("Added to Cart");
            }
            setOpen(true);
        } catch (e: any) {
            setMsg(e.message || "Something went wrong.");
            setOpen(true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-white pb-10">
            {/* Container - Tighter max-width and padding */}
            <div className="max-w-6xl mx-auto px-6 py-6 font-sans">

                {/* Navigation & Logo Sync Area (Compact) */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 transition-colors text-sm font-semibold"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Shop</span>
                    </button>

                    <nav className="hidden md:flex text-[13px] text-gray-400 font-medium">
                        <span className="hover:text-red-500 transition-colors cursor-pointer" onClick={() => router.push("/")}>Home</span>
                        <span className="mx-2">/</span>
                        <span className="hover:text-red-500 transition-colors cursor-pointer" onClick={() => router.push("/products")}>Products</span>
                        <span className="mx-2">/</span>
                        <span className="text-gray-900 font-bold">{product.name}</span>
                    </nav>
                </div>

                {/* Product Layout - More compact spacing */}
                <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

                    {/* Left: Premium Image Gallery */}
                    <div className="space-y-4">
                        <div className="relative aspect-[16/14] sm:aspect-square rounded-3xl overflow-hidden bg-white shadow-md border border-gray-50 group">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeImage}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                    className="relative w-full h-full"
                                >
                                    <Image
                                        src={images[activeImage] || "/images/placeholder.png"}
                                        alt={product.name}
                                        fill
                                        priority
                                        className="object-cover"
                                    />
                                </motion.div>
                            </AnimatePresence>

                            {/* Discrete Controls */}
                            {images.length > 1 && (
                                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                                        className="p-2 rounded-full bg-white/90 shadow-sm hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                                        className="p-2 rounded-full bg-white/90 shadow-sm hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}

                            {/* Heart Toggle */}
                            <button
                                onClick={() => setLiked(!liked)}
                                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 shadow text-gray-400 hover:text-red-500 transition-all hover:scale-110"
                            >
                                <Heart size={20} className={cn(liked && "fill-red-500 text-red-500")} />
                            </button>
                        </div>

                        {/* Subtle Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-3">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveImage(idx)}
                                        className={cn(
                                            "relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all p-1 bg-white shadow-sm",
                                            activeImage === idx ? "border-red-400" : "border-transparent opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <Image src={img} alt="thumb" fill className="object-contain p-1" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Refined Info Section */}
                    <div className="flex flex-col">
                        {/* Minimal Labels */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded-md bg-red-50 text-[10px] font-black tracking-widest text-red-500 uppercase">
                                {product.category}
                            </span>
                            <div className="flex items-center gap-1 text-yellow-500 text-[11px] font-bold">
                                <Star size={14} className="fill-current" />
                                <span>{product.rating?.toFixed(1) || "4.0"} Rating</span>
                            </div>
                        </div>

                        {/* Compact Title */}
                        <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3 tracking-tight">
                            {product.name}
                        </h1>

                        {/* Price Row */}
                        <div className="flex items-baseline gap-3 mb-6">
                            <span className="text-3xl font-bold text-gray-900">
                                ₹{Number(product.discount_price).toLocaleString()}
                            </span>
                            {product.old_price && (
                                <>
                                    <span className="text-lg text-gray-400 line-through">
                                        ₹{Number(product.old_price).toLocaleString()}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-[11px] font-bold">
                                        {Math.round(((product.old_price - product.discount_price) / product.old_price) * 100)}% OFF
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="h-px bg-gray-100 w-full mb-6" />

                        {/* Selections (Weighted/Size) */}
                        {details.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Available Options</h3>
                                <div className="flex flex-wrap gap-2">
                                    {details.map((d) => (
                                        <button
                                            key={d.id}
                                            onClick={() => setSelectedDetail(d)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl border text-[13px] font-bold transition-all",
                                                selectedDetail?.id === d.id
                                                    ? "border-red-500 bg-red-50 text-red-500 shadow-sm"
                                                    : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
                                            )}
                                        >
                                            {d.size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quantity Selector - Smaller */}
                        <div className="mb-8">
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quantity</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50/50">
                                    <button
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        className="p-2.5 hover:text-red-500 transition-colors"
                                    >
                                        <Minus size={14} strokeWidth={3} />
                                    </button>
                                    <span className="w-8 text-center text-[15px] font-bold">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(q => Math.min(5, q + 1))}
                                        className="p-2.5 hover:text-red-500 transition-colors"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                                {selectedDetail && (
                                    <span className={cn(
                                        "text-[11px] font-bold uppercase tracking-wider",
                                        selectedDetail.stock_quantity > 0 ? "text-green-500" : "text-red-500"
                                    )}>
                                        {selectedDetail.stock_quantity > 0 ? "In Stock" : "Sold Out"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Production Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={addToCart}
                                disabled={busy}
                                className="flex-[1.2] flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-[0.98]"
                            >
                                <ShoppingCart size={18} />
                                {busy ? "Adding..." : "Add to Cart"}
                            </button>
                            <button
                                onClick={() => { addToCart(); router.push("/cart"); }}
                                className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all active:scale-[0.98] shadow-sm"
                            >
                                Buy it Now
                            </button>
                        </div>

                        <p className="mt-8 text-sm text-gray-600 leading-relaxed max-w-prose">
                            <span className="block font-bold text-gray-900 mb-1">Product Description</span>
                            {product.description || "Premium quality product from PetZonee. Carefully selected for your pet's health and happiness."}
                        </p>

                        {/* Minimal Trust Area */}
                        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between">
                            {[
                                { icon: Truck, label: "Fast Delivery" },
                                { icon: ShieldCheck, label: "Secure Pay" },
                                { icon: Star, label: "Top Quality" }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 opacity-60">
                                    <item.icon size={16} className="text-red-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* RESTORED: Original Drawer UI */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={closeDrawer}
                            className="fixed inset-0 z-[70] bg-black"
                        />

                        {/* Drawer */}
                        <motion.aside
                            key="drawer"
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "tween", duration: 0.28 }}
                            className="
                fixed right-0 top-0 z-[80] h-full 
                w-full sm:w-[80%] md:w-[420px] 
                bg-black/40 backdrop-blur-md 
                shadow-3xl rounded-l-2xl
              "
                            role="dialog"
                            aria-modal="true"
                        >
                            {/* Drawer Header */}
                            <div className="relative flex items-center p-3 sm:p-4 border-b">
                                <h3 className="flex-1 text-center text-base sm:text-lg md:text-xl lg:text-3xl text-[#f5f5dc] font-semibold py-5">
                                    Add to cart
                                </h3>
                                <button
                                    onClick={closeDrawer}
                                    className="p-2 rounded-full text-white hover:bg-[#ff7a7a]"
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Drawer Body */}
                            <div className="p-3 sm:p-4">
                                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                                    <div className="relative w-34 h-34 rounded-xl overflow-hidden bg-slate-100 mx-auto sm:mx-0">
                                        <Image
                                            src={product.img_1 || "/images/placeholder.png"}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 text-center sm:text-left">
                                        <p className="font-semibold text-xl text-white">{product.name}</p>
                                        <div className="mt-1 flex items-center justify-center sm:justify-start gap-2 text-sm">
                                            {product.old_price && (
                                                <span className="line-through text-gray-300">
                                                    ₹{Number(product.old_price).toLocaleString()}
                                                </span>
                                            )}
                                            <span className="font-bold text-green-500">
                                                ₹{Number(product.discount_price).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Drawer Buttons */}
                                <div className="mt-9 space-y-3">
                                    <button
                                        onClick={addToCart}
                                        disabled={
                                            busy || msg === "Limit reached: Maximum 5 units allowed."
                                        }
                                        className={`w-full rounded-2xl font-semibold py-3 shadow disabled:opacity-60
                      ${msg === "Added to Cart" ||
                                                msg === "Updated quantity in Cart"
                                                ? "bg-green-600 text-white hover:bg-green-700"
                                                : msg === "Limit reached: Maximum 5 units allowed."
                                                    ? "bg-gray-500 text-white cursor-not-allowed"
                                                    : "bg-[#ff7a7a] text-white hover:bg-[#FF5E5E]"
                                            }
                    `}
                                    >
                                        {busy
                                            ? "Adding..."
                                            : msg === "Added to Cart"
                                                ? "Added to cart"
                                                : msg === "Updated quantity in Cart"
                                                    ? "Updated in Cart"
                                                    : msg === "Limit reached: Maximum 5 units allowed."
                                                        ? "Limit Reached"
                                                        : "Add to Cart"}
                                    </button>

                                    <button
                                        onClick={goToCart}
                                        className="w-full rounded-xl border border-slate-300 bg-[#f6f6dc] text-gray-800 font-semibold py-3 hover:bg-[#e0e0c6]"
                                    >
                                        Go to cart
                                    </button>

                                    <button
                                        onClick={closeDrawer}
                                        className="w-full rounded-xl border border-slate-300 bg-white text-slate-600 font-semibold py-3 hover:bg-slate-100"
                                    >
                                        Keep browsing
                                    </button>
                                </div>

                                {/* Status message */}
                                {msg && (
                                    <p
                                        className={`mt-3 text-sm text-center font-bold ${msg.includes("Added") || msg.includes("Updated")
                                            ? "text-green-400"
                                            : msg.includes("Limit reached")
                                                ? "text-red-500"
                                                : "text-red-500"
                                            }`}
                                    >
                                        {msg}
                                    </p>
                                )}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
