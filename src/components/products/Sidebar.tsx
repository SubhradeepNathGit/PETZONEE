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
          error: any;
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
      <div className="relative">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 bg-white rounded-full border border-gray-300 backdrop-blur-md text-gray-700 placeholder-gray-500
                     shadow-inner focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400 transition"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-400 text-white p-2 rounded-full hover:bg-red-500 active:scale-95 hover:scale-105 transition-transform duration-200"
        >
          <Search size={18} />
        </button>
      </div>

      {/* Categories */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-gray-800">
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
              className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all duration-200 transform ${
                category === "all"
                  ? "bg-red-400 text-white scale-105"
                  : "hover:bg-white/40 hover:scale-105 active:scale-95 text-gray-700"
              }`}
              onClick={() => setCategory("all")}
            >
              <span className="flex items-center gap-3">
                <PawPrint
                  size={18}
                  className={`font-bold ${
                    category === "all" ? "text-white" : "text-red-400"
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
                  className={`flex justify-between text-md items-center p-3 rounded-2xl cursor-pointer transition-all duration-200 transform ${
                    isSelected
                      ? "bg-red-400 text-white scale-105"
                      : "hover:bg-[#fef6ef] hover:scale-105 active:scale-95 text-gray-700"
                  }`}
                  onClick={() => setCategory(c.name)}
                >
                  <span className="flex items-center gap-3">
                    <PawPrint
                      size={18}
                      className={isSelected ? "text-white" : "text-red-400"}
                    />
                    <span className="font-medium">{displayName}</span>
                  </span>
                  <span
                    className={`text-sm px-2 py-1 rounded-full backdrop-blur-sm ${
                      isSelected
                        ? "bg-white/30 text-white"
                        : "bg-white/40 text-gray-700 border border-white/30"
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
        <h3 className="font-bold text-lg mb-4 text-gray-800">Price Range</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">0</span>

            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
              className="w-full h-2 bg-[#FF5E5E]/30 rounded-lg appearance-none cursor-pointer accent-red-400"
            />

            <span className="text-sm font-medium text-gray-600">5000</span>
          </div>

          <div className="text-center">
            <p className="text-gray-700 font-semibold">
              Price: ₹{priceRange[0]} — ₹{priceRange[1]}
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-gray-800">Filter By Tags</h3>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const isActive = tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full border text-sm transition-all transform ${
                  isActive
                    ? "bg-red-400 text-white border-red-400 scale-105"
                    : "bg-white/40 text-gray-700 border-gray-300 hover:bg-white/60 hover:scale-105 active:scale-95"
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
              className="w-full bg-gray-200/60 text-gray-700 py-2 px-4 rounded-full font-medium hover:bg-gray-300/70 hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              Reset Tags
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
