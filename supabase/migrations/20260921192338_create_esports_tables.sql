/*
# FCA eSports Platform - Enums and Tables

Creates all enums and tables for the eSports platform with RLS policies.
Tables: profiles, clans, clan_members, products, purchases, transactions,
tickets, ticket_messages, tournaments, tournament_participants.
All tables have RLS enabled with appropriate ownership/admin policies.
*/

-- ENUMS
DO $do$ BEGIN
  CREATE TYPE player_rank AS ENUM ('unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

DO $do$ BEGIN
  CREATE TYPE clan_role AS ENUM ('leader', 'officer', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

DO $do$ BEGIN
  CREATE TYPE product_category AS ENUM ('skin', 'booster', 'cosmetic', 'pass', 'bundle');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

DO $do$ BEGIN
  CREATE TYPE product_rarity AS ENUM ('common', 'rare', 'epic', 'legendary', 'mythic');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

DO $do$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'purchase', 'reward', 'admin_adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

DO $do$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

DO $do$ BEGIN
  CREATE TYPE ticket_category AS ENUM ('general', 'payment', 'bug', 'account', 'report', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

DO $do$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

DO $do$ BEGIN
  CREATE TYPE tournament_status AS ENUM ('upcoming', 'registration', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT 'Player',
  avatar_url text,
  bio text DEFAULT '',
  discord_id text,
  discord_username text,
  rank player_rank NOT NULL DEFAULT 'unranked',
  points integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  kd_ratio numeric(5,2) NOT NULL DEFAULT 1.00,
  cash_balance numeric(12,2) NOT NULL DEFAULT 0.00,
  is_admin boolean NOT NULL DEFAULT false,
  country text DEFAULT '',
  main_game text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_profiles" ON profiles;
CREATE POLICY "select_all_profiles" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- CLANS
CREATE TABLE IF NOT EXISTS clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag text NOT NULL,
  description text DEFAULT '',
  logo_url text,
  leader_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_clans" ON clans;
CREATE POLICY "select_all_clans" ON clans FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_clan" ON clans;
CREATE POLICY "insert_own_clan" ON clans FOR INSERT TO authenticated WITH CHECK (auth.uid() = leader_id);
DROP POLICY IF EXISTS "update_own_clan" ON clans;
CREATE POLICY "update_own_clan" ON clans FOR UPDATE TO authenticated USING (auth.uid() = leader_id) WITH CHECK (auth.uid() = leader_id);
DROP POLICY IF EXISTS "delete_own_clan" ON clans;
CREATE POLICY "delete_own_clan" ON clans FOR DELETE TO authenticated USING (auth.uid() = leader_id);

-- CLAN MEMBERS
CREATE TABLE IF NOT EXISTS clan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role clan_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clan_id, user_id)
);
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_clan_members" ON clan_members;
CREATE POLICY "select_all_clan_members" ON clan_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_clan_member_self" ON clan_members;
CREATE POLICY "insert_clan_member_self" ON clan_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_clan_member_self_or_leader" ON clan_members;
CREATE POLICY "delete_clan_member_self_or_leader" ON clan_members FOR DELETE TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM clans WHERE clans.id = clan_members.clan_id AND clans.leader_id = auth.uid())
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(12,2) NOT NULL DEFAULT 0.00,
  category product_category NOT NULL DEFAULT 'cosmetic',
  image_url text,
  rarity product_rarity NOT NULL DEFAULT 'common',
  is_active boolean NOT NULL DEFAULT true,
  stock integer NOT NULL DEFAULT -1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_products" ON products;
CREATE POLICY "select_all_products" ON products FOR SELECT TO authenticated USING (true);

-- PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_purchases" ON purchases;
CREATE POLICY "select_own_purchases" ON purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_purchases" ON purchases;
CREATE POLICY "insert_own_purchases" ON purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0.00,
  description text DEFAULT '',
  balance_after numeric(12,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- TICKETS
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category ticket_category NOT NULL DEFAULT 'general',
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tickets" ON tickets;
CREATE POLICY "select_own_tickets" ON tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_tickets" ON tickets;
CREATE POLICY "insert_own_tickets" ON tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_tickets" ON tickets;
CREATE POLICY "update_own_tickets" ON tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TICKET MESSAGES
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  is_staff boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ticket_messages" ON ticket_messages;
CREATE POLICY "select_ticket_messages" ON ticket_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid())
);
DROP POLICY IF EXISTS "insert_own_ticket_messages" ON ticket_messages;
CREATE POLICY "insert_own_ticket_messages" ON ticket_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid())
);

-- TOURNAMENTS
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  game text NOT NULL DEFAULT '',
  status tournament_status NOT NULL DEFAULT 'upcoming',
  start_date timestamptz,
  prize_pool numeric(12,2) NOT NULL DEFAULT 0.00,
  max_participants integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_tournaments" ON tournaments;
CREATE POLICY "select_all_tournaments" ON tournaments FOR SELECT TO authenticated USING (true);

-- TOURNAMENT PARTICIPANTS
CREATE TABLE IF NOT EXISTS tournament_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  placement integer,
  points_earned integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_all_participants" ON tournament_participants;
CREATE POLICY "select_all_participants" ON tournament_participants FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_participant" ON tournament_participants;
CREATE POLICY "insert_own_participant" ON tournament_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_points ON profiles(points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_rank ON profiles(rank);
CREATE INDEX IF NOT EXISTS idx_clan_members_user ON clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);