// app/cart/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  Trash2,
  ShoppingCart,
  ArrowRight,
  Minus,
  Plus,
  Shield,
  Truck,
  Heart,
  Star,
} from "lucide-react";
import SpinnerLoader from "@/components/SpinnerLoader";


type CartRow = {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  inserted_at: string;
};

type ProductDetails = {
  id: string;
  rating: number;
  old_price: number | null;
  discount_price: number;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function CartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<CartRow[]>([]);
  const [productDetails, setProductDetails] = useState<Record<string, ProductDetails>>({});
  const [msg, setMsg] = useState<string>("");
  const [promoCode, setPromoCode] = useState<string>("");
  const [appliedPromo, setAppliedPromo] = useState<string>("");
  const [promoMessage, setPromoMessage] = useState<string>("");
  const [activeSub, setActiveSub] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setLoading(false);
        setMsg("Please sign in to view your cart");
        return;
      }
      setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("inserted_at", { ascending: false });

      if (error) {
        console.error(error);
        setMsg("Could not load your cart.");
      } else {
        const cartItems = (data as CartRow[]) ?? [];
        setItems(cartItems);

        if (cartItems.length > 0) {
          const productIds = cartItems.map(item => item.product_id);
          const { data: products, error: productsError } = await supabase
            .from("products")
            .select("id, rating, old_price, discount_price")
            .in("id", productIds);

          if (productsError) {
            console.error("Error fetching product details:", productsError);
          } else {
            const productDetailsMap: Record<string, ProductDetails> = {};
            products?.forEach(product => {
              productDetailsMap[product.id] = {
                id: product.id,
                rating: product.rating || 0,
                old_price: product.old_price,
                discount_price: product.discount_price || product.old_price || 0,
              };
            });
            setProductDetails(productDetailsMap);
          }
        }
      }
      setLoading(false);

      // 🔑 Load applied promo (if any) from localStorage
      const savedPromo = localStorage.getItem("applied_promo_code");
      if (savedPromo) {
        setAppliedPromo(savedPromo);
      }

      // Fetch active subscription for discounts
      if (auth?.user) {
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", auth.user.id)
          .eq("status", "active")
          .single();
        setActiveSub(sub);
      }
    })();
  }, []);

  const getProductRating = (productId: string): number => {
    return productDetails[productId]?.rating || 0;
  };

  const getDiscountPercentage = (productId: string): number => {
    const details = productDetails[productId];
    if (!details?.old_price || !details?.discount_price) return 0;
    const oldPrice = Number(details.old_price);
    const discountPrice = Number(details.discount_price);
    if (oldPrice <= discountPrice) return 0;
    return Math.round(((oldPrice - discountPrice) / oldPrice) * 100);
  };

  const getOriginalPrice = (productId: string): number | null => {
    const details = productDetails[productId];
    return details?.old_price ? Number(details.old_price) : null;
  };

  const subtotal = useMemo(
    () => items.reduce((acc, r) => acc + (Number(r.price) || 0) * r.quantity, 0),
    [items]
  );

  const cgst = useMemo(() => Math.round(subtotal * 0.09), [subtotal]);
  const sgst = useMemo(() => Math.round(subtotal * 0.09), [subtotal]);

  const actualSavings = useMemo(() => {
    if (Object.keys(productDetails).length === 0) return 0;
    return items.reduce((acc, item) => {
      const details = productDetails[item.product_id];
      if (!details?.old_price) return acc;
      const originalPrice = Number(details.old_price);
      const currentPrice = Number(item.price);
      if (originalPrice <= currentPrice) return acc;
      const itemSavings = (originalPrice - currentPrice) * item.quantity;
      return acc + itemSavings;
    }, 0);
  }, [items, productDetails]);

  const promoDiscount = useMemo(() => {
    if (appliedPromo === "WELCOME10") {
      return Math.round((subtotal + cgst + sgst) * 0.1);
    }
    return 0;
  }, [subtotal, cgst, sgst, appliedPromo]);

  const subDiscount = useMemo(() => {
    if (!activeSub) return 0;
    const rate = activeSub.plan_name === "Premium Care" ? 0.25 : activeSub.plan_name === "Complete Care" ? 0.15 : 0.05;
    return Math.round(subtotal * rate);
  }, [activeSub, subtotal]);

  const total = useMemo(() => subtotal + cgst + sgst - promoDiscount - subDiscount, [subtotal, cgst, sgst, promoDiscount, subDiscount]);

  const updateQty = async (row: CartRow, delta: number) => {
    if (busy) return;
    const next = Math.max(1, row.quantity + delta);
    if (next > 5) {
      setMsg(`You can not add more than 5 units of "${row.name}"`);
      return;
    }
    const prevQty = row.quantity;
    setItems(prev => prev.map(it => (it.id === row.id ? { ...it, quantity: next } : it)));
    const { error } = await supabase
      .from("cart")
      .update({ quantity: next })
      .eq("id", row.id)
      .eq("user_id", userId!);
    if (error) {
      setItems(prev => prev.map(it => (it.id === row.id ? { ...it, quantity: prevQty } : it)));
      console.error(error);
      setMsg("Failed to update quantity");
    } else {
      setMsg("");
    }
  };

  const removeLine = async (row: CartRow) => {
    if (busy) return;
    const snapshot = items;
    setItems(items.filter(it => it.id !== row.id));
    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("id", row.id)
      .eq("user_id", userId!);
    if (error) {
      setItems(snapshot);
      console.error(error);
      setMsg("Failed to remove item.");
    }
  };

  const applyPromoCode = () => {
    if (promoCode.trim().toUpperCase() === "WELCOME10") {
      setAppliedPromo("WELCOME10");
      setPromoMessage("Promo code applied successfully!");
      setPromoCode("");
      localStorage.setItem("applied_promo_code", "WELCOME10"); // ✅ save for checkout
    } else {
      setPromoMessage("Invalid promo code. Please try again.");
      setTimeout(() => setPromoMessage(""), 3000);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo("");
    setPromoMessage("");
    localStorage.removeItem("applied_promo_code"); // ✅ remove for checkout
  };

  const proceedToCheckout = async () => {
    if (!userId) {
      setMsg("Please sign in to proceed.");
      return;
    }
    if (items.length === 0) {
      setMsg("Your cart is empty.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        userId,
        items,
        total,
        subtotal,
        contact: {}, 
        addr: {}, 
        delivery: "standard",
        payMode: "stripe",
        isPlanCheckout: false,
        planDetails: null,
        deliveryFee: 0,
        totalTax: cgst + sgst,
        promoDiscount,
        subDiscount,
        promoCode: appliedPromo || null
      };

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Stripe initialization failed:", data);
        throw new Error(data.error || 'Failed to initialize checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error(err);
      setMsg(err.message || "Could not proceed to checkout. Try again.");
      setBusy(false);
    }
  };

  // === UI ===
  return (
    <div className={`bg-black text-white font-[var(--font-inter)] selection:bg-[#FF8A70]/30 ${!loading && !userId ? "lg:h-screen lg:overflow-hidden" : "min-h-screen"}`}>
      {/* === Hero Section (Standardized) === */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center overflow-hidden">
        {/* Hero Image */}
        <Image
          src="/images/statbg6.jpg"
          alt="Cart Banner"
          fill
          priority
          className="object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-1000 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black"></div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4 max-w-4xl"
        >
          <div className="space-y-2 mb-6">
            <h1 className="text-2xl md:text-4xl font-sans font-extrabold tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent uppercase">
              Shopping <span className="text-[#FF8A65]">Cart</span>
            </h1>
            <p className="text-white/40 text-xs md:text-sm font-medium uppercase tracking-[0.3em]">
              Review your items and proceed to checkout
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 overflow-hidden">
            <button
              onClick={() => router.push('/')}
              className="text-white/40 hover:text-white transition-colors duration-200 font-bold text-xs sm:text-sm uppercase tracking-widest"
            >
              Home
            </button>
            <span className="text-white/20 text-xs">/</span>
            <button
              onClick={() => router.push('/products')}
              className="text-white/40 hover:text-white transition-colors duration-200 font-bold text-xs sm:text-sm uppercase tracking-widest"
            >
              Shop
            </button>
            <span className="text-white/20 text-xs">/</span>
            <p className="text-xs sm:text-sm text-[#FF8A65] font-bold uppercase tracking-widest">Cart</p>
          </div>
        </motion.div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 mb-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <SpinnerLoader text="Loading your cart…" />
          </div>
        ) : !userId ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10 -mt-8 md:-mt-16"
          >
            <div className="bg-transparent rounded-3xl p-12 max-w-md mx-auto">
              <div className="w-20 h-20 bg-[#FF8A70]/10 text-[#FF8A70] rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Sign in Required
              </h3>
              <p className="text-gray-400 mb-6">{msg || "Please sign in to view your cart"}</p>
              <button
                onClick={() => router.push("/signup?redirect=/cart")}
                className="w-[85%] flex mx-auto justify-center items-center gap-2 rounded-3xl bg-[#0e2a36] py-3.5 text-sm lg:text-base font-semibold text-white hover:bg-[#1a3d4d] transition-colors active:scale-[0.98]"
              >
                Sign In <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : items.length === 0 ? (
          <EnhancedEmptyCart router={router} />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-12 lg:grid-cols-3"
          >
            {/* Items Section */}
            <motion.section
              variants={itemVariants}
              className="lg:col-span-2 space-y-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Your Cart ({items.length}{" "}
                  {items.length === 1 ? "item" : "items"})
                </h2>
                {actualSavings > 0 && (
                  <div className="text-sm text-black bg-white/90 px-3 py-1 rounded-full">
                    You save ₹{actualSavings.toLocaleString()} today!
                  </div>
                )}
              </div>

              {items.map((row, index) => {
                const rating = getProductRating(row.product_id);
                const discountPercentage = getDiscountPercentage(row.product_id);
                const originalPrice = getOriginalPrice(row.product_id);

                return (
                  <motion.article
                    key={row.id}
                    variants={itemVariants}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm"
                  >
                    <div className="relative flex items-center gap-6">
                      {/* Image */}
                      <div className="relative">
                        <div className="relative h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-2xl bg-gray-100">
                          <Image
                            src={row.image_url || "/images/placeholder.png"}
                            alt={row.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-white mb-2 truncate">
                          {row.name}
                        </h3>

                        {/* Dynamic Rating */}
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < Math.round(rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-200 text-gray-200"
                                }`}
                            />
                          ))}
                          <span className="text-sm text-gray-500 ml-1">
                            ({rating > 0 ? rating.toFixed(1) : "No rating"})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-xl font-bold text-white">
                            ₹{Number(row.price).toLocaleString()}
                          </span>
                          {originalPrice && originalPrice > Number(row.price) && (
                            <>
                              <span className="text-sm text-gray-400 line-through">
                                ₹{originalPrice.toLocaleString()}
                              </span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                                {discountPercentage}% OFF
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center rounded-2xl p-1">
                            <button
                              onClick={() => updateQty(row, -1)}
                              className="w-10 h-10 rounded-3xl bg-white/[0.05] border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4 text-white" />
                            </button>
                            <span className="w-12 text-center font-semibold text-white">
                              {row.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(row, +1)}
                              className="w-10 h-10 rounded-3xl bg-white/[0.05] border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4 text-white" />
                            </button>
                          </div>

                          <div className="text-sm text-gray-500">
                            Stock:{" "}
                            <span className="text-green-600 font-semibold">
                              In Stock
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-4">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            ₹
                            {(Number(row.price) * row.quantity).toLocaleString()}
                          </p>
                          <p className="text-sm text-white/50">
                            ₹{Number(row.price).toLocaleString()} each
                          </p>
                        </div>

                        <button
                          onClick={() => removeLine(row)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#FF8A70] bg-[#FF8A70]/10 rounded-xl hover:bg-[#FF8A70]/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </motion.section>

            {/* Order Summary */}
            <motion.aside
              variants={itemVariants}
              className="lg:sticky lg:top-8 h-fit"
            >
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white/[0.05] rounded-2xl flex items-center justify-center border border-white/10">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Order Summary
                  </h2>
                </div>

                <div className="space-y-4 text-sm">
                  <SummaryRow label="Subtotal" value={subtotal} />
                  <SummaryRow label="Delivery" value={0} free />
                  <SummaryRow label="CGST (9%)" value={cgst} />
                  <SummaryRow label="SGST (9%)" value={sgst} />

                  {actualSavings > 0 && (
                    <SummaryRow label="You Save" value={-actualSavings} savings />
                  )}

                  {subDiscount > 0 && activeSub && (
                    <div className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-center gap-2 text-amber-700">
                        <span className="font-medium">{activeSub.plan_name} Discount</span>
                      </div>
                      <span className="font-bold text-amber-700">
                        - ₹{subDiscount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {appliedPromo && (
                    <SummaryRow
                      label="Promo Discount (10%)"
                      value={-promoDiscount}
                      savings
                      promoCode={appliedPromo}
                      onRemove={removePromoCode}
                    />
                  )}

                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  <SummaryRow label="Total" value={total} bold large />
                </div>

                <div className="mt-6 p-4 bg-white/[0.02] rounded-2xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 bg-transparent border border-white/20 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#FF8A70] placeholder-white/40"
                    />
                    <button
                      onClick={applyPromoCode}
                      className="px-4 py-2 bg-[#0e2a36] text-white hover:bg-[#1a3d4d] rounded-xl text-sm font-semibold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-3">
                    **Apply WELCOME10 for flat 10% discount**
                  </p>
                  {promoMessage && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs text-center mt-2 ${appliedPromo ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      {promoMessage}
                    </motion.p>
                  )}
                </div>

                <button
                  onClick={proceedToCheckout}
                  disabled={busy || items.length === 0}
                  className="mt-6 relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-500 px-6 py-2.5 font-bold text-white disabled:opacity-60 transition-all duration-300 h-[50px]"
                >
                  {busy ? (
                    <div className="relative flex items-center justify-center gap-3">
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Redirecting</span>
                    </div>
                  ) : (
                    <div className="relative flex items-center justify-center gap-3">
                      <ShoppingCart className="h-5 w-5" />
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </button>

                <div className="mt-6 grid grid-cols-3 gap-4 text-center text-[10px] text-white/40 font-bold uppercase tracking-wider">
                  <div className="flex flex-col items-center gap-1">
                    <Shield className="w-5 h-5 text-white/40 mb-1" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Truck className="w-5 h-5 text-white/40 mb-1" />
                    <span>Free Delivery</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Star className="w-5 h-5 text-white/40 mb-1" />
                    <span>Top Rated</span>
                  </div>
                </div>

                {msg && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl"
                  >
                    <p className="text-sm text-red-700">{msg}</p>
                  </motion.div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold = false,
  large = false,
  free = false,
  savings = false,
  promoCode = "",
  onRemove,
}: {
  label: string;
  value: number;
  bold?: boolean;
  large?: boolean;
  free?: boolean;
  savings?: boolean;
  promoCode?: string;
  onRemove?: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between ${large ? "text-lg" : ""}`}
    >
      <span className={`${bold ? "font-bold text-gray-800" : "text-gray-600"}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        {free && value === 0 ? (
          <span className="text-green-600 font-semibold">FREE</span>
        ) : (
          <span
            className={`${bold ? "font-bold text-gray-800" : "text-gray-800"} ${savings ? "text-green-600" : ""
              }`}
          >
            {savings ? "-" : ""}₹{Math.abs(value).toLocaleString()}
          </span>
        )}
        {savings && promoCode && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            {promoCode === "WELCOME10"
              ? "Applied"
              : "Promo Applied"}
          </span>
        )}
        {savings && promoCode && onRemove && (
          <button
            onClick={onRemove}
            className="ml-2 text-xs text-red-500"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function EnhancedEmptyCart({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-10 -mt-8 md:-mt-16"
    >
      <div className="bg-transparent rounded-3xl p-12 max-w-md mx-auto">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="w-10 h-10 text-rose-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">Your cart is empty</h3>
        <p className="text-gray-400 mb-6">
          Looks like you haven&apos;t added anything to your cart yet.
        </p>
        <button
          onClick={() => router.push("/products")}
          className="w-[85%] flex mx-auto justify-center items-center gap-2 rounded-3xl bg-[#0e2a36] py-3.5 text-sm lg:text-base font-semibold text-white hover:bg-[#1a3d4d] transition-colors active:scale-[0.98]"
        >
          Start Shopping <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
