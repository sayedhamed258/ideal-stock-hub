-- Add new columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS in_stock_standard text,
ADD COLUMN IF NOT EXISTS packing_inner text,
ADD COLUMN IF NOT EXISTS packing_final_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS without_tax_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS mrp_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS item_code text,
ADD COLUMN IF NOT EXISTS sr_no text;