-- Add customer address fields to special_orders table
ALTER TABLE public.special_orders
ADD COLUMN customer_street text,
ADD COLUMN customer_city text,
ADD COLUMN customer_state text,
ADD COLUMN customer_zip text;
