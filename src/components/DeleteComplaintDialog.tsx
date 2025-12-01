import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteComplaintDialogProps {
  complaintId: string;
  userId: string;
  onDeleted: () => void;
}

export const DeleteComplaintDialog = ({ complaintId, userId, onDeleted }: DeleteComplaintDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // First get all attachments for this complaint
      const { data: attachments } = await supabase
        .from("complaint_attachments")
        .select("file_url")
        .eq("complaint_id", complaintId);

      // Delete all files from storage
      if (attachments && attachments.length > 0) {
        const filePaths = attachments
          .map(att => att.file_url.split('/').pop())
          .filter((path): path is string => !!path);
        
        if (filePaths.length > 0) {
          await supabase.storage
            .from("complaint-attachments")
            .remove(filePaths);
        }
      }

      // Permanently delete the complaint (CASCADE will delete attachments)
      const { error: deleteError } = await supabase
        .from("complaints")
        .delete()
        .eq("id", complaintId);

      if (deleteError) throw deleteError;

      // Log the deletion
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "complaint_deleted",
        entity_type: "complaint",
        entity_id: complaintId,
        details: { reason: "user_requested" }
      });

      toast.success("Complaint deleted successfully");
      onDeleted();
    } catch (error: any) {
      console.error("Error deleting complaint:", error);
      toast.error(error.message || "Failed to delete complaint");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your complaint. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Complaint"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
