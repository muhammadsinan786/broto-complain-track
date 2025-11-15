import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Download, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { messageSchema, ratingSchema } from "@/lib/validations";

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
          onClick={() => navigate("/student")}
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
                  <PriorityBadge priority={complaint.priority} />
                  {complaint.is_anonymous && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No messages yet</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.sender_id === user?.id
                        ? "bg-primary/10 ml-8"
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

        {complaint.status === "resolved" && !complaint.rating && (
          <Card>
            <CardHeader>
              <CardTitle>Rate This Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-all hover:scale-110"
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

        {complaint.rating && (
          <Card>
            <CardHeader>
              <CardTitle>Your Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 mb-2">
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
    </div>
  );
};

export default ComplaintDetail;
