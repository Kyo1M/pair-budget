-- PairBudget MVP Supabase schema
-- 冪等実行できるよう IF EXISTS / IF NOT EXISTS を活用する

----------------------------
-- 1. Extensions
----------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------
-- 2. Helper ENUM / Types
----------------------------

CREATE TYPE public.transaction_type AS ENUM ('expense', 'income', 'advance');

----------------------------
-- 3. Profiles
----------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
CREATE POLICY "Profiles select own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

----------------------------
-- 4. Households
----------------------------

CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

----------------------------
-- 5. Household Members
----------------------------

CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- 6. Household Join Codes
----------------------------

CREATE TABLE IF NOT EXISTS public.household_join_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.household_join_codes ENABLE ROW LEVEL SECURITY;

----------------------------
-- 7. Transactions
----------------------------

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  note TEXT,
  payer_user_id UUID REFERENCES auth.users(id),
  advance_to_user_id UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

----------------------------
-- 8. Settlements
----------------------------

CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  settled_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

----------------------------
-- 9. Helper Functions
----------------------------

-- household メンバー判定
CREATE OR REPLACE FUNCTION public.is_household_member(target_household UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.household_id = target_household
      AND hm.user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.is_household_member(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_household_member(UUID) TO authenticated, service_role;

-- household オーナー判定
CREATE OR REPLACE FUNCTION public.is_household_owner(target_household UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.households h
    WHERE h.id = target_household
      AND h.owner_user_id = auth.uid()
  );
$$;

ALTER FUNCTION public.is_household_owner(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_household_owner(UUID) TO authenticated, service_role;

-- 世帯の立替残高を計算するRPC関数
CREATE OR REPLACE FUNCTION public.get_household_balances(target_household UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  balance_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH advance_payments AS (
    -- 立替支払い（自分が立て替えた分）
    SELECT 
      t.payer_user_id AS user_id,
      COALESCE(SUM(t.amount), 0) AS paid_amount
    FROM public.transactions t
    WHERE t.household_id = target_household
      AND t.type = 'advance'
      AND t.payer_user_id IS NOT NULL
    GROUP BY t.payer_user_id
  ),
  advance_debts AS (
    -- 立替債務（相手に立て替えてもらった分）
    SELECT 
      t.advance_to_user_id AS user_id,
      COALESCE(SUM(t.amount), 0) AS debt_amount
    FROM public.transactions t
    WHERE t.household_id = target_household
      AND t.type = 'advance'
      AND t.advance_to_user_id IS NOT NULL
    GROUP BY t.advance_to_user_id
  ),
  settlement_paid AS (
    -- 精算で支払った分
    SELECT 
      s.from_user_id AS user_id,
      COALESCE(SUM(s.amount), 0) AS paid_amount
    FROM public.settlements s
    WHERE s.household_id = target_household
    GROUP BY s.from_user_id
  ),
  settlement_received AS (
    -- 精算で受け取った分
    SELECT 
      s.to_user_id AS user_id,
      COALESCE(SUM(s.amount), 0) AS received_amount
    FROM public.settlements s
    WHERE s.household_id = target_household
    GROUP BY s.to_user_id
  )
  SELECT 
    hm.user_id,
    p.name AS user_name,
    (
      COALESCE(ap.paid_amount, 0) - 
      COALESCE(ad.debt_amount, 0) - 
      COALESCE(sp.paid_amount, 0) + 
      COALESCE(sr.received_amount, 0)
    ) AS balance_amount
  FROM public.household_members hm
  LEFT JOIN public.profiles p ON p.id = hm.user_id
  LEFT JOIN advance_payments ap ON ap.user_id = hm.user_id
  LEFT JOIN advance_debts ad ON ad.user_id = hm.user_id
  LEFT JOIN settlement_paid sp ON sp.user_id = hm.user_id
  LEFT JOIN settlement_received sr ON sr.user_id = hm.user_id
  WHERE hm.household_id = target_household
  ORDER BY hm.joined_at;
END;
$$;

ALTER FUNCTION public.get_household_balances(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_household_balances(UUID) TO authenticated, service_role;

----------------------------
-- 10. Triggers
----------------------------

-- Supabase auth.users → profiles 同期
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- household オーナー列を認証ユーザーで固定
CREATE OR REPLACE FUNCTION public.set_household_owner_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.owner_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_household_owner_before_insert ON public.households;
CREATE TRIGGER set_household_owner_before_insert
  BEFORE INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.set_household_owner_id();

-- household 作成時にオーナーを household_members に追加
CREATE OR REPLACE FUNCTION public.add_household_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.household_members (household_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_user_id, 'owner', NOW())
  ON CONFLICT (household_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS add_household_owner_trigger ON public.households;
CREATE TRIGGER add_household_owner_trigger
  AFTER INSERT ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.add_household_owner_as_member();

----------------------------
-- 11. Row Level Security Policies
----------------------------

-- households
DROP POLICY IF EXISTS "Household members can view household" ON public.households;
CREATE POLICY "Household members can view household" ON public.households
  FOR SELECT USING (
    public.is_household_member(households.id)
  );

DROP POLICY IF EXISTS "Household owners can view household" ON public.households;
CREATE POLICY "Household owners can view household" ON public.households
  FOR SELECT USING (
    public.is_household_owner(households.id)
  );

DROP POLICY IF EXISTS "Users can create households" ON public.households;
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Household owners can update household" ON public.households;
CREATE POLICY "Household owners can update household" ON public.households
  FOR UPDATE USING (
    public.is_household_owner(households.id)
  );

-- household_members
DROP POLICY IF EXISTS "Household members can view members" ON public.household_members;
CREATE POLICY "Household members can view members" ON public.household_members
  FOR SELECT USING (
    public.is_household_member(household_members.household_id)
  );

DROP POLICY IF EXISTS "Household owners can add members" ON public.household_members;
CREATE POLICY "Household owners can add members" ON public.household_members
  FOR INSERT WITH CHECK (
    public.is_household_owner(household_members.household_id)
    OR auth.uid() = household_members.user_id
  );

DROP POLICY IF EXISTS "Household owners can update members" ON public.household_members;
CREATE POLICY "Household owners can update members" ON public.household_members
  FOR UPDATE USING (
    public.is_household_owner(household_members.household_id)
  );

DROP POLICY IF EXISTS "Household owners can remove members" ON public.household_members;
CREATE POLICY "Household owners can remove members" ON public.household_members
  FOR DELETE USING (
    public.is_household_owner(household_members.household_id)
  );

-- household_join_codes
DROP POLICY IF EXISTS "Household owners manage join codes" ON public.household_join_codes;
CREATE POLICY "Household owners manage join codes" ON public.household_join_codes
  USING (
    public.is_household_owner(household_join_codes.household_id)
  )
  WITH CHECK (
    public.is_household_owner(household_join_codes.household_id)
  );

DROP POLICY IF EXISTS "Authenticated users can use active join codes" ON public.household_join_codes;
CREATE POLICY "Authenticated users can use active join codes" ON public.household_join_codes
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND household_join_codes.status = 'active'
    AND household_join_codes.expires_at > NOW()
  );

-- transactions
DROP POLICY IF EXISTS "Household members can view transactions" ON public.transactions;
CREATE POLICY "Household members can view transactions" ON public.transactions
  FOR SELECT USING (
    public.is_household_member(transactions.household_id)
  );

DROP POLICY IF EXISTS "Household members can insert transactions" ON public.transactions;
CREATE POLICY "Household members can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    public.is_household_member(transactions.household_id)
    AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Creators can update transactions" ON public.transactions;
CREATE POLICY "Creators can update transactions" ON public.transactions
  FOR UPDATE USING (
    auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Creators can delete transactions" ON public.transactions;
CREATE POLICY "Creators can delete transactions" ON public.transactions
  FOR DELETE USING (
    auth.uid() = created_by
  );

-- settlements
DROP POLICY IF EXISTS "Household members can view settlements" ON public.settlements;
CREATE POLICY "Household members can view settlements" ON public.settlements
  FOR SELECT USING (
    public.is_household_member(settlements.household_id)
  );

DROP POLICY IF EXISTS "Household members can insert settlements" ON public.settlements;
CREATE POLICY "Household members can insert settlements" ON public.settlements
  FOR INSERT WITH CHECK (
    public.is_household_member(settlements.household_id)
    AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Creators can delete settlements" ON public.settlements;
CREATE POLICY "Creators can delete settlements" ON public.settlements
  FOR DELETE USING (
    auth.uid() = created_by
  );

----------------------------
-- 12. Indexes
----------------------------

CREATE INDEX IF NOT EXISTS idx_household_members_household ON public.household_members (household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON public.household_members (user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_household ON public.transactions (household_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions (created_by);

CREATE INDEX IF NOT EXISTS idx_settlements_household ON public.settlements (household_id, settled_on DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_participants ON public.settlements (from_user_id, to_user_id);

CREATE INDEX IF NOT EXISTS idx_join_codes_household ON public.household_join_codes (household_id);
CREATE INDEX IF NOT EXISTS idx_join_codes_status ON public.household_join_codes (status, expires_at);

----------------------------
-- END
----------------------------
