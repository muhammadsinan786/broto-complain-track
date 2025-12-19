import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { complaintSchema, validateFiles } from "@/lib/validations";
import Chatbot from "@/components/chatbot/Chatbot";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout";

const EditComplaint = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"academic" | "infrastructure" | "technical" | "administrative" | "other">("other");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [files, setFiles] = useState<FileList | null>(null);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchComplaint();
  }, [user, id, navigate]);

  const fetchComplaint = async () => {
    try {
      const { data: complaint, error } = await supabase
        .from("complaints")
        .select("*, complaint_attachments(*)")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (!complaint || complaint.student_id !== user?.id) {
        toast.error("Complaint not found or unauthorized");
        navigate("/student");
        return;
      }

      if (complaint.status !== "pending") {
        toast.error("Cannot edit complaint after it's been reviewed");
        navigate(`/student/complaint/${id}`);
        return;
      }

      setTitle(complaint.title);
      setDescription(complaint.description);
      setCategory(complaint.category);
      setPriority(complaint.priority);
      setExistingAttachments(complaint.complaint_attachments || []);
    } catch (error) {
      console.error("Error fetching complaint:", error);
      toast.error("Failed to load complaint");
      navigate("/student");
    } finally {
      setLoading(false);
    }
  };

  const removeExistingAttachment = async (attachmentId: string) => {
    try {
      // First get the attachment to find the file URL
      const { data: attachment, error: fetchError } = await supabase
        .from("complaint_attachments")
        .select("file_url")
        .eq("id", attachmentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the file from storage
      if (attachment?.file_url) {
        const filePath = attachment.file_url.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from("complaint-attachments")
            .remove([filePath]);
        }
      }

      // Then delete the database record
      const { error } = await supabase
        .from("complaint_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;
      
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success("Attachment removed");
    } catch (error) {
      console.error("Error removing attachment:", error);
      toast.error("Failed to remove attachment");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to update a complaint");
      return;
    }

    const validation = complaintSchema.safeParse({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      is_anonymous: false
    });

    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    const fileValidation = validateFiles(files);
    if (!fileValidation.valid) {
      toast.error(fileValidation.error);
      return;
    }

    setIsSubmitting(true);

    try {
      // Update complaint
      const { error: updateError } = await supabase
        .from("complaints")
        .update({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Upload new files if any
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split(".").pop();
          const filePath = `${id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("complaint-attachments")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { error: attachmentError } = await supabase
            .from("complaint_attachments")
            .insert({
              complaint_id: id!,
              file_name: file.name,
              file_url: filePath,
            });

          if (attachmentError) throw attachmentError;
        }
      }

      toast.success("Complaint updated successfully!");
      navigate(`/student/complaint/${id}`);
    } catch (error: any) {
      console.error("Error updating complaint:", error);
      toast.error(error.message || "Failed to update complaint");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Edit Complaint">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Edit Complaint"
      actions={
        <Button variant="outline" onClick={() => navigate(`/student/complaint/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Complaint
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Update Your Complaint</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of your complaint"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information about your complaint"
                rows={6}
                required
              />
            </div>

            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <Label>Current Attachments</Label>
                <div className="space-y-2">
                  {existingAttachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                      <span className="text-sm font-medium truncate">{attachment.file_name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExistingAttachment(attachment.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="attachments">Add New Attachments (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="attachments"
                  type="file"
                  onChange={(e) => setFiles(e.target.files)}
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  className="cursor-pointer"
                />
                <Upload className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                Max 5 files, 10MB each. Supported: Images, PDF, DOC, DOCX
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Updating..." : "Update Complaint"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/student/complaint/${id}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Chatbot />
    </AppLayout>
  );
};

export default EditComplaint;