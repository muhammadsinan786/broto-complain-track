import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

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

    const userIds = feedbackData?.map(f => f.user_id) || [];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);

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

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "under_review": return "secondary";
      case "accepted": return "default";
      case "implemented": return "default";
      default: return "outline";
    }
  };

  const getCategoryVariant = (category: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (category) {
      case "suggestion": return "outline";
      case "improvement": return "default";
      case "bug": return "destructive";
      default: return "outline";
    }
  };

  return (
    <AppLayout title="Feedback Management" subtitle="Review and manage user feedback">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : feedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold mb-2">No feedback yet</p>
            <p className="text-muted-foreground">User feedback will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <Badge variant={getCategoryVariant(item.category)}>
                        {item.category}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                  </div>
                  <Select
                    value={item.status}
                    onValueChange={(value) => updateStatus(item.id, value)}
                  >
                    <SelectTrigger className="w-full md:w-[180px]">
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
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Submitted by: {item.profiles?.name || "Unknown"}</span>
                  <span className="hidden md:inline">•</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <span className="hidden md:inline">•</span>
                  <Badge variant={getStatusVariant(item.status)}>
                    {item.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
