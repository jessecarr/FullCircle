-- Enable RLS on lightspeed_items_sync_status
ALTER TABLE public.lightspeed_items_sync_status ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (matches existing RLS pattern)
CREATE POLICY "Authenticated users can view sync status"
  ON public.lightspeed_items_sync_status
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sync status"
  ON public.lightspeed_items_sync_status
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sync status"
  ON public.lightspeed_items_sync_status
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sync status"
  ON public.lightspeed_items_sync_status
  FOR DELETE
  TO authenticated
  USING (true);
