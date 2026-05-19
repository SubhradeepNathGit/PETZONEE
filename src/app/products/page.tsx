"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import ProductGrid from "@/components/products/ProductGrid";
import Sidebar from "@/components/products/Sidebar";
import SortMenu from "@/components/products/SortMenu";
import { Product } from "@/types/product";
import { Filter, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [sort, setSort] = useState("latest");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Sidebar toggle for mobile/tablet
  const [showSidebar, setShowSidebar] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 9;

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts((data as Product[]) ?? []);
      } catch (err) {
        console.error("Fetch error:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Filtering + Sorting
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (category !== "all") {
      result = result.filter(
        (p) =>
          p.category &&
          p.category.trim().toLowerCase() === category.trim().toLowerCase()
      );
    }

    if (debouncedSearch.trim()) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    if (tags.length > 0) {
      result = result.filter((p) => {
        const productTags = p.tags
          ? p.tags.split(",").map((tag) => tag.trim().toLowerCase())
          : [];
        return tags.some((tag) => productTags.includes(tag.toLowerCase()));
      });
    }

    result = result.filter((p) => {
      const price = Number(p.discount_price ?? p.old_price ?? 0);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    switch (sort) {
      case "price-low":
        result.sort(
          (a, b) =>
            Number(a.discount_price ?? a.old_price ?? 0) -
            Number(b.discount_price ?? b.old_price ?? 0)
        );
        break;
      case "price-high":
        result.sort(
          (a, b) =>
            Number(b.discount_price ?? b.old_price ?? 0) -
            Number(a.discount_price ?? a.old_price ?? 0)
        );
        break;
      case "top-rated":
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "latest":
      default:
        result.sort(
          (a, b) =>
            new Date(b.created_at ?? "").getTime() -
            new Date(a.created_at ?? "").getTime()
        );
        break;
    }

    return result;
  }, [products, category, debouncedSearch, tags, priceRange, sort]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [category, tags]);

  const resetFilters = () => {
    setCategory("all");
    setSearch("");
    setPriceRange([0, 5000]);
    setTags([]);
  };

  return (
    <div className="min-h-screen bg-black text-white font-[var(--font-inter)] selection:bg-[#FF8A70]/30">
      {/* === Hero Section (Standardized) === */}
      <section className="relative h-[45vh] min-h-[300px] flex items-center justify-center overflow-hidden">
        {/* Hero Image */}

        <Image
          src="/images/statbg12.jpg"
          alt="Products Banner"
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
              Our <span className="text-[#FF8A65]">Shop</span>
            </h1>
            <p className="text-white/40 text-xs md:text-sm font-medium uppercase tracking-[0.3em]">
              Premium supplies for your beloved companions
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
            <p className="text-xs sm:text-sm text-[#FF8A65] font-bold uppercase tracking-widest">Shop</p>
          </div>
        </motion.div>
      </section>

      {/* Layout */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block lg:col-span-3 w-full lg:max-w-[280px]">
            <Sidebar
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              tags={tags}
              setTags={setTags}
            />
          </aside>

          {/* Sidebar (mobile/tablet) */}
          {showSidebar && (
            <div
              className="fixed inset-0 z-50 lg:hidden"
              role="dialog"
              aria-modal="true"
            >
              {/* Overlay */}
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setShowSidebar(false)}
              />

              {/* Drawer */}
              <div
                className={`absolute left-0 top-0 h-full w-4/5 max-w-xs bg-black/80 backdrop-blur-3xl p-6 border-r border-white/10 overflow-y-auto z-50 transform transition-transform duration-300 ${showSidebar ? "translate-x-0" : "-translate-x-full"
                  }`}
              >
                <button
                  className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
                  onClick={() => setShowSidebar(false)}
                  aria-label="Close sidebar"
                >
                  <X size={20} />
                </button>
                <Sidebar
                  search={search}
                  setSearch={setSearch}
                  category={category}
                  setCategory={setCategory}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  tags={tags}
                  setTags={setTags}
                />
              </div>
            </div>
          )}

          {/* Products */}
          <main className="lg:col-span-9 w-full">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 bg-white/[0.03] border border-white/5 backdrop-blur-xl px-4 sm:px-6 py-4 rounded-2xl relative z-30">
              <p className="text-sm font-medium text-white/50 tracking-tight">
                {loading
                  ? "Loading..."
                  : `Showing ${indexOfFirst + 1}–${Math.min(
                    indexOfLast,
                    filteredProducts.length
                  )} of ${filteredProducts.length} results`}
              </p>

              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                {/* Mobile filter toggle */}
                <button
                  onClick={() => setShowSidebar(true)}
                  className="lg:hidden flex items-center gap-2 px-6 py-2 bg-[#FF8A70] text-white rounded-xl hover:bg-[#ff7a5c] transition-all font-bold text-xs uppercase tracking-widest"
                >
                  <Filter size={16} /> Filters
                </button>

                <SortMenu sort={sort} setSort={setSort} />
              </div>
            </div>

            {/* Loader */}
            {loading && (
              <div className="flex justify-center items-center py-24">
                <div className="h-12 w-12 border-4 border-[#FF8A70] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredProducts.length === 0 && (
              <div className="text-center text-white/50 py-24 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-md">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/20">
                  <X size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tighter uppercase mb-2">No products found</h3>
                <p className="text-sm font-medium opacity-60">
                  {category !== "all" && `No products in "${category}" category`}
                  {debouncedSearch && ` matching "${debouncedSearch}"`}
                  {tags.length > 0 && ` with selected tags`}
                </p>
                <button
                  onClick={resetFilters}
                   className="mt-8 px-8 py-3 bg-[#FF8A70] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#ff7a5c] transition-all active:scale-95"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Product Grid + Pagination */}
            {!loading && filteredProducts.length > 0 && (
              <>
                <ProductGrid products={currentProducts} />

                {totalPages > 1 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-8">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-4 py-2 rounded-lg transition-colors ${currentPage === i + 1
                          ? "bg-[#FF7A7A] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
