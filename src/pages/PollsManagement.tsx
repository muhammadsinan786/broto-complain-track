import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, BarChart3, Clock, Eye, EyeOff, X, CheckCircle2, XCircle } from "lucide-react";
import { format, isPast } from "date-fns";
import { DesktopHeader } from "@/components/DesktopHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

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

const PollsManagement = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);
  
  // Poll form state
  const [pollTitle, setPollTitle] = useState("");
  const [pollDescription, setPollDescription] = useState("");
  const [pollExpiry, setPollExpiry] = useState("");
  const [pollShowResults, setPollShowResults] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  
  // Survey form state
  const [surveyTitle, setSurveyTitle] = useState("");
  const [surveyDescription, setSurveyDescription] = useState("");
  const [surveyExpiry, setSurveyExpiry] = useState("");
  const [surveyShowResults, setSurveyShowResults] = useState(false);
  const [surveyQuestions, setSurveyQuestions] = useState<{ text: string; type: string; options: string[] }[]>([
    { text: "", type: "multiple_choice", options: ["", ""] },
  ]);

  // Redirect if not admin
  if (userRole !== 'admin') {
    navigate("/");
    return null;
  }

  // Fetch polls
  const { data: pollsData, isLoading: pollsLoading } = useQuery({
    queryKey: ["admin-polls"],
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
  });

  // Fetch surveys
  const { data: surveysData, isLoading: surveysLoading } = useQuery({
    queryKey: ["admin-surveys"],
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
        responses: (responsesRes.data || []) as { id: string; survey_id: string }[],
      };
    },
  });

  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: async () => {
      const validOptions = pollOptions.filter((o) => o.trim());
      if (!pollTitle.trim() || validOptions.length < 2) {
        throw new Error("Please provide a title and at least 2 options");
      }

      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .insert({
          title: pollTitle.trim(),
          description: pollDescription.trim() || null,
          expiry_date: pollExpiry || null,
          show_results: pollShowResults,
          created_by: user!.id,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      const optionInserts = validOptions.map((opt) => ({
        poll_id: pollData.id,
        option_text: opt.trim(),
      }));

      const { error: optionsError } = await supabase.from("poll_options").insert(optionInserts);
      if (optionsError) throw optionsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-polls"] });
      toast({ title: "Poll created!", description: "The poll is now live." });
      resetPollForm();
      setPollDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create survey mutation
  const createSurveyMutation = useMutation({
    mutationFn: async () => {
      const validQuestions = surveyQuestions.filter((q) => q.text.trim());
      if (!surveyTitle.trim() || validQuestions.length < 1) {
        throw new Error("Please provide a title and at least 1 question");
      }

      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .insert({
          title: surveyTitle.trim(),
          description: surveyDescription.trim() || null,
          expiry_date: surveyExpiry || null,
          show_results: surveyShowResults,
          created_by: user!.id,
        })
        .select()
        .single();

      if (surveyError) throw surveyError;

      const questionInserts = validQuestions.map((q, idx) => ({
        survey_id: surveyData.id,
        question_text: q.text.trim(),
        question_type: q.type,
        options: q.type === "multiple_choice" ? q.options.filter((o) => o.trim()) : null,
        order_index: idx,
      }));

      const { error: questionsError } = await supabase.from("survey_questions").insert(questionInserts);
      if (questionsError) throw questionsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
      toast({ title: "Survey created!", description: "The survey is now live." });
      resetSurveyForm();
      setSurveyDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle poll status mutation
  const togglePollMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("polls").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-polls"] });
      toast({ title: "Poll updated" });
    },
  });

  // Toggle show results mutation
  const toggleShowResultsMutation = useMutation({
    mutationFn: async ({ id, showResults, type }: { id: string; showResults: boolean; type: "poll" | "survey" }) => {
      const table = type === "poll" ? "polls" : "surveys";
      const { error } = await supabase.from(table).update({ show_results: showResults }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-polls"] });
      queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
      toast({ title: "Settings updated" });
    },
  });

  // Delete poll mutation
  const deletePollMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("polls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-polls"] });
      toast({ title: "Poll deleted" });
    },
  });

  // Delete survey mutation
  const deleteSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("surveys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
      toast({ title: "Survey deleted" });
    },
  });

  // Toggle survey status mutation
  const toggleSurveyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("surveys").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
      toast({ title: "Survey updated" });
    },
  });

  const resetPollForm = () => {
    setPollTitle("");
    setPollDescription("");
    setPollExpiry("");
    setPollShowResults(false);
    setPollOptions(["", ""]);
  };

  const resetSurveyForm = () => {
    setSurveyTitle("");
    setSurveyDescription("");
    setSurveyExpiry("");
    setSurveyShowResults(false);
    setSurveyQuestions([{ text: "", type: "multiple_choice", options: ["", ""] }]);
  };

  const addPollOption = () => setPollOptions([...pollOptions, ""]);
  const removePollOption = (idx: number) => setPollOptions(pollOptions.filter((_, i) => i !== idx));
  const updatePollOption = (idx: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[idx] = value;
    setPollOptions(newOptions);
  };

  const addSurveyQuestion = () => {
    setSurveyQuestions([...surveyQuestions, { text: "", type: "multiple_choice", options: ["", ""] }]);
  };
  const removeSurveyQuestion = (idx: number) => {
    setSurveyQuestions(surveyQuestions.filter((_, i) => i !== idx));
  };
  const updateSurveyQuestion = (idx: number, field: string, value: string | string[]) => {
    const newQuestions = [...surveyQuestions];
    (newQuestions[idx] as any)[field] = value;
    setSurveyQuestions(newQuestions);
  };
  const addQuestionOption = (qIdx: number) => {
    const newQuestions = [...surveyQuestions];
    newQuestions[qIdx].options.push("");
    setSurveyQuestions(newQuestions);
  };
  const removeQuestionOption = (qIdx: number, oIdx: number) => {
    const newQuestions = [...surveyQuestions];
    newQuestions[qIdx].options = newQuestions[qIdx].options.filter((_, i) => i !== oIdx);
    setSurveyQuestions(newQuestions);
  };
  const updateQuestionOption = (qIdx: number, oIdx: number, value: string) => {
    const newQuestions = [...surveyQuestions];
    newQuestions[qIdx].options[oIdx] = value;
    setSurveyQuestions(newQuestions);
  };

  const isExpired = (expiryDate: string | null) => expiryDate ? isPast(new Date(expiryDate)) : false;

  const getVoteCounts = (pollId: string) => {
    const pollOptions = pollsData?.options.filter((o) => o.poll_id === pollId) || [];
    const pollVotes = pollsData?.votes.filter((v) => v.poll_id === pollId) || [];
    const total = pollVotes.length;

    return pollOptions.map((opt) => {
      const count = pollVotes.filter((v) => v.option_id === opt.id).length;
      return { ...opt, count, percentage: total > 0 ? (count / total) * 100 : 0 };
    });
  };

  const isLoading = pollsLoading || surveysLoading;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <DesktopHeader />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Manage Polls & Surveys</h1>
              <p className="text-muted-foreground text-sm">Create and manage student engagement</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> New Poll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Poll</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={pollTitle} onChange={(e) => setPollTitle(e.target.value)} placeholder="Poll question..." />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={pollDescription} onChange={(e) => setPollDescription(e.target.value)} placeholder="Optional description..." />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input type="datetime-local" value={pollExpiry} onChange={(e) => setPollExpiry(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={pollShowResults} onCheckedChange={setPollShowResults} />
                    <Label>Show results to students</Label>
                  </div>
                  <div>
                    <Label>Options *</Label>
                    <div className="space-y-2 mt-2">
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => updatePollOption(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                          />
                          {pollOptions.length > 2 && (
                            <Button variant="ghost" size="icon" onClick={() => removePollOption(idx)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addPollOption}>
                        <Plus className="h-4 w-4 mr-1" /> Add Option
                      </Button>
                    </div>
                  </div>
                  <Button onClick={() => createPollMutation.mutate()} disabled={createPollMutation.isPending} className="w-full">
                    Create Poll
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={surveyDialogOpen} onOpenChange={setSurveyDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> New Survey
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Survey</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} placeholder="Survey title..." />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={surveyDescription} onChange={(e) => setSurveyDescription(e.target.value)} placeholder="Optional description..." />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input type="datetime-local" value={surveyExpiry} onChange={(e) => setSurveyExpiry(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={surveyShowResults} onCheckedChange={setSurveyShowResults} />
                    <Label>Show results to students</Label>
                  </div>
                  <div>
                    <Label>Questions *</Label>
                    <div className="space-y-4 mt-2">
                      {surveyQuestions.map((q, qIdx) => (
                        <Card key={qIdx} className="p-3">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <Label className="text-sm">Question {qIdx + 1}</Label>
                            {surveyQuestions.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSurveyQuestion(qIdx)}>
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <Input
                            value={q.text}
                            onChange={(e) => updateSurveyQuestion(qIdx, "text", e.target.value)}
                            placeholder="Enter question..."
                            className="mb-2"
                          />
                          <div className="space-y-2">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex gap-2">
                                <Input
                                  value={opt}
                                  onChange={(e) => updateQuestionOption(qIdx, oIdx, e.target.value)}
                                  placeholder={`Option ${oIdx + 1}`}
                                  className="text-sm"
                                />
                                {q.options.length > 2 && (
                                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeQuestionOption(qIdx, oIdx)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={() => addQuestionOption(qIdx)}>
                              <Plus className="h-3 w-3 mr-1" /> Add Option
                            </Button>
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" size="sm" onClick={addSurveyQuestion}>
                        <Plus className="h-4 w-4 mr-1" /> Add Question
                      </Button>
                    </div>
                  </div>
                  <Button onClick={() => createSurveyMutation.mutate()} disabled={createSurveyMutation.isPending} className="w-full">
                    Create Survey
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="polls" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="polls">Polls ({pollsData?.polls.length || 0})</TabsTrigger>
            <TabsTrigger value="surveys">Surveys ({surveysData?.surveys.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="polls" className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </>
            ) : pollsData?.polls.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No polls created yet.</p>
              </Card>
            ) : (
              pollsData?.polls.map((poll) => {
                const expired = isExpired(poll.expiry_date);
                const voteCounts = getVoteCounts(poll.id);
                const totalVotes = pollsData.votes.filter((v) => v.poll_id === poll.id).length;

                return (
                  <Card key={poll.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{poll.title}</CardTitle>
                          {poll.description && <CardDescription>{poll.description}</CardDescription>}
                        </div>
                        <div className="flex items-center gap-2">
                          {expired ? (
                            <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Expired</Badge>
                          ) : poll.is_active ? (
                            <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        {poll.expiry_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {expired ? "Ended" : "Ends"} {format(new Date(poll.expiry_date), "MMM d, yyyy HH:mm")}
                          </span>
                        )}
                        <span>{totalVotes} votes</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {voteCounts.map((opt) => (
                          <div key={opt.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{opt.option_text}</span>
                              <span className="text-muted-foreground">{opt.count} ({opt.percentage.toFixed(0)}%)</span>
                            </div>
                            <Progress value={opt.percentage} className="h-2" />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={poll.is_active}
                              onCheckedChange={(checked) => togglePollMutation.mutate({ id: poll.id, isActive: checked })}
                            />
                            <Label className="text-sm">Active</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleShowResultsMutation.mutate({ id: poll.id, showResults: !poll.show_results, type: "poll" })}
                            >
                              {poll.show_results ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                              {poll.show_results ? "Results Visible" : "Results Hidden"}
                            </Button>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Poll?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete the poll and all votes.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePollMutation.mutate(poll.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="surveys" className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : surveysData?.surveys.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No surveys created yet.</p>
              </Card>
            ) : (
              surveysData?.surveys.map((survey) => {
                const expired = isExpired(survey.expiry_date);
                const questions = surveysData.questions.filter((q) => q.survey_id === survey.id);
                const responseCount = surveysData.responses.filter((r) => r.survey_id === survey.id).length;

                return (
                  <Card key={survey.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{survey.title}</CardTitle>
                          {survey.description && <CardDescription>{survey.description}</CardDescription>}
                        </div>
                        <div className="flex items-center gap-2">
                          {expired ? (
                            <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Expired</Badge>
                          ) : survey.is_active ? (
                            <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        {survey.expiry_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {expired ? "Ended" : "Ends"} {format(new Date(survey.expiry_date), "MMM d, yyyy HH:mm")}
                          </span>
                        )}
                        <span>{questions.length} questions</span>
                        <span>{responseCount} responses</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {questions.map((q, idx) => (
                          <div key={q.id} className="text-sm p-2 bg-muted rounded">
                            <span className="font-medium">{idx + 1}.</span> {q.question_text}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={survey.is_active}
                              onCheckedChange={(checked) => toggleSurveyMutation.mutate({ id: survey.id, isActive: checked })}
                            />
                            <Label className="text-sm">Active</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleShowResultsMutation.mutate({ id: survey.id, showResults: !survey.show_results, type: "survey" })}
                            >
                              {survey.show_results ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                              {survey.show_results ? "Results Visible" : "Results Hidden"}
                            </Button>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Survey?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete the survey and all responses.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSurveyMutation.mutate(survey.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default PollsManagement;
