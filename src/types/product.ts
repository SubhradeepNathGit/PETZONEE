// 📂 types/product.ts
export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  old_price: number | null;
  discount_price: number;
  img_1: string;
  img_2: string;
  badge?: string;
  rating?: number;
  created_at?: string;
  tags?: string;  // Changed to a single string (comma-separated)
};

export type ProductDetail = {
  id: string;
  product_id: string;
  size: string;
  stock_quantity: number;
  add_info?: string;
  created_at?: string;
};
