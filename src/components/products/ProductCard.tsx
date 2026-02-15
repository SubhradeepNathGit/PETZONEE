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

  const handleClick = () => {
    router.push(`/products/${product_id}`);
  };

  return (
    <>
      {/* Product Card */}
      <motion.div
        viewport={{ once: false }}
        transition={{ duration: 0.4 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={handleClick}
        className="
          group relative 
          w-full sm:w-[90%] md:w-[88%] lg:w-[89%] 
          h-auto
          rounded-[18px] sm:rounded-[20px] md:rounded-[22px] lg:rounded-[24px] 
          bg-white text-gray-900 shadow-md overflow-hidden 
          transition-all duration-300 
          hover:bg-[#FF7A7A] hover:text-white mt-5
          cursor-pointer
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
          onClick={(e) => {
            e.stopPropagation();
            setLiked((p) => !p);
          }}
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
      </motion.div>
    </>
  );
}

