-- ─── Add follows (partners) table with request status ─────────
-- Drop and recreate with status column
DROP TABLE IF EXISTS public.follows CASCADE;

CREATE TABLE public.follows (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- The requester (follower) and the receiver (following) can both see the row
DROP POLICY IF EXISTS "Involved users can view follows"  ON public.follows;
DROP POLICY IF EXISTS "Users can send requests"          ON public.follows;
DROP POLICY IF EXISTS "Receiver can update status"       ON public.follows;
DROP POLICY IF EXISTS "Users can cancel own request"     ON public.follows;

CREATE POLICY "Involved users can view follows"
  ON public.follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can send requests"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Receiver can update status"
  ON public.follows FOR UPDATE TO authenticated
  USING (auth.uid() = following_id);

CREATE POLICY "Users can cancel own request"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- ─── Add watched column to saves ─────────────────────────────
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS watched boolean DEFAULT false;
