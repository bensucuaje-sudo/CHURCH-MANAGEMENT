import { Member, Contribution, ChurchPreferences } from '../types';
import { supabase, SUPABASE_URL, SUPABASE_PUBLIC_KEY } from '../supabaseClient';

export { supabase };

// Check if Supabase keys are configured either via env or via direct variables
const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const isHardcodedValid = !!(
  SUPABASE_URL && 
  SUPABASE_PUBLIC_KEY && 
  !SUPABASE_URL.includes('placeholder-url') && 
  !SUPABASE_PUBLIC_KEY.includes('placeholder-key')
);

export const isSupabaseConfigured = !!(envUrl && envKey) || isHardcodedValid;



/**
 * SQL SCHEMA FOR SUPABASE SQL EDITOR
 * 
 * Copy and run this script in your Supabase SQL Editor to bootstrap the tables:
 * 
 * -- 1. Enable UUID extension if not enabled
 * create extension if not exists "uuid-ossp";
 * 
 * -- 2. Members Table
 * create table if not exists public.members (
 *   id text not null,
 *   user_id uuid not null default auth.uid(),
 *   name text not null,
 *   email text,
 *   phone text,
 *   address text,
 *   "membershipDate" text,
 *   status text,
 *   role text,
 *   notes text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   primary key (id, user_id)
 * );
 * 
 * -- 3. Contributions Table
 * create table if not exists public.contributions (
 *   id text not null,
 *   user_id uuid not null default auth.uid(),
 *   "memberId" text,
 *   "memberName" text,
 *   date text,
 *   "receiptNo" text,
 *   "paymentMethod" text,
 *   tithe numeric default 0,
 *   "combinedOffering" numeric default 0,
 *   "buildingFund" numeric default 0,
 *   missions numeric default 0,
 *   youth numeric default 0,
 *   others numeric default 0,
 *   total numeric default 0,
 *   notes text,
 *   "copMission" numeric default 0,
 *   "harvestIngathering" numeric default 0,
 *   "hopeRadio" numeric default 0,
 *   "sulads" numeric default 0,
 *   "specifiedOffering" numeric default 0,
 *   "specifiedOfferingName" text,
 *   "copChurch" numeric default 0,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   primary key (id, user_id)
 * );
 * 
 * -- 4. Preferences Table
 * create table if not exists public.preferences (
 *   id text not null default 'church_config',
 *   user_id uuid not null default auth.uid(),
 *   "churchName" text,
 *   "churchAddress" text,
 *   "churchEmail" text,
 *   currency text,
 *   "combinedOfferingAllocations" jsonb,
 *   "titheAllocations" jsonb,
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   primary key (id, user_id)
 * );
 * 
 * -- Enable Row Level Security (RLS)
 * alter table public.members enable row level security;
 * alter table public.contributions enable row level security;
 * alter table public.preferences enable row level security;
 * 
 * -- Create basic public policies (allows authenticated users to CRUD, or anyone with anon key)
 * create policy "Allow owners access to members" on public.members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 * create policy "Allow owners access to contributions" on public.contributions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 * create policy "Allow owners access to preferences" on public.preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 */

export const getSupabaseSqlSetupCode = () => {
  return `
-- 1. Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 2. Members Table
create table if not exists public.members (
  id text not null,
  user_id uuid not null default auth.uid(),
  name text not null,
  email text,
  phone text,
  address text,
  "membershipDate" text,
  status text,
  role text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, user_id)
);

-- 3. Contributions Table
create table if not exists public.contributions (
  id text not null,
  user_id uuid not null default auth.uid(),
  "memberId" text,
  "memberName" text,
  date text,
  "receiptNo" text,
  "paymentMethod" text,
  tithe numeric default 0,
  "combinedOffering" numeric default 0,
  "buildingFund" numeric default 0,
  missions numeric default 0,
  youth numeric default 0,
  others numeric default 0,
  total numeric default 0,
  notes text,
  "copMission" numeric default 0,
  "harvestIngathering" numeric default 0,
  "hopeRadio" numeric default 0,
  "sulads" numeric default 0,
  "specifiedOffering" numeric default 0,
  "specifiedOfferingName" text,
  "copChurch" numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, user_id)
);

-- 4. Preferences Table
create table if not exists public.preferences (
  id text not null default 'church_config',
  user_id uuid not null default auth.uid(),
  "churchName" text,
  "churchAddress" text,
  "churchEmail" text,
  currency text,
  "combinedOfferingAllocations" jsonb,
  "titheAllocations" jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, user_id)
);

-- Enable Row Level Security (RLS)
alter table public.members enable row level security;
alter table public.contributions enable row level security;
alter table public.preferences enable row level security;

-- Drop existing policies if any to prevent duplication
drop policy if exists "Allow owners access to members" on public.members;
drop policy if exists "Allow owners access to contributions" on public.contributions;
drop policy if exists "Allow owners access to preferences" on public.preferences;
drop policy if exists "Allow public access to members" on public.members;
drop policy if exists "Allow public access to contributions" on public.contributions;
drop policy if exists "Allow public access to preferences" on public.preferences;

-- Create secure multi-tenant policies using auth.uid()
create policy "Allow owners access to members" on public.members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Allow owners access to contributions" on public.contributions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Allow owners access to preferences" on public.preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  `.trim();
};

