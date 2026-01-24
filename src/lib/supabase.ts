// /lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Product, ProductDetail } from "@/types/product";

/**
 * 1. Supabase client (browser-side with anon key)
 * Put keys in .env.local:
 * NEXT_PUBLIC_SUPABASE_URL=...
 * NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 2. Utility to merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 3. Example DB helper: fetch single product with details
 */
export async function getProductById(
  id: string
): Promise<{ product: Product | null; details: ProductDetail[] }> {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (productError) {
    console.error("Error fetching product:", productError.message);
    return { product: null, details: [] };
  }

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
