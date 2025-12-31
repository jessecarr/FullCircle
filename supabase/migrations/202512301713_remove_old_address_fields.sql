-- Migration to remove old address line fields
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'special_orders' AND column_name = 'customer_address_line_1') THEN
    ALTER TABLE public.special_orders DROP COLUMN customer_address_line_1;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'special_orders' AND column_name = 'customer_address_line_2') THEN
    ALTER TABLE public.special_orders DROP COLUMN customer_address_line_2;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'special_orders' AND column_name = 'customer_address_line_3') THEN
    ALTER TABLE public.special_orders DROP COLUMN customer_address_line_3;
  END IF;
END
$$;
