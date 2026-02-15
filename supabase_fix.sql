-- Run this in the Supabase SQL Editor to fix the missing table error

-- 1. Create the product_details table
CREATE TABLE IF NOT EXISTS public.product_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    add_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Turn on Row Level Security (RLS)
ALTER TABLE public.product_details ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow everyone to Read
CREATE POLICY "Allow public read access"
ON public.product_details
FOR SELECT
TO public
USING (true);

-- 4. (Optional) Insert some dummy data for a product to test
-- Replace 'YOUR_PRODUCT_ID' with an actual ID from your products table
-- INSERT INTO public.product_details (product_id, size, stock_quantity, add_info)
-- VALUES ('YOUR_PRODUCT_ID', 'Small', 10, 'Fits small breeds'),
--        ('YOUR_PRODUCT_ID', 'Large', 5, 'Perfect for large dogs');
