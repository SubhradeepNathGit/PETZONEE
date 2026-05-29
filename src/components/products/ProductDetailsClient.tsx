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
    ArrowLeft,
    CheckCircle2
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
                // GUEST CART: Add to localStorage
                if (typeof window !== "undefined") {
                    const localCartRaw = localStorage.getItem("local_cart");
                    const localCart = localCartRaw ? JSON.parse(localCartRaw) : [];
                    
                    const existingIdx = localCart.findIndex((it: any) => it.product_id === product.id);
                    if (existingIdx > -1) {
                        if (localCart[existingIdx].quantity >= 5) {
                            setMsg("Limit reached: Maximum 5 units allowed.");
                            setOpen(true);
                            return;
                        }
                        localCart[existingIdx].quantity = Math.min(5, localCart[existingIdx].quantity + quantity);
                        setMsg("Updated quantity in Cart");
                    } else {
                        localCart.push({
                            id: `local-${Date.now()}`,
                            user_id: "local",
                            product_id: product.id,
                            name: product.name,
                            price: Number(product.discount_price ?? 0),
                            quantity: Math.min(5, quantity),
                            image_url: product.img_1 ?? null,
                            inserted_at: new Date().toISOString(),
                        });
                        setMsg("Added to Cart");
                    }
                    localStorage.setItem("local_cart", JSON.stringify(localCart));
                    
                    // Dispatch a custom event to notify Navbar/other components that the cart count changed
                    window.dispatchEvent(new Event("cart-updated"));
                }
                setOpen(true);
                return;
            }

            const user_id = userData.user.id;

            const { data: existingItems, error: fetchErr } = await supabase
                .from(TABLE_NAME)
                .select("id, quantity")
                .eq("user_id", user_id)
                .eq("product_id", product.id);

            if (fetchErr) throw fetchErr;

            const existing = existingItems && existingItems.length > 0 ? existingItems[0] : null;

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
                
                // If there were duplicates (due to previous bugs), clean them up
                if (existingItems.length > 1) {
                    const idsToRemove = existingItems.slice(1).map(item => item.id);
                    await supabase.from(TABLE_NAME).delete().in("id", idsToRemove);
                }

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
        <div className="min-h-screen bg-black pb-10">
            {/* Container - Tighter max-width and padding */}
            <div className="max-w-6xl mx-auto px-6 py-6 font-sans">

                {/* Navigation & Logo Sync Area (Compact) */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-white/50 hover:text-[#FF8A70] transition-colors text-sm font-semibold"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Shop</span>
                    </button>

                    <nav className="hidden md:flex text-[13px] text-white/30 font-medium">
                        <span className="hover:text-white transition-colors cursor-pointer" onClick={() => router.push("/")}>Home</span>
                        <span className="mx-2">/</span>
                        <span className="hover:text-white transition-colors cursor-pointer" onClick={() => router.push("/products")}>Products</span>
                        <span className="mx-2">/</span>
                        <span className="text-white font-bold">{product.name}</span>
                    </nav>
                </div>

                {/* Product Layout - More compact spacing */}
                <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

                    {/* Left: Premium Image Gallery */}
                    <div className="space-y-4">
                        <div className="relative aspect-[16/14] sm:aspect-square rounded-3xl overflow-hidden bg-white/5 border border-white/5 group">
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
                                        className="p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-[#FF8A70] transition-all transform hover:scale-110"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                                        className="p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-[#FF8A70] transition-all transform hover:scale-110"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}

                            {/* Heart Toggle */}
                            <button
                                onClick={() => setLiked(!liked)}
                                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/40 hover:text-red-500 transition-all hover:scale-110"
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
                                            "relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all p-1 bg-white/5",
                                            activeImage === idx ? "border-[#FF8A70] bg-[#FF8A70]/10" : "border-white/5 opacity-40 hover:opacity-100"
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
                            <span className="px-2 py-0.5 rounded-md bg-[#FF8A70]/10 border border-[#FF8A70]/20 text-[10px] font-bold tracking-widest text-[#FF8A70] uppercase">
                                {product.category}
                            </span>
                            <div className="flex items-center gap-1 text-yellow-500 text-[11px] font-bold">
                                <Star size={14} className="fill-current" />
                                <span>{product.rating?.toFixed(1) || "4.0"} Rating</span>
                            </div>
                        </div>

                        {/* Compact Title */}
                        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">
                            {product.name}
                        </h1>

                        {/* Price Row */}
                        <div className="flex items-baseline gap-3 mb-6">
                            <span className="text-3xl font-bold text-white">
                                ₹{Number(product.discount_price).toLocaleString()}
                            </span>
                            {product.old_price && (
                                <>
                                    <span className="text-lg text-white/30 line-through">
                                        ₹{Number(product.old_price).toLocaleString()}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 text-[11px] font-bold">
                                        {Math.round(((product.old_price - product.discount_price) / product.old_price) * 100)}% OFF
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="h-px bg-white/5 w-full mb-6" />

                        {/* Selections (Weighted/Size) */}
                        {details.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-3">Available Options</h3>
                                <div className="flex flex-wrap gap-2">
                                    {details.map((d) => (
                                        <button
                                            key={d.id}
                                            onClick={() => setSelectedDetail(d)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl border text-[13px] font-bold transition-all",
                                                selectedDetail?.id === d.id
                                                    ? "border-[#FF8A70] bg-[#FF8A70]/10 text-[#FF8A70]"
                                                    : "border-white/10 text-white/40 hover:border-white/20 hover:bg-white/5"
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
                            <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-3">Quantity</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center border border-white/10 rounded-xl bg-white/5">
                                    <button
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        className="p-2.5 hover:text-[#FF8A70] transition-colors text-white/40"
                                    >
                                        <Minus size={14} strokeWidth={3} />
                                    </button>
                                    <span className="w-8 text-center text-[15px] font-bold text-white">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(q => Math.min(5, q + 1))}
                                        className="p-2.5 hover:text-[#FF8A70] transition-colors text-white/40"
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
                                className="flex-[1.2] flex items-center justify-center gap-2 py-3.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-white/90 transition-all active:scale-[0.98]"
                            >
                                <ShoppingCart size={18} />
                                {busy ? "Adding..." : "Add to Cart"}
                            </button>
                            <button
                                onClick={() => { addToCart(); router.push("/cart"); }}
                                className="flex-1 py-3.5 bg-[#FF8A70] text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all active:scale-[0.98]"
                            >
                                Buy it Now
                            </button>
                        </div>

                        <p className="mt-8 text-sm text-white/60 leading-relaxed max-w-prose">
                            <span className="block font-bold text-white mb-1">Product Description</span>
                            {product.description || "Premium quality product from PetZonee. Carefully selected for your pet's health and happiness."}
                        </p>

                        {/* Minimal Trust Area */}
                        <div className="mt-10 pt-6 border-t border-white/5 flex justify-between">
                            {[
                                { icon: Truck, label: "Fast Delivery" },
                                { icon: ShieldCheck, label: "Secure Pay" },
                                { icon: Star, label: "Top Quality" }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 opacity-40">
                                    <item.icon size={16} className="text-[#FF8A70]" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-white">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Drawer UI */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeDrawer}
                            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
                        />

                        <motion.aside
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed right-0 top-0 z-[110] h-full w-full sm:w-[380px] bg-[#0a0a0f] border-l border-white/10 overflow-hidden flex flex-col"
                        >
                            <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tighter">
                                        {msg?.includes("Limit") ? "Wait a second" : "Added To Cart"}
                                    </h3>
                                </div>
                                <button
                                    onClick={closeDrawer}
                                    className="p-2 rounded-full text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="flex gap-4 mb-8">
                                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white/5">
                                        <Image
                                            src={product.img_1 || "/images/placeholder.png"}
                                            alt={product.name}
                                            fill
                                            className="object-contain p-2"
                                        />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <p className="font-bold text-white">{product.name}</p>
                                        <p className="text-[#FF8A70] font-bold mt-1">₹{Number(product.discount_price).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={goToCart}
                                        className="w-full py-4 bg-[#FF8A70] text-white rounded-2xl font-bold text-sm hover:brightness-110 transition-all"
                                    >
                                        Go to Cart
                                    </button>
                                    <button
                                        onClick={closeDrawer}
                                        className="w-full py-4 bg-white/5 text-white/50 border border-white/10 rounded-2xl font-bold text-sm hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        Keep Browsing
                                    </button>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