// --- Members Database Helpers ---
export async function dbFetchMembers(): Promise<Member[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });
  if (error) {
    console.warn('Error fetching members from Supabase:', error);
    throw error;
  }
  return data || [];
}

export async function dbUpsertMember(member: Member): Promise<void> {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated session required to save members");

  const { error } = await supabase
    .from('members')
    .upsert({
      ...member,
      user_id: user.id
    });
  if (error) {
    console.error('Error upserting member to Supabase:', error);
    throw error;
  }
}

export async function dbDeleteMember(id: string): Promise<void> {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated session required to delete members");

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    console.error('Error deleting member from Supabase:', error);
    throw error;
  }
}

// --- Contributions Database Helpers ---
export async function dbFetchContributions(): Promise<Contribution[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });
  if (error) {
    console.warn('Error fetching contributions from Supabase:', error);
    throw error;
  }
  return (data || []).map(item => ({
    ...item,
    // Ensure numbers are floats/integers rather than strings from postgres numeric
    tithe: Number(item.tithe),
    combinedOffering: Number(item.combinedOffering),
    buildingFund: Number(item.buildingFund),
    missions: Number(item.missions),
    youth: Number(item.youth),
    others: Number(item.others),
    total: Number(item.total),
    copMission: item.copMission ? Number(item.copMission) : undefined,
    harvestIngathering: item.harvestIngathering ? Number(item.harvestIngathering) : undefined,
    hopeRadio: item.hopeRadio ? Number(item.hopeRadio) : undefined,
    sulads: item.sulads ? Number(item.sulads) : undefined,
    specifiedOffering: item.specifiedOffering ? Number(item.specifiedOffering) : undefined,
    copChurch: item.copChurch ? Number(item.copChurch) : undefined,
  }));
}

export async function dbUpsertContribution(contribution: Contribution): Promise<void> {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated session required to save contributions");

  const { error } = await supabase
    .from('contributions')
    .upsert({
      ...contribution,
      user_id: user.id
    });
  if (error) {
    console.error('Error upserting contribution to Supabase:', error);
    throw error;
  }
}

export async function dbDeleteContribution(id: string): Promise<void> {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated session required to delete contributions");

  const { error } = await supabase
    .from('contributions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    console.error('Error deleting contribution from Supabase:', error);
    throw error;
  }
}

// --- Preferences Database Helpers ---
export async function dbFetchPreferences(): Promise<ChurchPreferences | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('preferences')
    .select('*')
    .eq('id', 'church_config')
    .eq('user_id', user.id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found, return null
      return null;
    }
    console.warn('Error fetching preferences from Supabase:', error);
    throw error;
  }
  return data;
}

export async function dbUpsertPreferences(preferences: ChurchPreferences): Promise<void> {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authenticated session required to save preferences");

  const { error } = await supabase
    .from('preferences')
    .upsert({
      id: 'church_config',
      user_id: user.id,
      churchName: preferences.churchName,
      churchAddress: preferences.churchAddress,
      churchEmail: preferences.churchEmail,
      currency: preferences.currency,
      combinedOfferingAllocations: preferences.combinedOfferingAllocations,
      titheAllocations: preferences.titheAllocations,
      updated_at: new Date().toISOString()
    });
  if (error) {
    console.error('Error upserting preferences to Supabase:', error);
    throw error;
  }
}
