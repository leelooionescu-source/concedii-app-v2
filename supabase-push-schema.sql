-- Tabel pentru subscripții push (un rand per device)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Permite anon (aplicatia foloseste cont shared cu cookie-based auth, nu Supabase Auth)
DROP POLICY IF EXISTS "push_select" ON push_subscriptions;
DROP POLICY IF EXISTS "push_insert" ON push_subscriptions;
DROP POLICY IF EXISTS "push_delete" ON push_subscriptions;

CREATE POLICY "push_select" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "push_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "push_delete" ON push_subscriptions FOR DELETE USING (true);
