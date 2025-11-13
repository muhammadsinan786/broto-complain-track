-- Add authentication requirements to prevent unauthenticated access to all tables

-- Block unauthenticated access to profiles
CREATE POLICY "Block unauthenticated access to profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Block unauthenticated access to complaints
CREATE POLICY "Block unauthenticated access to complaints"
ON complaints FOR SELECT
TO authenticated
USING (true);

-- Block unauthenticated access to admin_templates
CREATE POLICY "Block unauthenticated access to admin_templates"
ON admin_templates FOR SELECT
TO authenticated
USING (true);

-- Block unauthenticated access to user_roles
CREATE POLICY "Block unauthenticated access to user_roles"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- Block unauthenticated access to complaint_attachments
CREATE POLICY "Block unauthenticated access to complaint_attachments"
ON complaint_attachments FOR SELECT
TO authenticated
USING (true);

-- Block unauthenticated access to complaint_messages
CREATE POLICY "Block unauthenticated access to complaint_messages"
ON complaint_messages FOR SELECT
TO authenticated
USING (true);

-- Block unauthenticated access to complaint_replies
CREATE POLICY "Block unauthenticated access to complaint_replies"
ON complaint_replies FOR SELECT
TO authenticated
USING (true);

-- Update storage policies to validate access based on complaint ownership
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;

CREATE POLICY "Users can upload attachments for their complaints"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaint-attachments' AND
  (
    -- Check if complaint belongs to user
    EXISTS (
      SELECT 1 FROM complaints
      WHERE id::text = (storage.foldername(name))[1]
      AND student_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can view attachments for their complaints"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-attachments' AND
  (
    -- Check if complaint belongs to user or user is admin
    EXISTS (
      SELECT 1 FROM complaints
      WHERE id::text = (storage.foldername(name))[1]
      AND (student_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  )
);