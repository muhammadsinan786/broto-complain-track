import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { BarChart3, Clock, CheckCircle2, XCircle, Vote } from "lucide-react";
import { format, isPast } from "date-fns";
import DesktopHeader from "@/components/DesktopHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import Chatbot from "@/components/chatbot/Chatbot";

type Poll = {
  id: string;
  title: string;
  description: string | null;
  expiry_date: string | null;
  show_results: boolean;
  is_active: boolean;
  created_at: string;
};

type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
};

type PollVote = {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
};

type Survey = {
  id: string;
  title: string;
  description: string | null;
  expiry_date: string | null;
  show_results: boolean;
  is_active: boolean;
  created_at: string;
};

type SurveyQuestion = {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  order_index: number;
};

const PollsAndSurveys = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, Record<string, string>>>({});

  // Fetch polls with options and votes
  const { data: pollsData, isLoading: pollsLoading } = useQuery({
    queryKey: ["polls"],
    queryFn: async () => {
      const [pollsRes, optionsRes, votesRes] = await Promise.all([
        supabase.from("polls").select("*").order("created_at", { ascending: false }),
        supabase.from("poll_options").select("*"),
        supabase.from("poll_votes").select("*"),
      ]);

      if (pollsRes.error) throw pollsRes.error;
      if (optionsRes.error) throw optionsRes.error;

      return {
        polls: pollsRes.data as Poll[],
        options: optionsRes.data as PollOption[],
        votes: (votesRes.data || []) as PollVote[],
      };
    },
    enabled: !!user,
  });

  // Fetch surveys with questions and responses
  const { data: surveysData, isLoading: surveysLoading } = useQuery({
    queryKey: ["surveys"],
    queryFn: async () => {
      const [surveysRes, questionsRes, responsesRes] = await Promise.all([
        supabase.from("surveys").select("*").order("created_at", { ascending: false }),
        supabase.from("survey_questions").select("*").order("order_index"),
        supabase.from("survey_responses").select("*"),
      ]);

      if (surveysRes.error) throw surveysRes.error;
      if (questionsRes.error) throw questionsRes.error;

      return {
        surveys: surveysRes.data as Survey[],
        questions: questionsRes.data as SurveyQuestion[],
        responses: (responsesRes.data || []) as { id: string; survey_id: string; user_id: string }[],
      };
    },
    enabled: !!user,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast({ title: "Vote submitted!", description: "Thank you for voting." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Survey submission mutation
  const submitSurveyMutation = useMutation({
    mutationFn: async ({ surveyId, answers }: { surveyId: string; answers: Record<string, string> }) => {
      // Create response
      const { data: responseData, error: responseError } = await supabase
        .from("survey_responses")
        .insert({ survey_id: surveyId, user_id: user!.id })
        .select()
        .single();

      if (responseError) throw responseError;

      // Create answers
      const answerInserts = Object.entries(answers).map(([questionId, answer]) => ({
        response_id: responseData.id,
        question_id: questionId,
        answer,
      }));

      const { error: answersError } = await supabase.from("survey_answers").insert(answerInserts);
      if (answersError) throw answersError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      toast({ title: "Survey submitted!", description: "Thank you for your responses." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleVote = (pollId: string) => {
    const optionId = selectedOptions[pollId];
    if (!optionId) {
      toast({ title: "Please select an option", variant: "destructive" });
      return;
    }
    voteMutation.mutate({ pollId, optionId });
  };

  const handleSurveySubmit = (surveyId: string, questions: SurveyQuestion[]) => {
    const answers = surveyAnswers[surveyId] || {};
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      toast({ title: "Please answer all questions", variant: "destructive" });
      return;
    }
    submitSurveyMutation.mutate({ surveyId, answers });
  };

  const isExpired = (expiryDate: string | null) => {
    return expiryDate ? isPast(new Date(expiryDate)) : false;
  };

  const hasVoted = (pollId: string) => {
    return pollsData?.votes.some((v) => v.poll_id === pollId && v.user_id === user?.id);
  };

  const hasResponded = (surveyId: string) => {
    return surveysData?.responses.some((r) => r.survey_id === surveyId && r.user_id === user?.id);
  };

  const getVoteCounts = (pollId: string) => {
    const pollOptions = pollsData?.options.filter((o) => o.poll_id === pollId) || [];
    const pollVotes = pollsData?.votes.filter((v) => v.poll_id === pollId) || [];
    const total = pollVotes.length;

    return pollOptions.map((opt) => {
      const count = pollVotes.filter((v) => v.option_id === opt.id).length;
      return { ...opt, count, percentage: total > 0 ? (count / total) * 100 : 0 };
    });
  };

  const activePolls = pollsData?.polls.filter((p) => p.is_active && !isExpired(p.expiry_date)) || [];
  const closedPolls = pollsData?.polls.filter((p) => !p.is_active || isExpired(p.expiry_date)) || [];
  const activeSurveys = surveysData?.surveys.filter((s) => s.is_active && !isExpired(s.expiry_date)) || [];
  const closedSurveys = surveysData?.surveys.filter((s) => !s.is_active || isExpired(s.expiry_date)) || [];

  const renderPollCard = (poll: Poll, isClosed: boolean) => {
    const voted = hasVoted(poll.id);
    const expired = isExpired(poll.expiry_date);
    const showResults = poll.show_results || voted || expired;
    const voteCounts = getVoteCounts(poll.id);
    const pollOptions = pollsData?.options.filter((o) => o.poll_id === poll.id) || [];

    return (
      <Card key={poll.id} className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg">{poll.title}</CardTitle>
              {poll.description && (
                <CardDescription className="mt-1">{poll.description}</CardDescription>
              )}
            </div>
            {expired ? (
              <Badge variant="secondary" className="shrink-0">
                <XCircle className="h-3 w-3 mr-1" /> Closed
              </Badge>
            ) : voted ? (
              <Badge variant="default" className="shrink-0">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Voted
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0">
                <Vote className="h-3 w-3 mr-1" /> Active
              </Badge>
            )}
          </div>
          {poll.expiry_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <Clock className="h-3 w-3" />
              {expired ? "Ended" : "Ends"} {format(new Date(poll.expiry_date), "MMM d, yyyy")}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {showResults ? (
            <div className="space-y-3">
              {voteCounts.map((opt) => (
                <div key={opt.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{opt.option_text}</span>
                    <span className="text-muted-foreground">
                      {opt.count} ({opt.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={opt.percentage} className="h-2" />
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Total votes: {pollsData?.votes.filter((v) => v.poll_id === poll.id).length || 0}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <RadioGroup
                value={selectedOptions[poll.id] || ""}
                onValueChange={(value) =>
                  setSelectedOptions((prev) => ({ ...prev, [poll.id]: value }))
                }
              >
                {pollOptions.map((opt) => (
                  <div key={opt.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.id} id={opt.id} />
                    <Label htmlFor={opt.id} className="cursor-pointer">
                      {opt.option_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <Button
                onClick={() => handleVote(poll.id)}
                disabled={voteMutation.isPending}
                className="w-full"
              >
                Submit Vote
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSurveyCard = (survey: Survey, isClosed: boolean) => {
    const responded = hasResponded(survey.id);
    const expired = isExpired(survey.expiry_date);
    const questions = surveysData?.questions.filter((q) => q.survey_id === survey.id) || [];
    const canRespond = !responded && !expired && survey.is_active;

    return (
      <Card key={survey.id} className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg">{survey.title}</CardTitle>
              {survey.description && (
                <CardDescription className="mt-1">{survey.description}</CardDescription>
              )}
            </div>
            {expired ? (
              <Badge variant="secondary" className="shrink-0">
                <XCircle className="h-3 w-3 mr-1" /> Closed
              </Badge>
            ) : responded ? (
              <Badge variant="default" className="shrink-0">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0">
                <BarChart3 className="h-3 w-3 mr-1" /> {questions.length} Questions
              </Badge>
            )}
          </div>
          {survey.expiry_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <Clock className="h-3 w-3" />
              {expired ? "Ended" : "Ends"} {format(new Date(survey.expiry_date), "MMM d, yyyy")}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {responded ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Thank you for completing this survey!
            </p>
          ) : canRespond ? (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <Label className="font-medium">
                    {idx + 1}. {q.question_text}
                  </Label>
                  {q.question_type === "multiple_choice" && q.options ? (
                    <RadioGroup
                      value={surveyAnswers[survey.id]?.[q.id] || ""}
                      onValueChange={(value) =>
                        setSurveyAnswers((prev) => ({
                          ...prev,
                          [survey.id]: { ...prev[survey.id], [q.id]: value },
                        }))
                      }
                    >
                      {(q.options as string[]).map((opt, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                          <Label htmlFor={`${q.id}-${i}`} className="cursor-pointer">
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Your answer..."
                      value={surveyAnswers[survey.id]?.[q.id] || ""}
                      onChange={(e) =>
                        setSurveyAnswers((prev) => ({
                          ...prev,
                          [survey.id]: { ...prev[survey.id], [q.id]: e.target.value },
                        }))
                      }
                    />
                  )}
                </div>
              ))}
              <Button
                onClick={() => handleSurveySubmit(survey.id, questions)}
                disabled={submitSurveyMutation.isPending}
                className="w-full"
              >
                Submit Survey
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              This survey is no longer accepting responses.
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const isLoading = pollsLoading || surveysLoading;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <DesktopHeader />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Polls & Surveys</h1>
            <p className="text-muted-foreground text-sm">Share your opinion and help us improve</p>
          </div>
        </div>

        <Tabs defaultValue="active-polls" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="active-polls" className="text-xs md:text-sm">
              Active Polls
            </TabsTrigger>
            <TabsTrigger value="closed-polls" className="text-xs md:text-sm">
              Closed Polls
            </TabsTrigger>
            <TabsTrigger value="surveys" className="text-xs md:text-sm">
              Surveys
            </TabsTrigger>
            <TabsTrigger value="closed-surveys" className="text-xs md:text-sm">
              Past Surveys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active-polls" className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            ) : activePolls.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No active polls at the moment.</p>
              </Card>
            ) : (
              activePolls.map((poll) => renderPollCard(poll, false))
            )}
          </TabsContent>

          <TabsContent value="closed-polls" className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : closedPolls.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No closed polls.</p>
              </Card>
            ) : (
              closedPolls.map((poll) => renderPollCard(poll, true))
            )}
          </TabsContent>

          <TabsContent value="surveys" className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : activeSurveys.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No active surveys at the moment.</p>
              </Card>
            ) : (
              activeSurveys.map((survey) => renderSurveyCard(survey, false))
            )}
          </TabsContent>

          <TabsContent value="closed-surveys" className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : closedSurveys.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No past surveys.</p>
              </Card>
            ) : (
              closedSurveys.map((survey) => renderSurveyCard(survey, true))
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileBottomNav />
      <Chatbot />
    </div>
  );
};

export default PollsAndSurveys;
