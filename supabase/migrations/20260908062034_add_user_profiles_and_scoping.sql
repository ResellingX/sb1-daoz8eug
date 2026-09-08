/*
# Add user profiles table and scope all data by user

1. New Tables
   - `user_profiles`
     - `id` (uuid, PK, references auth.users)
     - `role` (text, default 'user', check in ('admin','user'))
     - `display_name` (text, nullable)
     - `created_at` (timestamptz)

2. Modified Tables
   - `inventory_items`: add `user_id` column (uuid, default auth.uid(), references auth.users)
   - `sales`: add `user_id` column (uuid, default auth.uid(), references auth.users)
   - `invoices`: add `user_id` column (uuid, default auth.uid(), references auth.users)

3. Security
   - RLS on user_profiles: users can read/update own profile; admin can read all
   - Updated RLS on inventory_items, sales, invoices: owner-scoped CRUD (authenticated only)
   - winning_articles: admin can CRUD, all authenticated can SELECT

4. Notes
   - user_id columns are nullable to preserve existing data
   - A trigger creates a user_profiles row on signup
   - winning_articles remain shared (all users can read, only admin can write)
*/

-- 1. User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  display_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON user_profiles;
CREATE POLICY "delete_own_profile" ON user_profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (NEW.id, 'user', COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Add user_id to data tables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_items' AND column_name='user_id') THEN
    ALTER TABLE inventory_items ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='user_id') THEN
    ALTER TABLE sales ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='user_id') THEN
    ALTER TABLE invoices ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Update RLS policies on inventory_items
DROP POLICY IF EXISTS "anon_select_inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "anon_insert_inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "anon_update_inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "anon_delete_inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "select_own_inventory" ON inventory_items;
DROP POLICY IF EXISTS "insert_own_inventory" ON inventory_items;
DROP POLICY IF EXISTS "update_own_inventory" ON inventory_items;
DROP POLICY IF EXISTS "delete_own_inventory" ON inventory_items;

CREATE POLICY "select_own_inventory" ON inventory_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_inventory" ON inventory_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_inventory" ON inventory_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_inventory" ON inventory_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 4. Update RLS policies on sales
DROP POLICY IF EXISTS "anon_select_sales" ON sales;
DROP POLICY IF EXISTS "anon_insert_sales" ON sales;
DROP POLICY IF EXISTS "anon_update_sales" ON sales;
DROP POLICY IF EXISTS "anon_delete_sales" ON sales;
DROP POLICY IF EXISTS "select_own_sales" ON sales;
DROP POLICY IF EXISTS "insert_own_sales" ON sales;
DROP POLICY IF EXISTS "update_own_sales" ON sales;
DROP POLICY IF EXISTS "delete_own_sales" ON sales;

CREATE POLICY "select_own_sales" ON sales FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_sales" ON sales FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_sales" ON sales FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_sales" ON sales FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 5. Update RLS policies on invoices
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;

CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 6. Update RLS on winning_articles: all authenticated can read, only admin can write
DROP POLICY IF EXISTS "anon_select_winning_articles" ON winning_articles;
DROP POLICY IF EXISTS "anon_insert_winning_articles" ON winning_articles;
DROP POLICY IF EXISTS "anon_update_winning_articles" ON winning_articles;
DROP POLICY IF EXISTS "anon_delete_winning_articles" ON winning_articles;
DROP POLICY IF EXISTS "select_winning_articles" ON winning_articles;
DROP POLICY IF EXISTS "admin_insert_winning_articles" ON winning_articles;
DROP POLICY IF EXISTS "admin_update_winning_articles" ON winning_articles;
DROP POLICY IF EXISTS "admin_delete_winning_articles" ON winning_articles;

CREATE POLICY "select_winning_articles" ON winning_articles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin_insert_winning_articles" ON winning_articles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_update_winning_articles" ON winning_articles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_delete_winning_articles" ON winning_articles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
