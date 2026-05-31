-- ============================================================
-- LuxeState CRM — Connected Accounts Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider        TEXT NOT NULL CHECK (provider IN ('whatsapp', 'facebook', 'instagram', 'tiktok')),
  account_name    TEXT,
  account_id      TEXT,
  access_token    TEXT,
  refresh_token   TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'error')),
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- One account per provider per user
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id
  ON public.connected_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_provider
  ON public.connected_accounts(user_id, provider);

-- Row Level Security
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connected_accounts_owner"
  ON public.connected_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
