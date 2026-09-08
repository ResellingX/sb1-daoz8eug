/*
# Store inventory photo Data URLs

1. Modified Tables
- Adds `image_data` to `inventory_items`.
- This column stores the selected image as a Base64 Data URL so the inventory card can render the exact local image after reload.

2. Security
- The existing row-level security policies remain in place for the shared no-auth inventory.
- No existing data is removed or changed.

3. Important Notes
- New records may store a browser-generated Data URL in this column.
- Existing records continue to use their storage image path until a new image is saved.
*/

ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS image_data text;