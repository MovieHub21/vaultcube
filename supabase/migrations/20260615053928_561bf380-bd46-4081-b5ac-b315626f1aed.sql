
-- Lock down generator
REVOKE EXECUTE ON FUNCTION public.gen_wallet_address(text) FROM PUBLIC, anon, authenticated;

-- Drop old view exposing auth.users
DROP VIEW IF EXISTS public.balances;

-- Replace with function returning only caller's balances
CREATE OR REPLACE FUNCTION public.get_my_balances()
RETURNS TABLE(network text, amount numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH nets AS (
    SELECT unnest(ARRAY['BTC','ETH','SOL','BNB','TRX','LTC','DOGE','AVAX','ADA']) AS network
  )
  SELECT
    n.network,
    COALESCE((
      SELECT SUM(CASE WHEN t.to_user_id = auth.uid() THEN t.amount
                       WHEN t.from_user_id = auth.uid() THEN -t.amount
                       ELSE 0 END)
      FROM public.transactions t
      WHERE t.network = n.network
        AND (t.to_user_id = auth.uid() OR t.from_user_id = auth.uid())
    ), 0) AS amount
  FROM nets n;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_balances() TO authenticated;
