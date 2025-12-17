-- Fix remaining RLS policies - drop existing first

-- 12. ANNOUNCEMENTS - Drop existing and recreate
DROP POLICY IF EXISTS "Admins can create announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;
DROP POLICY IF EXISTS "Anyone can view announcements" ON announcements;
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON announcements;

CREATE POLICY "Authenticated users can view announcements" 
ON announcements FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can create announcements" 
ON announcements FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update announcements" 
ON announcements FOR UPDATE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete announcements" 
ON announcements FOR DELETE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 13. POLLS - Drop existing and recreate
DROP POLICY IF EXISTS "Anyone can view active polls" ON polls;
DROP POLICY IF EXISTS "Admins can manage polls" ON polls;
DROP POLICY IF EXISTS "Admins can create polls" ON polls;
DROP POLICY IF EXISTS "Admins can update polls" ON polls;
DROP POLICY IF EXISTS "Admins can delete polls" ON polls;
DROP POLICY IF EXISTS "Authenticated users can view active polls" ON polls;

CREATE POLICY "Authenticated users can view active polls" 
ON polls FOR SELECT 
USING (auth.role() = 'authenticated' AND (is_active = true OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')));

CREATE POLICY "Admins can create polls" 
ON polls FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update polls" 
ON polls FOR UPDATE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete polls" 
ON polls FOR DELETE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 14. POLL_OPTIONS - Drop existing and recreate
DROP POLICY IF EXISTS "Anyone can view poll options for active polls" ON poll_options;
DROP POLICY IF EXISTS "Admins can manage poll options" ON poll_options;
DROP POLICY IF EXISTS "Admins can create poll options" ON poll_options;
DROP POLICY IF EXISTS "Admins can update poll options" ON poll_options;
DROP POLICY IF EXISTS "Admins can delete poll options" ON poll_options;
DROP POLICY IF EXISTS "Authenticated users can view poll options" ON poll_options;

CREATE POLICY "Authenticated users can view poll options" 
ON poll_options FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can create poll options" 
ON poll_options FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update poll options" 
ON poll_options FOR UPDATE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete poll options" 
ON poll_options FOR DELETE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 15. POLL_VOTES - Drop existing and recreate
DROP POLICY IF EXISTS "Users can view own votes" ON poll_votes;
DROP POLICY IF EXISTS "Admins can view all votes" ON poll_votes;
DROP POLICY IF EXISTS "Users can vote once per poll" ON poll_votes;
DROP POLICY IF EXISTS "Users can view votes when show_results is enabled" ON poll_votes;
DROP POLICY IF EXISTS "Authenticated users can insert votes" ON poll_votes;

CREATE POLICY "Users can view own votes" 
ON poll_votes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all votes" 
ON poll_votes FOR SELECT 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can vote" 
ON poll_votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 16. SURVEYS - Drop existing and recreate
DROP POLICY IF EXISTS "Anyone can view active surveys" ON surveys;
DROP POLICY IF EXISTS "Admins can manage surveys" ON surveys;
DROP POLICY IF EXISTS "Admins can create surveys" ON surveys;
DROP POLICY IF EXISTS "Admins can update surveys" ON surveys;
DROP POLICY IF EXISTS "Admins can delete surveys" ON surveys;
DROP POLICY IF EXISTS "Authenticated users can view active surveys" ON surveys;

CREATE POLICY "Authenticated users can view active surveys" 
ON surveys FOR SELECT 
USING (auth.role() = 'authenticated' AND (is_active = true OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')));

CREATE POLICY "Admins can create surveys" 
ON surveys FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update surveys" 
ON surveys FOR UPDATE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete surveys" 
ON surveys FOR DELETE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 17. SURVEY_QUESTIONS - Drop existing and recreate
DROP POLICY IF EXISTS "Anyone can view questions for active surveys" ON survey_questions;
DROP POLICY IF EXISTS "Admins can manage survey questions" ON survey_questions;
DROP POLICY IF EXISTS "Admins can create survey questions" ON survey_questions;
DROP POLICY IF EXISTS "Admins can update survey questions" ON survey_questions;
DROP POLICY IF EXISTS "Admins can delete survey questions" ON survey_questions;
DROP POLICY IF EXISTS "Authenticated users can view survey questions" ON survey_questions;

CREATE POLICY "Authenticated users can view survey questions" 
ON survey_questions FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can create survey questions" 
ON survey_questions FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update survey questions" 
ON survey_questions FOR UPDATE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete survey questions" 
ON survey_questions FOR DELETE 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 18. SURVEY_RESPONSES - Drop existing and recreate
DROP POLICY IF EXISTS "Users can view own survey responses" ON survey_responses;
DROP POLICY IF EXISTS "Admins can view all survey responses" ON survey_responses;
DROP POLICY IF EXISTS "Users can create survey responses" ON survey_responses;
DROP POLICY IF EXISTS "Authenticated users can insert responses" ON survey_responses;

CREATE POLICY "Users can view own survey responses" 
ON survey_responses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all survey responses" 
ON survey_responses FOR SELECT 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create survey responses" 
ON survey_responses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 19. SURVEY_ANSWERS - Drop existing and recreate
DROP POLICY IF EXISTS "Users can view own survey answers" ON survey_answers;
DROP POLICY IF EXISTS "Admins can view all survey answers" ON survey_answers;
DROP POLICY IF EXISTS "Users can create survey answers" ON survey_answers;
DROP POLICY IF EXISTS "Authenticated users can insert answers" ON survey_answers;

CREATE POLICY "Users can view own survey answers" 
ON survey_answers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM survey_responses 
    WHERE survey_responses.id = survey_answers.response_id 
    AND survey_responses.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all survey answers" 
ON survey_answers FOR SELECT 
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create survey answers" 
ON survey_answers FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM survey_responses 
    WHERE survey_responses.id = survey_answers.response_id 
    AND survey_responses.user_id = auth.uid()
  )
);