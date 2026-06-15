
-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Wallet addresses
CREATE TABLE public.wallet_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network text NOT NULL,
  address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, network)
);
CREATE INDEX wallet_addresses_address_idx ON public.wallet_addresses(address);
GRANT SELECT ON public.wallet_addresses TO authenticated, anon;
GRANT ALL ON public.wallet_addresses TO service_role;
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Addresses are viewable by everyone" ON public.wallet_addresses FOR SELECT USING (true);

-- Transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_address text,
  to_address text NOT NULL,
  network text NOT NULL,
  amount numeric(30, 10) NOT NULL CHECK (amount > 0),
  note text,
  kind text NOT NULL DEFAULT 'transfer',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_from_idx ON public.transactions(from_user_id, created_at DESC);
CREATE INDEX transactions_to_idx ON public.transactions(to_user_id, created_at DESC);
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Address generator
CREATE OR REPLACE FUNCTION public.gen_wallet_address(net text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  hex text;
  b58 text;
  alphabet text := '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  i int;
  out text := '';
BEGIN
  hex := encode(gen_random_bytes(20), 'hex');
  -- Pseudo base58
  FOR i IN 1..44 LOOP
    out := out || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % 58), 1);
  END LOOP;
  b58 := out;
  RETURN CASE net
    WHEN 'BTC' THEN 'bc1q' || substr(hex, 1, 38)
    WHEN 'ETH' THEN '0x' || encode(gen_random_bytes(20), 'hex')
    WHEN 'BNB' THEN '0x' || encode(gen_random_bytes(20), 'hex')
    WHEN 'AVAX' THEN '0x' || encode(gen_random_bytes(20), 'hex')
    WHEN 'SOL' THEN substr(b58, 1, 44)
    WHEN 'TRX' THEN 'T' || substr(b58, 1, 33)
    WHEN 'LTC' THEN 'ltc1q' || substr(hex, 1, 38)
    WHEN 'DOGE' THEN 'D' || substr(b58, 1, 33)
    WHEN 'ADA' THEN 'addr1' || substr(b58, 1, 53)
    ELSE '0x' || hex
  END;
END;
$$ SET search_path = public;

-- Trigger on signup: profile + addresses for 9 networks
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uname text;
  net text;
  nets text[] := ARRAY['BTC','ETH','SOL','BNB','TRX','LTC','DOGE','AVAX','ADA'];
BEGIN
  uname := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8));
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, uname, COALESCE(NEW.raw_user_meta_data->>'display_name', uname));
  FOREACH net IN ARRAY nets LOOP
    INSERT INTO public.wallet_addresses (user_id, network, address)
    VALUES (NEW.id, net, public.gen_wallet_address(net));
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Balance view
CREATE OR REPLACE VIEW public.balances AS
SELECT
  u.id AS user_id,
  net AS network,
  COALESCE(SUM(CASE WHEN t.to_user_id = u.id THEN t.amount ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN t.from_user_id = u.id THEN t.amount ELSE 0 END), 0) AS amount
FROM auth.users u
CROSS JOIN unnest(ARRAY['BTC','ETH','SOL','BNB','TRX','LTC','DOGE','AVAX','ADA']) AS net
LEFT JOIN public.transactions t
  ON t.network = net AND (t.from_user_id = u.id OR t.to_user_id = u.id)
GROUP BY u.id, net;
GRANT SELECT ON public.balances TO authenticated;
