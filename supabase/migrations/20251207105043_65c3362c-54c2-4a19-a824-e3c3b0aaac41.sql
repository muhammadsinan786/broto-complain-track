-- Fix: Allow students to submit ratings for their resolved complaints
-- The current policy only allows updates when status='pending', but ratings are submitted when status='resolved'

CREATE POLICY "Students can rate their resolved complaints"
  ON public.complaints
  FOR UPDATE
  USING (
    auth.uid() = student_id 
    AND status = 'resolved'::complaint_status
  )
  WITH CHECK (
    auth.uid() = student_id 
    AND status = 'resolved'::complaint_status
  );