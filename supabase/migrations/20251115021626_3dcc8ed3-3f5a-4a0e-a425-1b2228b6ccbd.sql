-- Enable permanent deletion for students and admins
-- Remove soft delete functionality

-- First, update existing policies that check deleted_at

-- Drop and recreate "Students can view their own complaints" policy without deleted_at check
DROP POLICY IF EXISTS "Students can view their own complaints" ON complaints;
CREATE POLICY "Students can view their own complaints"
ON complaints FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Drop and recreate "Students can update their pending complaints" policy without deleted_at check
DROP POLICY IF EXISTS "Students can update their pending complaints" ON complaints;
CREATE POLICY "Students can update their pending complaints"
ON complaints FOR UPDATE
TO authenticated
USING (auth.uid() = student_id AND status = 'pending'::complaint_status)
WITH CHECK (auth.uid() = student_id AND status = 'pending'::complaint_status);

-- Add RLS policy to allow students to delete their own complaints
CREATE POLICY "Students can delete their own complaints"
ON complaints FOR DELETE
TO authenticated
USING (auth.uid() = student_id);

-- Add RLS policy to allow admins to delete any complaint
CREATE POLICY "Admins can delete any complaint"
ON complaints FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Now drop the deleted_at and deleted_by columns
ALTER TABLE complaints DROP COLUMN IF EXISTS deleted_at CASCADE;
ALTER TABLE complaints DROP COLUMN IF EXISTS deleted_by CASCADE;