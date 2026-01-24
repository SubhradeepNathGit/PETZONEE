"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import ProductGrid from "@/components/products/ProductGrid";
import Sidebar from "@/components/products/Sidebar";
import SortMenu from "@/components/products/SortMenu";
import { Product } from "@/types/product";
import { Filter, X } from "lucide-react";

export default function ProductsPage() {
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
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <div className="relative w-full h-48 sm:h-64 md:h-72 lg:h-80 mb-8">
        <Image
          src="/images/statbg12.jpg"
          alt="Products Banner"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Shop
          </h1>
          <p className="text-sm sm:text-base text-gray-200 mt-2">Home / Shop</p>
        </div>
      </div>

      {/* Layout */}
      <div className="container mx-auto px-4 pb-12">
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
                className={`absolute left-0 top-0 h-full w-4/5 max-w-xs bg-white p-4 shadow-lg overflow-y-auto z-50 transform transition-transform duration-300 ${
                  showSidebar ? "translate-x-0" : "-translate-x-full"
                }`}
              >
                <button
                  className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-200"
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 bg-[#fef6ef] px-4 sm:px-6 py-3 rounded-full">
              <p className="text-sm font-medium text-gray-700">
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
                  className="lg:hidden flex items-center gap-2 px-4 py-2 bg-[#FF7A7A] text-white rounded-full hover:bg-[#ff6b6b] transition"
                >
                  <Filter size={18} /> Filters
                </button>

                <SortMenu sort={sort} setSort={setSort} />
              </div>
            </div>

            {/* Loader */}
            {loading && (
              <div className="flex justify-center items-center py-20">
                <div className="h-12 w-12 border-4 border-[#FF7A7A] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredProducts.length === 0 && (
              <div className="text-center text-gray-500 py-20">
                <p className="text-xl mb-2">No products found</p>
                <p className="text-sm">
                  {category !== "all" && `No products in "${category}" category`}
                  {debouncedSearch && ` matching "${debouncedSearch}"`}
                  {tags.length > 0 && ` with selected tags`}
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-[#FF7A7A] text-white rounded-lg hover:bg-[#ff6b6b]"
                >
                  Reset Filters
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
                        className={`px-4 py-2 rounded-lg shadow-md transition-colors ${
                          currentPage === i + 1
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
