-- Fix Critical Security Issues
-- 1. Remove broken RLS policies that grant universal access to authenticated users
-- 2. Fix notifications policy to prevent arbitrary notification creation

-- Drop the 7 broken policies from migration 20251113050845
DROP POLICY IF EXISTS "Block unauthenticated access to profiles" ON profiles;
DROP POLICY IF EXISTS "Block unauthenticated access to complaints" ON complaints;
DROP POLICY IF EXISTS "Block unauthenticated access to admin_templates" ON admin_templates;
DROP POLICY IF EXISTS "Block unauthenticated access to user_roles" ON user_roles;
DROP POLICY IF EXISTS "Block unauthenticated access to complaint_attachments" ON complaint_attachments;
DROP POLICY IF EXISTS "Block unauthenticated access to complaint_messages" ON complaint_messages;
DROP POLICY IF EXISTS "Block unauthenticated access to complaint_replies" ON complaint_replies;

-- Fix notifications policy to only allow system triggers to create notifications
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Create a new policy that blocks direct inserts from users
-- Triggers with SECURITY DEFINER will bypass this policy
CREATE POLICY "Only triggers can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (false);