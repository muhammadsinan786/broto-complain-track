import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const NewComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"academic" | "infrastructure" | "technical" | "administrative" | "other">("other");
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create complaint
      const { data: complaint, error: complaintError } = await supabase
        .from("complaints")
        .insert({
          title: title.trim(),
          description: description.trim(),
          category: category,
          student_id: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (complaintError) throw complaintError;

      // Upload files if any
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split(".").pop();
          const fileName = `${complaint.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("complaint-attachments")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get signed URL for private bucket
          const { data: urlData } = await supabase.storage
            .from("complaint-attachments")
            .createSignedUrl(fileName, 31536000); // 1 year expiry

          // Save attachment record
          await supabase.from("complaint_attachments").insert({
            complaint_id: complaint.id,
            file_name: file.name,
            file_url: urlData?.signedUrl || "",
          });
        }
      }

      toast.success("Complaint submitted successfully!");
      navigate("/student");
    } catch (error: any) {
      console.error("Error submitting complaint:", error);
      toast.error(error.message || "Failed to submit complaint");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 p-4 md:p-6">
      <div className="container mx-auto max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/student")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Submit New Complaint</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of your complaint"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about your complaint"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={8}
                  maxLength={2000}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachments">Attachments (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => setFiles(e.target.files)}
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Supported: Images, PDF, Word documents
                </p>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Submitting..." : "Submit Complaint"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/student")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewComplaint;
