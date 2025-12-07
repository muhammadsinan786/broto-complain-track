-- First, clean up orphaned records that reference deleted users
-- Then add foreign key constraints with CASCADE for GDPR compliance

-- Clean up orphaned notifications
DELETE FROM notifications 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned feedback
DELETE FROM feedback 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned internal notes (admin_id)
DELETE FROM internal_notes 
WHERE admin_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned internal notes (complaint_id)
DELETE FROM internal_notes 
WHERE complaint_id NOT IN (SELECT id FROM complaints);

-- Clean up orphaned announcements
DELETE FROM announcements 
WHERE admin_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned complaint messages (sender_id)
DELETE FROM complaint_messages 
WHERE sender_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned audit logs
UPDATE audit_logs 
SET user_id = NULL 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned admin templates
UPDATE admin_templates 
SET created_by = NULL 
WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM auth.users);

-- Now add the foreign key constraints

-- Notifications: CASCADE delete when user is deleted
ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Feedback: CASCADE delete when user is deleted
ALTER TABLE feedback
  ADD CONSTRAINT fk_feedback_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Internal notes: CASCADE delete when complaint is deleted
ALTER TABLE internal_notes
  ADD CONSTRAINT fk_internal_notes_complaint
  FOREIGN KEY (complaint_id)
  REFERENCES complaints(id)
  ON DELETE CASCADE;

-- Internal notes: CASCADE delete when admin is deleted
ALTER TABLE internal_notes
  ADD CONSTRAINT fk_internal_notes_admin
  FOREIGN KEY (admin_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Announcements: SET NULL when admin is deleted (preserve announcement but remove admin reference)
ALTER TABLE announcements
  ALTER COLUMN admin_id DROP NOT NULL;

ALTER TABLE announcements
  ADD CONSTRAINT fk_announcements_admin
  FOREIGN KEY (admin_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Complaint messages: CASCADE delete when sender is deleted
ALTER TABLE complaint_messages
  ADD CONSTRAINT fk_complaint_messages_sender
  FOREIGN KEY (sender_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Audit logs: SET NULL to preserve audit trail while removing user reference
ALTER TABLE audit_logs
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_logs_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Admin templates: SET NULL when admin is deleted (preserve template)
ALTER TABLE admin_templates
  ADD CONSTRAINT fk_admin_templates_created_by
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;