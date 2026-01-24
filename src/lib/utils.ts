// /lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Product, ProductDetail } from "@/types/product";

/**
 * 1. Supabase client (singleton)
 * Keys must be stored in .env.local:
 * NEXT_PUBLIC_SUPABASE_URL=...
 * NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://irjyhbnwelupvsxulrzm.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyanloYm53ZWx1cHZzeHVscnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzE4NjQsImV4cCI6MjA3MjU0Nzg2NH0.vM9_Yp8kArDviCGQ5NHff_frGBh6F0tYj4SO7XWFc1w"
);

// The original check for placeholder URL used the `supabaseUrl` variable, which is now removed.
// To maintain similar functionality, we can check the environment variable directly.
if (typeof window !== "undefined" && (process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co" || !process.env.NEXT_PUBLIC_SUPABASE_URL)) {
  console.warn("⚠️ PETZONEE: NEXT_PUBLIC_SUPABASE_URL is missing or is a placeholder. Please check your Vercel Environment Variables.");
}

/**
 * 2. Tailwind class merge utility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 3. Fetch single product with its details
 */
export async function getProductById(id: string): Promise<{
  product: Product | null;
  details: ProductDetail[];
}> {
  // Fetch main product
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (productError) {
    console.error("Error fetching product:", productError.message);
    return { product: null, details: [] };
  }

  // Fetch product details (variants, sizes, etc.)
  const { data: details, error: detailsError } = await supabase
    .from("product_details")
    .select("*")
    .eq("product_id", id);

  if (detailsError) {
    console.error("Error fetching product details:", detailsError.message);
    return { product, details: [] };
  }

  return { product, details: details ?? [] };
}
