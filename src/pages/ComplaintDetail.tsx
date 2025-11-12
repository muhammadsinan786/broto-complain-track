import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
}

interface Reply {
  id: string;
  message: string;
  created_at: string;
  profiles: {
    name: string;
  };
}

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchComplaintDetails();
  }, [id, user, navigate]);

  const fetchComplaintDetails = async () => {
    try {
      // Fetch complaint
      const { data: complaintData, error: complaintError } = await supabase
        .from("complaints")
        .select("*")
        .eq("id", id)
        .single();

      if (complaintError) throw complaintError;
      setComplaint(complaintData);

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("complaint_attachments")
        .select("*")
        .eq("complaint_id", id);

      if (attachmentsError) throw attachmentsError;
      setAttachments(attachmentsData || []);

      // Fetch replies with admin profile names
      const { data: repliesData, error: repliesError } = await supabase
        .from("complaint_replies")
        .select("*, admin_id")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true });

      if (repliesError) throw repliesError;
      
      // Fetch admin profiles for replies
      const repliesWithProfiles = await Promise.all(
        (repliesData || []).map(async (reply) => {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", reply.admin_id)
            .single();
          
          return {
            ...reply,
            profiles: adminProfile || { name: "Admin" },
          };
        })
      );
      
      setReplies(repliesWithProfiles);
    } catch (error) {
      console.error("Error fetching complaint details:", error);
      toast.error("Failed to load complaint details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Complaint not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 p-6">
      <div className="container mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/student")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{complaint.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Submitted {new Date(complaint.created_at).toLocaleDateString()} • 
                  Last updated {new Date(complaint.updated_at).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-foreground whitespace-pre-wrap">{complaint.description}</p>
              </div>

              {attachments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Attachments</h3>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <span className="text-sm">{attachment.file_name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(attachment.file_url, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {replies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Replies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {replies.map((reply) => (
                  <div key={reply.id} className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-sm">{reply.profiles.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(reply.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-foreground">{reply.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ComplaintDetail;
