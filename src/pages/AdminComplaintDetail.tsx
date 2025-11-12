import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: "academic" | "infrastructure" | "technical" | "administrative" | "other";
  status: "pending" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
  profiles: {
    name: string;
    email: string;
  };
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

const AdminComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || userRole !== "admin") {
      navigate("/auth");
      return;
    }
    fetchComplaintDetails();
  }, [id, user, userRole, navigate]);

  const fetchComplaintDetails = async () => {
    try {
      const { data: complaintData, error: complaintError } = await supabase
        .from("complaints")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (complaintError) throw complaintError;
      if (!complaintData) {
        toast.error("Complaint not found");
        setLoading(false);
        return;
      }
      
      // Fetch student profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", complaintData.student_id)
        .maybeSingle();
      
      setComplaint({ 
        ...complaintData, 
        profiles: profileData || { name: "Unknown Student", email: "" }
      });

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("complaint_attachments")
        .select("*")
        .eq("complaint_id", id);

      if (attachmentsError) throw attachmentsError;
      setAttachments(attachmentsData || []);

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

  const handleStatusUpdate = async (newStatus: "pending" | "in_progress" | "resolved") => {
    try {
      const { error } = await supabase
        .from("complaints")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      setComplaint((prev) => prev ? { ...prev, status: newStatus } : null);
      toast.success("Status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyMessage.trim() || !user) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from("complaint_replies").insert({
        complaint_id: id,
        admin_id: user.id,
        message: replyMessage.trim(),
      });

      if (error) throw error;

      toast.success("Reply posted successfully");
      setReplyMessage("");
      await fetchComplaintDetails();
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply");
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 p-4 md:p-6">
      <div className="container mx-auto max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl md:text-3xl mb-2">{complaint.title}</CardTitle>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
                    {complaint.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Student: {complaint.profiles.name} {complaint.profiles.email && `(${complaint.profiles.email})`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Submitted {new Date(complaint.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-3">
                <StatusBadge status={complaint.status} />
                <Select value={complaint.status} onValueChange={handleStatusUpdate}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Replies</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Post Reply</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReplySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reply">Your Reply</Label>
                <Textarea
                  id="reply"
                  placeholder="Type your response to the student..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Posting..." : "Post Reply"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminComplaintDetail;
