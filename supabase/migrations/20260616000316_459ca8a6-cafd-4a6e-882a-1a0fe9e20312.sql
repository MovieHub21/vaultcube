
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Admin list users function (returns id, username, display_name)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (id uuid, username text, display_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.created_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC
$$;

-- Admin token balances per user
CREATE OR REPLACE FUNCTION public.admin_get_user_balances(_user_id uuid)
RETURNS TABLE (network text, token text, amount numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.network, t.token,
    SUM(CASE WHEN t.to_user_id = _user_id THEN t.amount
             WHEN t.from_user_id = _user_id THEN -t.amount ELSE 0 END) AS amount
  FROM public.transactions t
  WHERE (t.to_user_id = _user_id OR t.from_user_id = _user_id)
    AND public.has_role(auth.uid(), 'admin')
  GROUP BY t.network, t.token
$$;
