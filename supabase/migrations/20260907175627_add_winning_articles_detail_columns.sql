/*
# Add detail columns to winning_articles table

Adds new columns to support carousel view with detailed article info:
- `image_url` (text) — URL to the product photo
- `size` (text) — shoe size
- `sale_time_minutes` (integer) — how fast it sold in minutes
- `description` (text) — original listing description
- `vinted_url` (text) — direct link to the Vinted listing

These columns are all optional with sensible defaults so existing rows remain valid.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winning_articles' AND column_name = 'image_url') THEN
    ALTER TABLE winning_articles ADD COLUMN image_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winning_articles' AND column_name = 'size') THEN
    ALTER TABLE winning_articles ADD COLUMN size text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winning_articles' AND column_name = 'sale_time_minutes') THEN
    ALTER TABLE winning_articles ADD COLUMN sale_time_minutes integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winning_articles' AND column_name = 'description') THEN
    ALTER TABLE winning_articles ADD COLUMN description text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'winning_articles' AND column_name = 'vinted_url') THEN
    ALTER TABLE winning_articles ADD COLUMN vinted_url text DEFAULT '';
  END IF;
END $$;
