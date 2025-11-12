-- Create complaint category enum
CREATE TYPE complaint_category AS ENUM (
  'academic',
  'infrastructure',
  'technical',
  'administrative',
  'other'
);

-- Add category column to complaints table
ALTER TABLE complaints 
ADD COLUMN category complaint_category NOT NULL DEFAULT 'other';

-- Update RLS policy for admins to view profiles (needed for complaint details)
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Update storage policies for complaint attachments to allow downloads
CREATE POLICY "Users can download attachments for viewable complaints"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'complaint-attachments' AND
  EXISTS (
    SELECT 1 FROM complaints
    WHERE id::text = (storage.foldername(name))[1]
    AND (student_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);