/*
# Add batch_number to sales table

1. Modified Tables
   - `sales`
     - `batch_number` (text, nullable) — snapshot of the inventory item's batch/order number at sale time, enabling filtering sales by batch

2. Notes
   - Existing rows will have NULL for batch_number.
   - No destructive changes.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE sales ADD COLUMN batch_number text;
  END IF;
END $$;
