import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquare } from "lucide-react";

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export default function FeedbackManagement() {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
    fetchFeedback();
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      navigate("/");
    }
  };

  const fetchFeedback = async () => {
    // Fetch feedback with user profiles
    const { data: feedbackData, error: feedbackError } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (feedbackError) {
      toast({
        title: "Error",
        description: "Failed to fetch feedback",
        variant: "destructive",
      });
      console.error(feedbackError);
      return;
    }

    // Fetch user profiles separately
    const userIds = feedbackData?.map(f => f.user_id) || [];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);

    // Combine the data
    const feedbackWithProfiles = feedbackData?.map(feedback => ({
      ...feedback,
      profiles: profilesData?.find(p => p.id === feedback.user_id),
    })) || [];

    setFeedback(feedbackWithProfiles);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("feedback")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Status updated successfully",
    });

    fetchFeedback();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "under_review": return "bg-yellow-500";
      case "accepted": return "bg-blue-500";
      case "implemented": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "suggestion": return "bg-purple-500";
      case "improvement": return "bg-blue-500";
      case "bug": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Feedback Management</h1>
            <p className="text-muted-foreground text-sm md:text-base">Review and manage user feedback</p>
          </div>
        </div>

        {feedback.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">No feedback yet</p>
              <p className="text-muted-foreground">User feedback will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {feedback.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{item.title}</CardTitle>
                        <Badge className={getCategoryColor(item.category)}>
                          {item.category}
                        </Badge>
                      </div>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                    <Select
                      value={item.status}
                      onValueChange={(value) => updateStatus(item.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="implemented">Implemented</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Submitted by: {item.profiles?.name}</span>
                    <span>•</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
