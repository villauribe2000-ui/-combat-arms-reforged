/*
# FCA eSports Platform - Functions, Admin Policies, Trigger, and Seed Data

1. Creates is_admin() SECURITY DEFINER function for admin checks
2. Adds admin-level RLS policies on all tables
3. Creates handle_new_user() trigger for auto-creating profiles on signup
4. Seeds products and tournaments for initial content
*/

-- is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  );
$func$;

-- Admin policies on profiles
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin policies on clans
DROP POLICY IF EXISTS "admin_update_clans" ON clans;
CREATE POLICY "admin_update_clans" ON clans FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin policies on products
DROP POLICY IF EXISTS "admin_insert_products" ON products;
CREATE POLICY "admin_insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_products" ON products;
CREATE POLICY "admin_update_products" ON products FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_products" ON products;
CREATE POLICY "admin_delete_products" ON products FOR DELETE
  TO authenticated USING (public.is_admin());

-- Admin policies on purchases
DROP POLICY IF EXISTS "admin_update_purchases" ON purchases;
CREATE POLICY "admin_update_purchases" ON purchases FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin policies on transactions
DROP POLICY IF EXISTS "admin_insert_transactions" ON transactions;
CREATE POLICY "admin_insert_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Admin policies on tickets
DROP POLICY IF EXISTS "admin_select_tickets" ON tickets;
CREATE POLICY "admin_select_tickets" ON tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "admin_update_tickets" ON tickets;
CREATE POLICY "admin_update_tickets" ON tickets FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin policies on ticket_messages
DROP POLICY IF EXISTS "admin_select_ticket_messages" ON ticket_messages;
CREATE POLICY "admin_select_ticket_messages" ON ticket_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND (tickets.user_id = auth.uid() OR public.is_admin()))
  );
DROP POLICY IF EXISTS "admin_insert_ticket_messages" ON ticket_messages;
CREATE POLICY "admin_insert_ticket_messages" ON ticket_messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND (tickets.user_id = auth.uid() OR public.is_admin()))
  );

-- Admin policies on tournaments
DROP POLICY IF EXISTS "admin_insert_tournaments" ON tournaments;
CREATE POLICY "admin_insert_tournaments" ON tournaments FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update_tournaments" ON tournaments;
CREATE POLICY "admin_update_tournaments" ON tournaments FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_tournaments" ON tournaments;
CREATE POLICY "admin_delete_tournaments" ON tournaments FOR DELETE
  TO authenticated USING (public.is_admin());

-- Admin policies on tournament_participants
DROP POLICY IF EXISTS "admin_update_participants" ON tournament_participants;
CREATE POLICY "admin_update_participants" ON tournament_participants FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, discord_id, discord_username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name',
      split_part(NEW.email, '@', 1),
      'Player' || substr(NEW.id::text, 1, 6)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'user_name'
  );
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed products
INSERT INTO products (name, description, price, category, rarity, is_active, stock) VALUES
  ('Diamond Weapon Skin', 'Exclusive diamond-encrusted weapon skin with animated effects', 49.99, 'skin', 'legendary', true, 50),
  ('XP Booster x2 (7 days)', 'Double your XP gains for 7 days', 9.99, 'booster', 'rare', true, -1),
  ('Elite Player Banner', 'Animated banner with elite status display', 14.99, 'cosmetic', 'epic', true, 100),
  ('Season Pass - Season 7', 'Unlock all seasonal rewards instantly', 24.99, 'pass', 'epic', true, -1),
  ('Mythic Avatar Frame', 'Glowing mythic frame with particle effects', 79.99, 'cosmetic', 'mythic', true, 10),
  ('Pro Bundle Pack', 'Includes skin, booster, and banner - save 30%', 59.99, 'bundle', 'legendary', true, 25),
  ('Silver Weapon Skin', 'Sleek silver weapon skin', 19.99, 'skin', 'rare', true, 200),
  ('Victory Dance Emote', 'Celebratory emote for match victories', 7.99, 'cosmetic', 'common', true, -1)
ON CONFLICT DO NOTHING;

-- Seed tournaments
INSERT INTO tournaments (name, game, status, start_date, prize_pool, max_participants) VALUES
  ('FCA Championship Season 7', 'Valorant', 'registration', now() + interval '7 days', 5000.00, 256),
  ('Weekly Showdown #42', 'League of Legends', 'registration', now() + interval '3 days', 500.00, 64),
  ('Pro Series Finals', 'Counter-Strike 2', 'upcoming', now() + interval '14 days', 10000.00, 128)
ON CONFLICT DO NOTHING;