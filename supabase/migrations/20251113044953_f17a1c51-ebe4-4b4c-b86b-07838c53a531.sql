-- Add priority enum
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');

-- Add priority, anonymous flag, and rating fields to complaints table
ALTER TABLE complaints 
  ADD COLUMN priority priority_level DEFAULT 'medium',
  ADD COLUMN is_anonymous BOOLEAN DEFAULT false,
  ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN feedback TEXT;

-- Create admin_templates table for quick replies
CREATE TABLE admin_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE admin_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view templates"
  ON admin_templates FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create templates"
  ON admin_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create complaint_messages table for threaded conversations
CREATE TABLE complaint_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE complaint_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their complaints"
  ON complaint_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM complaints 
      WHERE complaints.id = complaint_messages.complaint_id 
      AND (complaints.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can send messages for their complaints"
  ON complaint_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM complaints 
      WHERE complaints.id = complaint_messages.complaint_id 
      AND (complaints.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
    AND auth.uid() = sender_id
  );

-- Update storage policies for complaint-attachments bucket
DROP POLICY IF EXISTS "Users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-attachments' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'complaint-attachments' 
    AND auth.role() = 'authenticated'
  );

-- Insert default quick reply templates
INSERT INTO admin_templates (title, content) VALUES
  ('Under Review', 'Thank you for your complaint. This issue is currently under review by our team. We will update you soon.'),
  ('Need More Info', 'We need additional information to process your complaint. Please provide more details about the issue.'),
  ('In Progress', 'Your complaint has been assigned to the relevant department and is being actively worked on.'),
  ('Resolved', 'This issue has been resolved. Please verify and provide feedback if the solution works for you.');