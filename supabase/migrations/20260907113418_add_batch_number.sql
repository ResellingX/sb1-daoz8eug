/*
# Add batch/order number to inventory items

1. Modified Tables
   - `inventory_items`
     - `batch_number` (text, nullable) — optional order/batch identifier (e.g. "Pedido #1")

2. Notes
   - No destructive changes.
   - Existing rows will have NULL for batch_number.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN batch_number text;
  END IF;
END $$;
