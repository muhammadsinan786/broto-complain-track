-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create internal_notes table
CREATE TABLE public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'under_review',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Internal notes policies
CREATE POLICY "Admins can view internal notes"
  ON internal_notes FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create internal notes"
  ON internal_notes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);

CREATE POLICY "Admins can update their own notes"
  ON internal_notes FOR UPDATE
  USING (has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);

CREATE POLICY "Admins can delete their own notes"
  ON internal_notes FOR DELETE
  USING (has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);

-- Feedback policies
CREATE POLICY "Users can view their own feedback"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update feedback status"
  ON feedback FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Announcements policies
CREATE POLICY "Everyone can view active announcements"
  ON announcements FOR SELECT
  USING (expiry_date IS NULL OR expiry_date > NOW());

CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Triggers for notifications
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT 
    CASE 
      WHEN NEW.sender_id = c.student_id THEN c.assigned_admin_id
      ELSE c.student_id
    END,
    'New message on complaint',
    'You have received a new message on a complaint',
    'reply',
    c.id
  FROM complaints c
  WHERE c.id = NEW.complaint_id
    AND CASE 
      WHEN NEW.sender_id = c.student_id THEN c.assigned_admin_id IS NOT NULL
      ELSE c.student_id IS NOT NULL
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_new_message
AFTER INSERT ON complaint_messages
FOR EACH ROW EXECUTE FUNCTION notify_on_message();

CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.student_id,
      'Complaint status updated',
      'Your complaint status changed to ' || NEW.status,
      'status_update',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_complaint_status_change
AFTER UPDATE ON complaints
FOR EACH ROW EXECUTE FUNCTION notify_on_status_change();

CREATE OR REPLACE FUNCTION notify_on_announcement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT 
    id,
    'New Announcement',
    NEW.title,
    'announcement',
    NEW.id
  FROM auth.users;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER notify_on_new_announcement
AFTER INSERT ON announcements
FOR EACH ROW EXECUTE FUNCTION notify_on_announcement();

-- Update timestamps trigger for new tables
CREATE TRIGGER update_internal_notes_updated_at
BEFORE UPDATE ON internal_notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON feedback
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();