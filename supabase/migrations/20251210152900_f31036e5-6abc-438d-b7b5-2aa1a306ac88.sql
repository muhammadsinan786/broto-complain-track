-- Create polls table
CREATE TABLE public.polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    show_results BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create poll options table
CREATE TABLE public.poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create poll votes table (one vote per user per poll)
CREATE TABLE public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(poll_id, user_id)
);

-- Create surveys table
CREATE TABLE public.surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    show_results BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create survey questions table
CREATE TABLE public.survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    options JSONB,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create survey responses table (one response per user per survey)
CREATE TABLE public.survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(survey_id, user_id)
);

-- Create survey answers table
CREATE TABLE public.survey_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- Add foreign keys to auth.users with CASCADE
ALTER TABLE public.polls
    ADD CONSTRAINT fk_polls_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.poll_votes
    ADD CONSTRAINT fk_poll_votes_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.surveys
    ADD CONSTRAINT fk_surveys_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.survey_responses
    ADD CONSTRAINT fk_survey_responses_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- RLS Policies for polls
CREATE POLICY "Authenticated users can view active polls"
ON public.polls FOR SELECT TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create polls"
ON public.polls FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Admins can update polls"
ON public.polls FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete polls"
ON public.polls FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for poll_options
CREATE POLICY "Authenticated users can view poll options"
ON public.poll_options FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.polls
    WHERE polls.id = poll_options.poll_id
    AND (polls.is_active = true OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Admins can manage poll options"
ON public.poll_options FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for poll_votes
CREATE POLICY "Users can view votes for polls with show_results"
ON public.poll_votes FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.polls
        WHERE polls.id = poll_votes.poll_id
        AND (polls.show_results = true OR has_role(auth.uid(), 'admin'::app_role) OR poll_votes.user_id = auth.uid())
    )
);

CREATE POLICY "Authenticated users can vote once"
ON public.poll_votes FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.polls
        WHERE polls.id = poll_votes.poll_id
        AND polls.is_active = true
        AND (polls.expiry_date IS NULL OR polls.expiry_date > now())
    )
);

-- RLS Policies for surveys
CREATE POLICY "Authenticated users can view active surveys"
ON public.surveys FOR SELECT TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create surveys"
ON public.surveys FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Admins can update surveys"
ON public.surveys FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete surveys"
ON public.surveys FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for survey_questions
CREATE POLICY "Authenticated users can view survey questions"
ON public.survey_questions FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = survey_questions.survey_id
    AND (surveys.is_active = true OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Admins can manage survey questions"
ON public.survey_questions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for survey_responses
CREATE POLICY "Users can view their own responses or admins can view all"
ON public.survey_responses FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can respond once"
ON public.survey_responses FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.surveys
        WHERE surveys.id = survey_responses.survey_id
        AND surveys.is_active = true
        AND (surveys.expiry_date IS NULL OR surveys.expiry_date > now())
    )
);

-- RLS Policies for survey_answers
CREATE POLICY "Users can view their own answers or admins can view all"
ON public.survey_answers FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.survey_responses
        WHERE survey_responses.id = survey_answers.response_id
        AND (survey_responses.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
);

CREATE POLICY "Users can submit answers for their responses"
ON public.survey_answers FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.survey_responses
        WHERE survey_responses.id = survey_answers.response_id
        AND survey_responses.user_id = auth.uid()
    )
);

-- Create updated_at triggers
CREATE TRIGGER update_polls_updated_at
BEFORE UPDATE ON public.polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at
BEFORE UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();