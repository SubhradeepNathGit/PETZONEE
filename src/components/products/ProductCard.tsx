"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingCart, Star, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Product } from "@/types/product";
import { supabase } from "@/lib/supabase";

const TABLE_NAME = "cart";

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [liked, setLiked] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const {
    id: product_id,
    name,
    badge,
    img_1,
    img_2,
    rating = 0,
    discount_price,
    old_price,
  } = product;

  const closeDrawer = useCallback(() => {
    setOpen(false);
    setMsg(null); // reset msg when closing drawer
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, closeDrawer]);

  const goToCart = () => router.push("/cart");

  const addToCart = async () => {
    try {
      setBusy(true);
      setMsg(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        setMsg("Please sign in to add items to your cart.");
        return;
      }

      const user_id = userData.user.id;

      const { data: existing, error: fetchErr } = await supabase
        .from(TABLE_NAME)
        .select("id, quantity")
        .eq("user_id", user_id)
        .eq("product_id", product_id)
        .single();

      if (fetchErr && fetchErr.code !== "PGRST116") {
        throw fetchErr;
      }

      if (existing) {
        // ✅ Prevent more than 5 units
        if (existing.quantity >= 5) {
          setMsg("Limit reached: Maximum 5 units allowed.");
          return;
        }

        const { error: updateErr } = await supabase
          .from(TABLE_NAME)
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id)
          .eq("user_id", user_id);

        if (updateErr) throw updateErr;
        setMsg("Updated quantity in Cart");
      } else {
        const payload = {
          user_id,
          product_id,
          name,
          price: Number(discount_price ?? 0),
          quantity: 1,
          image_url: img_1 ?? null,
          inserted_at: new Date().toISOString(),
        };

        const { error: insertErr } = await supabase
          .from(TABLE_NAME)
          .insert([payload]);
        if (insertErr) throw insertErr;
        setMsg("Added to Cart");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setMsg(e.message);
      } else {
        setMsg("Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Product Card */}
      <motion.div
        viewport={{ once: false }}
        transition={{ duration: 0.4 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="
          group relative 
          w-full sm:w-[90%] md:w-[88%] lg:w-[89%] 
          h-auto
          rounded-[18px] sm:rounded-[20px] md:rounded-[22px] lg:rounded-[24px] 
          bg-white text-gray-900 shadow-md overflow-hidden 
          transition-all duration-300 
          hover:bg-[#FF7A7A] hover:text-white mt-5
        "
      >
        {/* Badge */}
        {badge && (
          <span
            className="
            absolute left-2 top-3 sm:left-5 sm:top-5 
            z-10 rounded-full bg-[#FF7A7A] 
            px-2 sm:px-3 py-0.5 sm:py-1 
            text-[9px] sm:text-[10px] md:text-xs font-bold uppercase 
            tracking-wider text-white 
            group-hover:bg-black/10 group-hover:text-red-400 
            transition-colors duration-300 
          "
          >
            {badge}
          </span>
        )}

        {/* Wishlist */}
        <motion.button
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() => setLiked((p) => !p)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="
            absolute right-3 top-3 sm:right-5 sm:top-5 
            z-10 grid h-8 w-8 sm:h-9 sm:w-9 
            place-items-center text-rose-500 
            opacity-0 group-hover:opacity-100 transition
          "
        >
          <Heart
            className={liked ? "text-red-500 fill-red-500" : ""}
            size={20}
          />
        </motion.button>

        {/* Product Image */}
        <div
          className="
            relative m-2 sm:m-3 md:m-4 
            h-52 sm:h-60 md:h-64 lg:h-72 
            overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl
          "
        >
          <Image
            src={
              hover
                ? img_2 || img_1 || "/images/placeholder.png"
                : img_1 || "/images/placeholder.png"
            }
            alt={name || "Product"}
            fill
            draggable={false}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        </div>

        {/* Product Info */}
        <div className="px-2 sm:px-3 md:px-4 pb-4 pt-1 text-center transition-colors duration-500">
          <h3 className="mt-1 mb-1 sm:mb-2 text-base sm:text-lg md:text-xl lg:text-2xl font-bold truncate">
            {name}
          </h3>

          {/* Rating */}
          <div className="mb-1 sm:mb-2 flex justify-center gap-0.5 sm:gap-1">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Star
                key={idx}
                size={12}
                className={
                  idx < Math.round(rating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-slate-300 group-hover:text-white/60"
                }
              />
            ))}
          </div>

          {/* Price */}
          <div className="text-xs sm:text-sm md:text-base font-semibold">
            {!!old_price && (
              <span className="line-through opacity-70 mr-1">
                ₹{Number(old_price).toLocaleString()}
              </span>
            )}
            <span className="font-bold">
              ₹{Number(discount_price ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cart Button */}
        <motion.button
          aria-label="Add to cart"
          whileHover={{ scale: 1.09 }}
          whileTap={{ scale: 1 }}
          onClick={() => setOpen(true)}
          className="
            absolute bottom-3 right-3 sm:bottom-4 sm:right-4 
            grid h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 
            place-items-center rounded-full bg-red-400 
            text-white font-bold 
            ring-2 ring-red-500 
            group-hover:bg-white group-hover:text-[#FF5E5E]
            transition
          "
        >
          <ShoppingCart size={20} className="sm:size-5 md:size-6" />
        </motion.button>
      </motion.div>

      {/* Drawer */}
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
                <h2 className="flex-1 text-center text-base sm:text-lg md:text-xl lg:text-3xl text-[#f5f5dc] font-semibold py-5">
                  Add to cart
                </h2>
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
                      src={img_1 || "/images/placeholder.png"}
                      alt={name || "Product"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-semibold text-xl text-white">{name}</p>
                    <div className="mt-1 flex items-center justify-center sm:justify-start gap-2 text-sm">
                      {!!old_price && (
                        <span className="line-through text-gray-300">
                          ₹{Number(old_price).toLocaleString()}
                        </span>
                      )}
                      <span className="font-bold text-green-500">
                        ₹{Number(discount_price ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drawer Buttons */}
                <div className="mt-9 space-y-3">
                  {/* Dynamic Add to Cart Button */}
                  <button
                    onClick={addToCart}
                    disabled={
                      busy || msg === "Limit reached: Maximum 5 units allowed."
                    }
                    className={`w-full rounded-2xl font-semibold py-3 shadow disabled:opacity-60
                      ${
                        msg === "Added to Cart" ||
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
                    className={`mt-3 text-sm text-center font-bold ${
                      msg.includes("Added") || msg.includes("Updated")
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
    </>
  );
}
