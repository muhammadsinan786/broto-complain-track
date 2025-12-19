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
import { PriorityBadge } from "@/components/PriorityBadge";
import { ArrowLeft, Download, Send, Star, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { messageSchema } from "@/lib/validations";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: "academic" | "infrastructure" | "technical" | "administrative" | "other";
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "resolved";
  is_anonymous: boolean;
  student_id: string;
  rating?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  signed_url: string;
}

interface Template {
  id: string;
  title: string;
  content: string;
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

interface InternalNote {
  id: string;
  note: string;
  created_at: string;
  admin_id: string;
  profiles?: {
    name: string;
  };
}

const AdminComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [newNote, setNewNote] = useState("");

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

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("complaint_messages")
        .select("*, sender_id")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      
      // Fetch sender profiles for messages with anonymous handling
      const messagesWithProfiles = await Promise.all(
        (messagesData || []).map(async (message) => {
          // For anonymous complaints, hide real identities
          if (complaintData.is_anonymous) {
            const isStudent = message.sender_id === complaintData.student_id;
            return {
              ...message,
              profiles: { name: isStudent ? "Anonymous User" : "Admin" },
            };
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

      // Fetch templates
      const { data: templatesData } = await supabase
        .from("admin_templates")
        .select("*");
      
      setTemplates(templatesData || []);

      // Fetch internal notes
      const { data: notesData } = await supabase
        .from("internal_notes")
        .select("*")
        .eq("complaint_id", id)
        .order("created_at", { ascending: false });

      if (notesData) {
        const notesWithProfiles = await Promise.all(
          notesData.map(async (note) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", note.admin_id)
              .maybeSingle();
            
            return {
              ...note,
              profiles: profile || { name: "Admin" },
            };
          })
        );
        setInternalNotes(notesWithProfiles);
      }
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

  const handleCategoryUpdate = async (newCategory: "academic" | "infrastructure" | "technical" | "administrative" | "other") => {
    try {
      const { error } = await supabase
        .from("complaints")
        .update({ category: newCategory })
        .eq("id", id);

      if (error) throw error;
      
      setComplaint((prev) => prev ? { ...prev, category: newCategory } : null);
      toast.success("Category updated successfully");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handlePriorityUpdate = async (newPriority: "low" | "medium" | "high") => {
    try {
      const { error } = await supabase
        .from("complaints")
        .update({ priority: newPriority })
        .eq("id", id);

      if (error) throw error;
      
      setComplaint((prev) => prev ? { ...prev, priority: newPriority } : null);
      toast.success("Priority updated successfully");
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update priority");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    try {
      const { error } = await supabase
        .from("internal_notes")
        .insert({
          complaint_id: id,
          admin_id: user.id,
          note: newNote,
        });

      if (error) throw error;

      setNewNote("");
      fetchComplaintDetails();
      toast.success("Note added");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
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

    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewMessage(template.content);
    }
    setSelectedTemplate(templateId);
  };

  if (loading) {
    return (
      <AppLayout title="Complaint Details">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
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
            <Button onClick={() => navigate("/admin")}>
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
      title="Manage Complaint"
      actions={
        <Button variant="outline" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Complaint Details Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
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
                {!complaint.is_anonymous && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Student:</span> {complaint.profiles?.name} {complaint.profiles?.email && `(${complaint.profiles?.email})`}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Submitted {new Date(complaint.created_at).toLocaleDateString()}
                  {complaint.updated_at !== complaint.created_at && (
                    <span> • Last edited {new Date(complaint.updated_at).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-4">
                <StatusBadge status={complaint.status} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                    <Select value={complaint.status} onValueChange={handleStatusUpdate}>
                      <SelectTrigger className="w-full lg:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                    <Select value={complaint.category} onValueChange={handleCategoryUpdate}>
                      <SelectTrigger className="w-full lg:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="administrative">Administrative</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
                    <Select value={complaint.priority} onValueChange={handlePriorityUpdate}>
                      <SelectTrigger className="w-full lg:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
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
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Conversation Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Send a message to the student</p>
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
              
              {templates.length > 0 && (
                <div className="mb-4">
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Use quick reply template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
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
                  disabled={!newMessage.trim() || submitting}
                  size="icon"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                {internalNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No internal notes yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Add notes visible only to admins</p>
                  </div>
                ) : (
                  internalNotes.map((note) => (
                    <div key={note.id} className="p-4 rounded-lg bg-muted/50 border border-dashed">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm">{note.profiles?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add internal note (only visible to admins)..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  size="icon"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Feedback Card */}
        {complaint.rating && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Feedback</CardTitle>
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
    </AppLayout>
  );
};

export default AdminComplaintDetail;