-- 013_create_receipt_scans.sql
-- レシート画像の下書き保存、Gemini OCR結果、取引との紐付けを追加する。

BEGIN;

----------------------------
-- 1. Private Storage bucket
----------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

----------------------------
-- 2. Receipt scan drafts
----------------------------

CREATE TABLE IF NOT EXISTS public.receipt_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')
  ),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'ready', 'failed', 'registered', 'orphaned')
  ),
  ocr_result JSONB,
  ocr_error TEXT,
  transaction_id UUID UNIQUE REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (status <> 'registered' OR transaction_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_receipt_scans_creator_status
  ON public.receipt_scans(created_by, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipt_scans_household_transaction
  ON public.receipt_scans(household_id, transaction_id);

ALTER TABLE public.receipt_scans ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_receipt_scan_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_receipt_scan_updated_at ON public.receipt_scans;
CREATE TRIGGER set_receipt_scan_updated_at
  BEFORE UPDATE ON public.receipt_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_receipt_scan_updated_at();

----------------------------
-- 3. Receipt scan RLS
----------------------------

DROP POLICY IF EXISTS "Users can view accessible receipt scans" ON public.receipt_scans;
CREATE POLICY "Users can view accessible receipt scans" ON public.receipt_scans
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (
      status = 'registered'
      AND public.is_household_member(household_id)
    )
  );

DROP POLICY IF EXISTS "Users can create receipt scan drafts" ON public.receipt_scans;
CREATE POLICY "Users can create receipt scan drafts" ON public.receipt_scans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'pending'
    AND transaction_id IS NULL
    AND public.is_household_member(household_id)
  );

DROP POLICY IF EXISTS "Creators can update receipt scan drafts" ON public.receipt_scans;
CREATE POLICY "Creators can update receipt scan drafts" ON public.receipt_scans
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND status IN ('pending', 'processing', 'ready', 'failed')
  )
  WITH CHECK (
    created_by = auth.uid()
    AND status IN ('pending', 'processing', 'ready', 'failed')
    AND transaction_id IS NULL
  );

DROP POLICY IF EXISTS "Members can delete removable receipt scans" ON public.receipt_scans;
CREATE POLICY "Members can delete removable receipt scans" ON public.receipt_scans
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid() AND status IN ('pending', 'processing', 'ready', 'failed'))
    OR (status = 'orphaned' AND public.is_household_member(household_id))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_scans TO authenticated;

----------------------------
-- 4. Storage object RLS
----------------------------

DROP POLICY IF EXISTS "Users can upload receipt images" ON storage.objects;
CREATE POLICY "Users can upload receipt images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipt-images'
    AND EXISTS (
      SELECT 1
      FROM public.receipt_scans scan
      WHERE scan.storage_path = name
        AND scan.created_by = auth.uid()
        AND scan.status = 'pending'
        AND public.is_household_member(scan.household_id)
    )
  );

DROP POLICY IF EXISTS "Users can view accessible receipt images" ON storage.objects;
CREATE POLICY "Users can view accessible receipt images" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipt-images'
    AND EXISTS (
      SELECT 1
      FROM public.receipt_scans scan
      WHERE scan.storage_path = name
        AND (
          scan.created_by = auth.uid()
          OR (
            scan.status = 'registered'
            AND public.is_household_member(scan.household_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete removable receipt images" ON storage.objects;
CREATE POLICY "Users can delete removable receipt images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipt-images'
    AND EXISTS (
      SELECT 1
      FROM public.receipt_scans scan
      WHERE scan.storage_path = name
        AND (
          (scan.created_by = auth.uid() AND scan.status IN ('pending', 'processing', 'ready', 'failed'))
          OR (scan.status = 'orphaned' AND public.is_household_member(scan.household_id))
        )
    )
  );

----------------------------
-- 5. Atomic receipt registration
----------------------------

CREATE OR REPLACE FUNCTION public.register_receipt_scan(
  target_scan_id UUID,
  target_type public.transaction_type,
  target_amount NUMERIC,
  target_occurred_on DATE,
  target_category TEXT,
  target_note TEXT DEFAULT NULL,
  target_place TEXT DEFAULT NULL,
  target_payer_user_id UUID DEFAULT NULL,
  target_advance_to_user_id UUID DEFAULT NULL
)
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_scan public.receipt_scans%ROWTYPE;
  created_transaction public.transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO target_scan
  FROM public.receipt_scans
  WHERE id = target_scan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt scan not found';
  END IF;

  IF target_scan.created_by <> auth.uid()
    OR NOT public.is_household_member(target_scan.household_id) THEN
    RAISE EXCEPTION 'Receipt scan access denied';
  END IF;

  IF target_scan.status NOT IN ('ready', 'failed')
    OR target_scan.transaction_id IS NOT NULL THEN
    RAISE EXCEPTION 'Receipt scan is not registerable';
  END IF;

  INSERT INTO public.transactions (
    household_id,
    type,
    amount,
    occurred_on,
    category,
    note,
    place,
    payer_user_id,
    advance_to_user_id,
    created_by
  )
  VALUES (
    target_scan.household_id,
    target_type,
    target_amount,
    target_occurred_on,
    target_category,
    NULLIF(BTRIM(target_note), ''),
    NULLIF(BTRIM(target_place), ''),
    target_payer_user_id,
    CASE WHEN target_type = 'advance' THEN target_advance_to_user_id ELSE NULL END,
    auth.uid()
  )
  RETURNING * INTO created_transaction;

  UPDATE public.receipt_scans
  SET
    status = 'registered',
    transaction_id = created_transaction.id,
    ocr_error = NULL
  WHERE id = target_scan.id;

  RETURN NEXT created_transaction;
END;
$$;

REVOKE ALL ON FUNCTION public.register_receipt_scan(
  UUID, public.transaction_type, NUMERIC, DATE, TEXT, TEXT, TEXT, UUID, UUID
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_receipt_scan(
  UUID, public.transaction_type, NUMERIC, DATE, TEXT, TEXT, TEXT, UUID, UUID
) TO authenticated;

----------------------------
-- 6. Preserve failed Storage cleanup work
----------------------------

CREATE OR REPLACE FUNCTION public.mark_receipts_orphaned_before_transaction_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.receipt_scans
  SET status = 'orphaned', transaction_id = NULL
  WHERE transaction_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS mark_receipts_orphaned_before_transaction_delete
  ON public.transactions;
CREATE TRIGGER mark_receipts_orphaned_before_transaction_delete
  BEFORE DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_receipts_orphaned_before_transaction_delete();

COMMIT;
