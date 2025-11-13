-- Add soft delete and audit fields to complaints table
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id);

-- Add profile picture to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- Create audit log table for tracking important actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own audit logs (through app logic)
CREATE POLICY "Users can create audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for complaints to allow updates
CREATE POLICY "Students can update their pending complaints"
ON complaints FOR UPDATE
TO authenticated
USING (
  auth.uid() = student_id 
  AND status = 'pending'
  AND deleted_at IS NULL
)
WITH CHECK (
  auth.uid() = student_id 
  AND status = 'pending'
  AND deleted_at IS NULL
);

-- Modify existing "Students can view their own complaints" to exclude deleted
DROP POLICY IF EXISTS "Students can view their own complaints" ON complaints;
CREATE POLICY "Students can view their own complaints"
ON complaints FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id 
  AND deleted_at IS NULL
);

-- Modify existing "Admins can view all complaints" to include deleted
DROP POLICY IF EXISTS "Admins can view all complaints" ON complaints;
CREATE POLICY "Admins can view all complaints"
ON complaints FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger to update updated_at on complaints
DROP TRIGGER IF EXISTS update_complaints_updated_at ON complaints;
CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON complaints
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();