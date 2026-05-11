"use client";

import { useEffect, useState } from "react";
import { Search, PawPrint } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = {
  search: string;
  setSearch: (s: string) => void;
  category: string;
  setCategory: (c: string) => void;
  priceRange: [number, number];
  setPriceRange: (r: [number, number]) => void;
  tags: string[];
  setTags: (t: string[]) => void;
};

type ProductRow = {
  category: string | null;
  tags: string | null;
};

export default function Sidebar({
  search,
  setSearch,
  category,
  setCategory,
  priceRange,
  setPriceRange,
  tags,
  setTags,
}: Props) {
  const [categories, setCategories] = useState<
    { name: string; count: number }[]
  >([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setLoading(true);

        const { data, error } = (await supabase
          .from("products")
          .select("category, tags")) as {
            data: ProductRow[] | null;
            error: unknown;
          };

        if (error) throw error;

        if (data) {
          const categoryCounts: Record<string, number> = {};
          const tagSet: Set<string> = new Set();

          data.forEach((item) => {
            if (item.category) {
              const cleanCategory = item.category.trim().toLowerCase();
              categoryCounts[cleanCategory] =
                (categoryCounts[cleanCategory] || 0) + 1;
            }

            if (item.tags) {
              item.tags.split(",").forEach((tag) => tagSet.add(tag.trim()));
            }
          });

          const formattedCategories = Object.entries(categoryCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setCategories(formattedCategories);
          setAllTags(Array.from(tagSet).sort());
        }
      } catch (err) {
        console.error("Error fetching filters:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags([]);
    } else {
      setTags([tag]);
    }
  };

  const resetTags = () => setTags([]);

  return (
    <div className="w-full p-4 space-y-6">
      {/* 🔍 Search Section */}
      <div className="relative group">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-5 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md text-white placeholder-white/30
                     focus:outline-none focus:border-[#FF8A70]/50 focus:ring-1 focus:ring-[#FF8A70]/50 transition-all font-medium"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FF8A70] text-white p-2 rounded-xl hover:bg-[#ff7a5c] active:scale-95 hover:scale-105 transition-all duration-200"
        >
          <Search size={18} />
        </button>
      </div>

      {/* Categories */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-white tracking-tight uppercase text-[10px] tracking-[0.2em] opacity-60">
          Shop by Categories
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* All Products */}
            <div
              className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 ${category === "all"
                  ? "bg-gradient-to-r from-[#FF8A65] to-[#FF7043] text-white"
                  : "bg-white/5 text-white/90 hover:bg-white/10 hover:text-white border border-white/5"
                }`}
              onClick={() => setCategory("all")}
            >
              <span className="flex items-center gap-3">
                <PawPrint
                  size={16}
                  className={`font-bold ${category === "all" ? "text-white" : "text-[#FF8A65]"
                    }`}
                />
                <span className="font-medium">All Products</span>
              </span>
            </div>

            {/* Dynamic Categories */}
            {categories.map((c) => {
              const displayName =
                c.name.charAt(0).toUpperCase() + c.name.slice(1);
              const isSelected = category === c.name;

              return (
                <div
                  key={c.name}
                  className={`flex justify-between text-md items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 ${isSelected
                      ? "bg-gradient-to-r from-[#FF8A65] to-[#FF7043] text-white"
                      : "bg-white/5 text-white/90 hover:bg-white/10 hover:text-white border border-white/5"
                    }`}
                  onClick={() => setCategory(c.name)}
                >
                  <span className="flex items-center gap-3">
                    <PawPrint
                      size={16}
                      className={isSelected ? "text-white" : "text-[#FF8A65]"}
                    />
                    <span className="font-medium">{displayName}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm ${isSelected
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-white/40 border border-white/10"
                      }`}
                  >
                    {c.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-white tracking-tight uppercase text-[10px] tracking-[0.2em] opacity-60">Price Range</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-white/30">0</span>

            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF8A70]"
            />

            <span className="text-xs font-bold text-white/30">5000</span>
          </div>

          <div className="text-center">
            <p className="text-white font-bold text-sm">
              Price: ₹{priceRange[0]} — ₹{priceRange[1]}
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-white tracking-tight uppercase text-[10px] tracking-[0.2em] opacity-60">Filter By Tags</h3>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const isActive = tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all ${isActive
                    ? "bg-[#FF8A70] text-white border-[#FF8A70]"
                    : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {tags.length > 0 && (
          <div className="mt-4">
            <button
              onClick={resetTags}
              className="w-full bg-white/5 text-white/40 py-2.5 px-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 hover:text-white transition-all border border-white/5"
            >
              Reset Tags
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
