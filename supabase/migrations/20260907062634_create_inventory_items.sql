/*
# Create the shared sneaker inventory and image storage

1. New Tables
- `inventory_items` stores each sneaker added to ResellingX.
- `id` is the stable item identifier.
- `name` stores the sneaker name.
- `size` stores the displayed size.
- `cost_price` stores the purchase price in euros.
- `sale_price` stores the intended selling price in euros.
- `image_path` stores the private storage object path for its photo.
- `created_at` stores when the item was added.

2. Storage
- Creates the `inventory-images` bucket for sneaker photos.
- The bucket is intentionally public because this app has no sign-in screen and inventory is shared in this single-tenant experience.
- Uploads are restricted to the inventory bucket and limited to the inventory image path prefix.

3. Security
- Enables row-level security on `inventory_items`.
- Adds separate SELECT, INSERT, UPDATE, and DELETE policies for anon and authenticated roles.
- Adds separate storage policies for SELECT, INSERT, UPDATE, and DELETE on the inventory image bucket.

4. Important Notes
- The app validates file type and size before upload as a user-facing guard.
- The database and storage policies are the enforced access boundary for the shared no-auth app.
*/

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size text NOT NULL,
  cost_price numeric(10, 2) NOT NULL CHECK (cost_price >= 0),
  sale_price numeric(10, 2) NOT NULL CHECK (sale_price >= 0),
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_items_select_shared" ON public.inventory_items;
CREATE POLICY "inventory_items_select_shared" ON public.inventory_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "inventory_items_insert_shared" ON public.inventory_items;
CREATE POLICY "inventory_items_insert_shared" ON public.inventory_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_items_update_shared" ON public.inventory_items;
CREATE POLICY "inventory_items_update_shared" ON public.inventory_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_items_delete_shared" ON public.inventory_items;
CREATE POLICY "inventory_items_delete_shared" ON public.inventory_items FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-images', 'inventory-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "inventory_images_select_shared" ON storage.objects;
CREATE POLICY "inventory_images_select_shared" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'inventory-images');

DROP POLICY IF EXISTS "inventory_images_insert_shared" ON storage.objects;
CREATE POLICY "inventory_images_insert_shared" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'inventory-images' AND (storage.foldername(name))[1] = 'inventory');

DROP POLICY IF EXISTS "inventory_images_update_shared" ON storage.objects;
CREATE POLICY "inventory_images_update_shared" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'inventory-images' AND (storage.foldername(name))[1] = 'inventory')
  WITH CHECK (bucket_id = 'inventory-images' AND (storage.foldername(name))[1] = 'inventory');

DROP POLICY IF EXISTS "inventory_images_delete_shared" ON storage.objects;
CREATE POLICY "inventory_images_delete_shared" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'inventory-images' AND (storage.foldername(name))[1] = 'inventory');