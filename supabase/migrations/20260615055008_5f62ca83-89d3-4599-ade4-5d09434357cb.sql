
-- 1. Fix signup: gen_random_bytes lives in pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Repoint functions to extensions schema
CREATE OR REPLACE FUNCTION public.gen_wallet_address(net text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
DECLARE
  hex text;
  alphabet text := '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  i int;
  out text := '';
BEGIN
  hex := encode(extensions.gen_random_bytes(20), 'hex');
  FOR i IN 1..60 LOOP
    out := out || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 58), 1);
  END LOOP;
  RETURN CASE net
    WHEN 'BTC' THEN 'bc1q' || substr(hex, 1, 38)
    WHEN 'ETH' THEN '0x' || encode(extensions.gen_random_bytes(20), 'hex')
    WHEN 'BNB' THEN '0x' || encode(extensions.gen_random_bytes(20), 'hex')
    WHEN 'AVAX' THEN '0x' || encode(extensions.gen_random_bytes(20), 'hex')
    WHEN 'SOL' THEN substr(out, 1, 44)
    WHEN 'TRX' THEN 'T' || substr(out, 1, 33)
    WHEN 'LTC' THEN 'ltc1q' || substr(hex, 1, 38)
    WHEN 'DOGE' THEN 'D' || substr(out, 1, 33)
    WHEN 'ADA' THEN 'addr1' || substr(out, 1, 53)
    ELSE '0x' || hex
  END;
END;
$function$;

-- 2. Add token column for per-coin tracking (USDT-ERC20 vs USDT-BEP20 etc.)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS token text NOT NULL DEFAULT '';

-- Backfill: token defaults to the network's native asset
UPDATE public.transactions SET token = network WHERE token = '';

-- 3. Per-(network, token) balance function
CREATE OR REPLACE FUNCTION public.get_my_token_balances()
RETURNS TABLE(network text, token text, amount numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT t.network, t.token,
    SUM(CASE WHEN t.to_user_id = auth.uid() THEN t.amount
             WHEN t.from_user_id = auth.uid() THEN -t.amount
             ELSE 0 END) AS amount
  FROM public.transactions t
  WHERE (t.to_user_id = auth.uid() OR t.from_user_id = auth.uid())
  GROUP BY t.network, t.token;
$$;
