import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  discord_id: string | null;
  discord_username: string | null;
  rank: string;
  points: number;
  wins: number;
  losses: number;
  kd_ratio: number;
  cash_balance: number;
  is_admin: boolean;
  country: string;
  main_game: string;
  created_at: string;
  updated_at: string;
};

export type Clan = {
  id: string;
  name: string;
  tag: string;
  description: string;
  logo_url: string | null;
  leader_id: string;
  member_count: number;
  created_at: string;
};

export type ClanMember = {
  id: string;
  clan_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: Profile;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  rarity: string;
  is_active: boolean;
  stock: number;
  created_at: string;
};

export type Purchase = {
  id: string;
  user_id: string;
  product_id: string;
  amount: number;
  status: string;
  created_at: string;
  product?: Product;
};

export type Transaction = {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string;
  balance_after: number;
  created_at: string;
};

export type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  user_id: string;
  is_staff: boolean;
  message: string;
  created_at: string;
  profile?: Profile;
};

export type Tournament = {
  id: string;
  name: string;
  game: string;
  status: string;
  start_date: string | null;
  prize_pool: number;
  max_participants: number;
  created_at: string;
};

export type TournamentParticipant = {
  id: string;
  tournament_id: string;
  user_id: string;
  placement: number | null;
  points_earned: number;
  created_at: string;
};

export const RANK_INFO: Record<string, { label: string; color: string; glow: string }> = {
  unranked: { label: 'Unranked', color: 'text-slate-400', glow: 'shadow-slate-500/30' },
  bronze: { label: 'Bronze', color: 'text-amber-700', glow: 'shadow-amber-700/40' },
  silver: { label: 'Silver', color: 'text-slate-300', glow: 'shadow-slate-300/40' },
  gold: { label: 'Gold', color: 'text-yellow-400', glow: 'shadow-yellow-400/40' },
  platinum: { label: 'Platinum', color: 'text-cyan-300', glow: 'shadow-cyan-300/40' },
  diamond: { label: 'Diamond', color: 'text-sky-400', glow: 'shadow-sky-400/40' },
  master: { label: 'Master', color: 'text-fuchsia-400', glow: 'shadow-fuchsia-400/40' },
  grandmaster: { label: 'Grandmaster', color: 'text-rose-400', glow: 'shadow-rose-400/50' },
};

export const RARITY_INFO: Record<string, { label: string; border: string; bg: string; text: string }> = {
  common: { label: 'Common', border: 'border-slate-500/40', bg: 'bg-slate-500/10', text: 'text-slate-300' },
  rare: { label: 'Rare', border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-300' },
  epic: { label: 'Epic', border: 'border-purple-500/40', bg: 'bg-purple-500/10', text: 'text-purple-300' },
  legendary: { label: 'Legendary', border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-300' },
  mythic: { label: 'Mythic', border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-300' },
};
