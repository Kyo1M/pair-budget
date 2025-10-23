-- 005_final_schema.sql
-- PairBudget の最終版スキーマ
-- 新規プロジェクト作成時や完全リセット時に使用する統合版

BEGIN;

----------------------------
-- 1. Extensions & Types
----------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'transaction_type'
      AND pg_type.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.transaction_type AS ENUM ('expense', 'income', 'advance');
  END IF;
END;
$$;

----------------------------
-- 2. Core Tables
----------------------------

-- ユーザープロファイル
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 世帯
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 世帯メンバー
CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

-- 世帯参加コード
CREATE TABLE public.household_join_codes (
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

-- 取引（支出・収入・立替）
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  note TEXT,
  payer_user_id UUID REFERENCES auth.users(id),
  advance_to_user_id UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 精算
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  settled_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (from_user_id IS NOT NULL OR to_user_id IS NOT NULL)
);

----------------------------
-- 3. Row Level Security Enablement
----------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_join_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

----------------------------
-- 4. Helper Functions
----------------------------

-- 新規ユーザー作成時のプロファイル作成
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

-- 世帯メンバーかどうかをチェック
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

-- 世帯オーナーかどうかをチェック
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

-- 世帯の残高計算
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
  IF NOT public.is_household_member(target_household) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH advance_payments AS (
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
    SELECT 
      s.from_user_id AS user_id,
      COALESCE(SUM(s.amount), 0) AS paid_amount
    FROM public.settlements s
    WHERE s.household_id = target_household
      AND s.from_user_id IS NOT NULL
    GROUP BY s.from_user_id
  ),
  settlement_received AS (
    SELECT 
      s.to_user_id AS user_id,
      COALESCE(SUM(s.amount), 0) AS received_amount
    FROM public.settlements s
    WHERE s.household_id = target_household
      AND s.to_user_id IS NOT NULL
    GROUP BY s.to_user_id
  )
  SELECT
    hm.user_id,
    p.name AS user_name,
    (
      COALESCE(ap.paid_amount, 0) -
      COALESCE(ad.debt_amount, 0) -
      COALESCE(sr.received_amount, 0) +
      COALESCE(sp.paid_amount, 0)
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

-- 世帯作成とオーナーのメンバー追加を一括実行
CREATE OR REPLACE FUNCTION public.create_household_with_owner(
  household_name TEXT,
  owner_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- 認証チェック
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 世帯を作成
  INSERT INTO public.households (name, owner_user_id)
  VALUES (household_name, owner_user_id)
  RETURNING id INTO new_household_id;

  -- オーナーをメンバーとして追加
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (new_household_id, owner_user_id, 'owner')
  ON CONFLICT (household_id, user_id) DO NOTHING;

  RETURN new_household_id;
END;
$$;

----------------------------
-- 5. Triggers
----------------------------

-- 新規ユーザー作成時のプロファイル作成トリガー
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

----------------------------
-- 6. Grants
----------------------------

-- 関数の実行権限
GRANT EXECUTE ON FUNCTION public.is_household_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_household_owner(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_household_balances(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_household_with_owner(TEXT, UUID) TO authenticated;

-- テーブル権限
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_join_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settlements TO authenticated;

----------------------------
-- 7. Row Level Security Policies
----------------------------

-- profiles テーブル
DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
CREATE POLICY "Profiles select own" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
CREATE POLICY "Profiles update own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- households テーブル
DROP POLICY IF EXISTS "Household members can view household" ON public.households;
CREATE POLICY "Household members can view household" ON public.households
  FOR SELECT
  USING (public.is_household_member(households.id));

DROP POLICY IF EXISTS "Household owners can view household" ON public.households;
CREATE POLICY "Household owners can view household" ON public.households
  FOR SELECT
  USING (public.is_household_owner(households.id));

DROP POLICY IF EXISTS "Users can create households" ON public.households;
CREATE POLICY "Users can create households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = owner_user_id
  );

DROP POLICY IF EXISTS "Household owners can update household" ON public.households;
CREATE POLICY "Household owners can update household" ON public.households
  FOR UPDATE
  USING (public.is_household_owner(households.id))
  WITH CHECK (public.is_household_owner(households.id));

DROP POLICY IF EXISTS "Household owners can delete household" ON public.households;
CREATE POLICY "Household owners can delete household" ON public.households
  FOR DELETE
  USING (public.is_household_owner(households.id));

-- household_members テーブル
DROP POLICY IF EXISTS "Household members can view members" ON public.household_members;
CREATE POLICY "Household members can view members" ON public.household_members
  FOR SELECT
  USING (public.is_household_member(household_members.household_id));

DROP POLICY IF EXISTS "Household owners can add members" ON public.household_members;
CREATE POLICY "Household owners can add members" ON public.household_members
  FOR INSERT
  WITH CHECK (
    -- 世帯のオーナーである場合
    public.is_household_owner(household_members.household_id)
    -- または、自分自身をメンバーとして追加する場合（世帯作成時）
    OR (
      auth.uid() = household_members.user_id
      AND EXISTS (
        SELECT 1
        FROM public.households h
        WHERE h.id = household_members.household_id
          AND h.owner_user_id = auth.uid()
      )
    )
    -- または、既存の世帯メンバーが新しいメンバーを招待する場合
    OR public.is_household_member(household_members.household_id)
  );

DROP POLICY IF EXISTS "Household owners can update members" ON public.household_members;
CREATE POLICY "Household owners can update members" ON public.household_members
  FOR UPDATE
  USING (public.is_household_owner(household_members.household_id))
  WITH CHECK (public.is_household_owner(household_members.household_id));

DROP POLICY IF EXISTS "Household owners can remove members" ON public.household_members;
CREATE POLICY "Household owners can remove members" ON public.household_members
  FOR DELETE
  USING (public.is_household_owner(household_members.household_id));

-- household_join_codes テーブル
DROP POLICY IF EXISTS "Household owners manage join codes" ON public.household_join_codes;
CREATE POLICY "Household owners manage join codes" ON public.household_join_codes
  FOR ALL
  USING (public.is_household_owner(household_join_codes.household_id))
  WITH CHECK (public.is_household_owner(household_join_codes.household_id));

DROP POLICY IF EXISTS "Authenticated users can use active join codes" ON public.household_join_codes;
CREATE POLICY "Authenticated users can use active join codes" ON public.household_join_codes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND household_join_codes.status = 'active'
    AND household_join_codes.expires_at > NOW()
  );

DROP POLICY IF EXISTS "Users can consume join codes" ON public.household_join_codes;
CREATE POLICY "Users can consume join codes" ON public.household_join_codes
  FOR UPDATE
  TO authenticated
  USING (
    household_join_codes.status = 'active'
    AND household_join_codes.expires_at > NOW()
  )
  WITH CHECK (
    auth.uid() = household_join_codes.used_by
    AND household_join_codes.status = 'used'
  );

-- transactions テーブル
DROP POLICY IF EXISTS "Household members can view transactions" ON public.transactions;
CREATE POLICY "Household members can view transactions" ON public.transactions
  FOR SELECT
  USING (public.is_household_member(transactions.household_id));

DROP POLICY IF EXISTS "Household members can insert transactions" ON public.transactions;
CREATE POLICY "Household members can insert transactions" ON public.transactions
  FOR INSERT
  WITH CHECK (
    public.is_household_member(transactions.household_id)
    AND auth.uid() = transactions.created_by
  );

DROP POLICY IF EXISTS "Creators can update transactions" ON public.transactions;
CREATE POLICY "Creators can update transactions" ON public.transactions
  FOR UPDATE
  USING (auth.uid() = transactions.created_by)
  WITH CHECK (auth.uid() = transactions.created_by);

DROP POLICY IF EXISTS "Creators can delete transactions" ON public.transactions;
CREATE POLICY "Creators can delete transactions" ON public.transactions
  FOR DELETE
  USING (auth.uid() = transactions.created_by);

-- settlements テーブル
DROP POLICY IF EXISTS "Household members can view settlements" ON public.settlements;
CREATE POLICY "Household members can view settlements" ON public.settlements
  FOR SELECT
  USING (public.is_household_member(settlements.household_id));

DROP POLICY IF EXISTS "Household members can insert settlements" ON public.settlements;
CREATE POLICY "Household members can insert settlements" ON public.settlements
  FOR INSERT
  WITH CHECK (
    public.is_household_member(settlements.household_id)
    AND auth.uid() = settlements.created_by
  );

DROP POLICY IF EXISTS "Creators can delete settlements" ON public.settlements;
CREATE POLICY "Creators can delete settlements" ON public.settlements
  FOR DELETE
  USING (auth.uid() = settlements.created_by);

COMMIT;
