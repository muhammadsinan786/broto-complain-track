import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Download, Send, Star, Clock } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Textarea } from "@/components/ui/textarea";
import { messageSchema, ratingSchema } from "@/lib/validations";
import { ComplaintTimeline } from "@/components/ComplaintTimeline";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import Chatbot from "@/components/chatbot/Chatbot";
import { AppLayout } from "@/components/layout";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: "academic" | "infrastructure" | "technical" | "administrative" | "other";
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "resolved";
  rating?: number;
  feedback?: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  signed_url: string;
}

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

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

      // Fetch attachments with signed URLs
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("complaint_attachments")
        .select("*")
        .eq("complaint_id", id);

      if (attachmentsError) throw attachmentsError;
      
      // Generate signed URLs for attachments
      const attachmentsWithUrls = await Promise.all(
        (attachmentsData || []).map(async (attachment) => {
          const { data: signedData } = await supabase.storage
            .from("complaint-attachments")
            .createSignedUrl(attachment.file_url, 3600);
          
          return {
            ...attachment,
            signed_url: signedData?.signedUrl || attachment.file_url,
          };
        })
      );
      
      setAttachments(attachmentsWithUrls);

      // Fetch messages with sender profiles
      const { data: messagesData, error: messagesError } = await supabase
        .from("complaint_messages")
        .select("*, sender_id")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      
      // Fetch sender profiles for messages with anonymous handling
      const messagesWithProfiles = await Promise.all(
        (messagesData || []).map(async (message) => {
          // For anonymous complaints, hide admin identity
          if (complaintData.is_anonymous) {
            const isCurrentUser = message.sender_id === user?.id;
            if (isCurrentUser) {
              // Student sees their own name
              const { data: senderProfile } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", message.sender_id)
                .maybeSingle();
              return {
                ...message,
                profiles: senderProfile || { name: "You" },
              };
            } else {
              // Admin messages show as "Admin"
              return {
                ...message,
                profiles: { name: "Admin" },
              };
            }
          }
          
          // For non-anonymous complaints, fetch real profiles
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", message.sender_id)
            .maybeSingle();
          
          return {
            ...message,
            profiles: senderProfile || { name: "User" },
          };
        })
      );
      
      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error("Error fetching complaint details:", error);
      toast.error("Failed to load complaint details");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!complaint || !user) return;

    const validation = messageSchema.safeParse({ message: newMessage });
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from("complaint_messages")
        .insert({
          complaint_id: id,
          sender_id: user.id,
          message: newMessage,
        });

      if (error) throw error;

      setNewMessage("");
      fetchComplaintDetails();
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!user) return;

    const validation = ratingSchema.safeParse({ rating, feedback });
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    setSubmittingRating(true);
    try {
      const { error } = await supabase
        .from("complaints")
        .update({ rating, feedback })
        .eq("id", id);

      if (error) throw error;

      toast.success("Thank you for your feedback!");
      fetchComplaintDetails();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Complaint Details">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!complaint) {
    return (
      <AppLayout title="Complaint Not Found">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">The complaint you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/student")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Complaint Details"
      actions={
        <Button variant="outline" onClick={() => navigate("/student")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Complaint Details Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="flex-1">
                  <CardTitle className="text-xl md:text-2xl mb-3">{complaint.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize font-medium">
                      {complaint.category}
                    </span>
                    <PriorityBadge priority={complaint.priority} />
                    {complaint.is_anonymous && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                        Anonymous
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Submitted {new Date(complaint.created_at).toLocaleDateString()} • 
                    Last updated {new Date(complaint.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={complaint.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Description</h3>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{complaint.description}</p>
                </div>

                {attachments.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Attachments</h3>
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                        >
                          <span className="text-sm font-medium truncate mr-4">{attachment.file_name}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(attachment.signed_url, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {messages.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
                    <Clock className="h-4 w-4" />
                    <span>Admin last active {formatDistanceToNow(new Date(messages[messages.length - 1].created_at), { addSuffix: true })}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conversation Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start a conversation with the admin team</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg ${
                        message.sender_id === user?.id
                          ? "bg-primary/10 ml-8 border-l-2 border-primary"
                          : "bg-muted mr-8"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm">{message.profiles.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-foreground">{message.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  size="icon"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rating Card */}
          {complaint.status === "resolved" && !complaint.rating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rate This Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Share your feedback (optional)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleSubmitRating}
                    disabled={rating === 0 || submittingRating}
                    className="w-full"
                  >
                    Submit Rating
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Display Card */}
          {complaint.rating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= complaint.rating!
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                {complaint.feedback && (
                  <p className="text-foreground">{complaint.feedback}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timeline Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ComplaintTimeline
                complaint={complaint}
                hasAdminViewed={messages.length > 0}
                hasAdminReplied={messages.some(m => m.sender_id !== user?.id)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Chatbot />
    </AppLayout>
  );
};

export default ComplaintDetail;