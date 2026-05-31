-- ============================================================
-- LuxeState CRM — Add lead_id to conversations
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- (Only needed if you already ran supabase-messaging-setup.sql)
-- ============================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS lead_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_conversations_lead_id
  ON public.conversations(lead_id);
