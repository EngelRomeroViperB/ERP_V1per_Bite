-- ============================================================
-- 005_security_fixes.sql
-- Fix function search_path mutable warnings
-- ============================================================

-- Fix set_updated_at search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix set_task_completed_at search_path
CREATE OR REPLACE FUNCTION public.set_task_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;
