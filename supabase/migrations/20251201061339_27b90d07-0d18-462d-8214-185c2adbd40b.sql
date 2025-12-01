-- Fix 1: Admin Templates - Auto-set created_by and enforce ownership
CREATE OR REPLACE FUNCTION public.auto_set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_admin_templates_created_by
  BEFORE INSERT ON public.admin_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_created_by();

-- Update policy to enforce owner assignment
DROP POLICY IF EXISTS "Admins can create templates" ON public.admin_templates;

CREATE POLICY "Admins can create templates"
  ON public.admin_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) AND 
    (created_by IS NULL OR created_by = auth.uid())
  );

-- Fix 2: Announcements - Require authentication to view
DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.announcements;

CREATE POLICY "Authenticated users can view active announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (expiry_date IS NULL OR expiry_date > now());