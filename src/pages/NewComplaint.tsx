import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLayout } from "@/components/layout";
import { Upload, FileText, AlertTriangle, Info, Paperclip, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { complaintSchema, validateFiles } from "@/lib/validations";
import Chatbot from "@/components/chatbot/Chatbot";
import { cn } from "@/lib/utils";

const categoryInfo: Record<string, { description: string; icon: string }> = {
  academic: { description: "Course-related issues, grades, professors, curriculum", icon: "📚" },
  infrastructure: { description: "Facilities, classrooms, labs, library, hostels", icon: "🏛️" },
  technical: { description: "IT issues, software, hardware, network problems", icon: "💻" },
  administrative: { description: "Office procedures, documentation, fees, registration", icon: "📋" },
  other: { description: "Any other concerns not fitting above categories", icon: "📝" },
};

const NewComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"academic" | "infrastructure" | "technical" | "administrative" | "other">("academic");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5)); // Max 5 files
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to submit a complaint");
      return;
    }

    const validation = complaintSchema.safeParse({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      is_anonymous: isAnonymous
    });

    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(", ");
      toast.error(errors);
      return;
    }

    const fileList = files.length > 0 ? { length: files.length, item: (i: number) => files[i] } as FileList : null;
    const fileValidation = validateFiles(fileList);
    if (!fileValidation.valid) {
      toast.error(fileValidation.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: complaint, error: complaintError } = await supabase
        .from("complaints")
        .insert({
          title: title.trim(),
          description: description.trim(),
          category: category,
          priority: priority,
          is_anonymous: isAnonymous,
          student_id: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (complaintError) throw complaintError;

      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${complaint.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("complaint-attachments")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          await supabase.from("complaint_attachments").insert({
            complaint_id: complaint.id,
            file_name: file.name,
            file_url: fileName,
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
    <AppLayout title="Submit Complaint" subtitle="Tell us about your concern and we'll help resolve it">
      <div className="max-w-3xl mx-auto">
        {/* Mobile Title */}
        <div className="md:hidden mb-6">
          <h1 className="text-2xl font-bold tracking-tight">New Complaint</h1>
          <p className="text-muted-foreground text-sm mt-1">Submit your concern</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title & Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Basic Information
              </CardTitle>
              <CardDescription>Provide a clear title and select the appropriate category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of your complaint (e.g., 'AC not working in Room 301')"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">{title.length}/200 characters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={(value: any) => setCategory(value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryInfo).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span>{info.icon}</span>
                            <span className="capitalize">{key}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{categoryInfo[category].description}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          Low - Can wait
                        </span>
                      </SelectItem>
                      <SelectItem value="medium">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-yellow-500" />
                          Medium - Needs attention
                        </span>
                      </SelectItem>
                      <SelectItem value="high">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          High - Urgent
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Details
              </CardTitle>
              <CardDescription>Describe your issue in detail to help us understand and resolve it faster</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide:&#10;• What happened?&#10;• When did it happen?&#10;• Where did it occur?&#10;• Any other relevant details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={8}
                  maxLength={2000}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{description.length}/2000 characters</p>
              </div>

              {/* Anonymous Option */}
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50 border border-border">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor="anonymous" className="font-medium cursor-pointer">
                    Submit anonymously
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Your identity will be hidden from the administrators
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-primary" />
                Attachments
              </CardTitle>
              <CardDescription>Add photos or documents to support your complaint (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  "hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                )}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload files</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images, PDF, Word documents (max 5 files, 10MB each)
                </p>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex flex-col-reverse md:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/student")}
              className="md:flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="md:flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Complaint"}
            </Button>
          </div>
        </form>
      </div>

      <Chatbot />
    </AppLayout>
  );
};

export default NewComplaint;
