-- 000_reset_household_module.sql
-- Supabase SQL Editor で実行し、PairBudget の世帯関連ドメインを初期化します。
-- 既存のテーブル・ポリシー・トリガーを削除するため、**実行するとデータはすべて失われます**。

BEGIN;

----------------------------
-- 1. Triggers
----------------------------

DROP TRIGGER IF EXISTS add_household_owner_trigger ON public.households;
DROP TRIGGER IF EXISTS set_household_owner_before_insert ON public.households;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

----------------------------
-- 2. Row Level Security Policies
----------------------------

-- profiles
DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;

-- households
DROP POLICY IF EXISTS "Household members can view household" ON public.households;
DROP POLICY IF EXISTS "Household owners can view household" ON public.households;
DROP POLICY IF EXISTS "Users can create households" ON public.households;
DROP POLICY IF EXISTS "Household owners can update household" ON public.households;

-- household_members
DROP POLICY IF EXISTS "Household members can view members" ON public.household_members;
DROP POLICY IF EXISTS "Household owners can add members" ON public.household_members;
DROP POLICY IF EXISTS "Household owners can update members" ON public.household_members;
DROP POLICY IF EXISTS "Household owners can remove members" ON public.household_members;

-- household_join_codes
DROP POLICY IF EXISTS "Household owners manage join codes" ON public.household_join_codes;
DROP POLICY IF EXISTS "Authenticated users can use active join codes" ON public.household_join_codes;
DROP POLICY IF EXISTS "Users can consume join codes" ON public.household_join_codes;

-- transactions
DROP POLICY IF EXISTS "Household members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Household members can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Creators can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Creators can delete transactions" ON public.transactions;

-- settlements
DROP POLICY IF EXISTS "Household members can view settlements" ON public.settlements;
DROP POLICY IF EXISTS "Household members can insert settlements" ON public.settlements;
DROP POLICY IF EXISTS "Creators can delete settlements" ON public.settlements;

----------------------------
-- 3. Functions
----------------------------

DROP FUNCTION IF EXISTS public.add_household_owner_as_member();
DROP FUNCTION IF EXISTS public.set_household_owner_id();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_household_balances(UUID);
DROP FUNCTION IF EXISTS public.is_household_owner(UUID);
DROP FUNCTION IF EXISTS public.is_household_member(UUID);

----------------------------
-- 4. Tables & Types
----------------------------

DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.settlements CASCADE;
DROP TABLE IF EXISTS public.household_join_codes CASCADE;
DROP TABLE IF EXISTS public.household_members CASCADE;
DROP TABLE IF EXISTS public.households CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.transaction_type;

COMMIT;
