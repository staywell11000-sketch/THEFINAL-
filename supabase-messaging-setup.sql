-- ============================================================
-- LuxeState CRM — Messaging Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. CONTACTS
CREATE TABLE IF NOT EXISTS public.contacts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  avatar_initials TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id               UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id                  INTEGER,   -- links to Leads (Postgres integer PK)
  title                    TEXT,
  status                   TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'resolved')),
  channel                  TEXT DEFAULT 'crm' CHECK (channel IN ('crm', 'whatsapp')),
  whatsapp_conversation_id TEXT,
  linked_property          TEXT,
  last_message             TEXT,
  last_message_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  unread_count             INT DEFAULT 0 NOT NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id     UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id           UUID REFERENCES auth.users(id) NOT NULL,
  content             TEXT NOT NULL,
  type                TEXT DEFAULT 'text' CHECK (type IN ('text', 'template', 'note')),
  status              TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  direction           TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  whatsapp_message_id TEXT UNIQUE,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. CONNECTED ACCOUNTS (add metadata column if not present)
-- This table is created by Supabase Auth or your existing schema.
-- Run this only if the connected_accounts table already exists:
ALTER TABLE IF EXISTS public.connected_accounts
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 5. MIGRATIONS — add columns to existing tables if upgrading
-- Run these if you already have the tables and need to add new columns:
ALTER TABLE IF EXISTS public.conversations
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'crm' CHECK (channel IN ('crm', 'whatsapp')),
  ADD COLUMN IF NOT EXISTS whatsapp_conversation_id TEXT;

ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

-- Add unique constraint on whatsapp_message_id if not exists (may error if already exists — safe to ignore)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_whatsapp_message_id_key'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_whatsapp_message_id_key UNIQUE (whatsapp_message_id);
  END IF;
END $$;

-- 6. HELPER FUNCTION — increment unread count
CREATE OR REPLACE FUNCTION public.increment_unread_count(conv_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.conversations
  SET unread_count = unread_count + 1
  WHERE id = conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_conversations_user_id  ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact  ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id  ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel  ON public.conversations(channel);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at   ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_wamid        ON public.messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id      ON public.contacts(user_id);

-- 8. ROW LEVEL SECURITY
ALTER TABLE public.contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

-- Contacts: full access for owner
CREATE POLICY IF NOT EXISTS "contacts_owner" ON public.contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Conversations: full access for owner
CREATE POLICY IF NOT EXISTS "conversations_owner" ON public.conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Messages: read if conversation belongs to you
CREATE POLICY IF NOT EXISTS "messages_select" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Messages: insert if conversation belongs to you and you are the sender
CREATE POLICY IF NOT EXISTS "messages_insert" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Messages: update status if conversation belongs to you
CREATE POLICY IF NOT EXISTS "messages_update" ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- 9. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
