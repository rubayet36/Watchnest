-- ============================================================
-- WatchNest account approval + admin profile migration
-- Run in Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'user'
    CHECK (account_type IN ('user', 'admin')),
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_approval_queue_idx
  ON public.profiles (approved, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = check_user_id
      AND account_type = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.account_type IS DISTINCT FROM 'user'
      OR NEW.approved IS DISTINCT FROM FALSE
      OR NEW.approved_at IS NOT NULL
      OR NEW.approved_by IS NOT NULL
    THEN
      IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can set account approval fields';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.account_type IS DISTINCT FROM NEW.account_type
    OR OLD.approved IS DISTINCT FROM NEW.approved
    OR OLD.approved_at IS DISTINCT FROM NEW.approved_at
    OR OLD.approved_by IS DISTINCT FROM NEW.approved_by
  THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change account approval fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_admin_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_admin_fields();

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update approval fields" ON public.profiles;
CREATE POLICY "Admins can update approval fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    avatar_url,
    username,
    account_type,
    approved
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    split_part(NEW.email, '@', 1),
    'user',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- After running this migration, manually promote your own row:
-- UPDATE public.profiles
-- SET account_type = 'admin'
-- WHERE email = 'your-email@example.com';
--
-- Admin accounts bypass the app approval gate.
