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
      // Soft delete the complaint
      const { error: updateError } = await supabase
        .from("complaints")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
        })
        .eq("id", complaintId);

      if (updateError) throw updateError;

      // Log the deletion
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "complaint_deleted",
        entity_type: "complaint",
        entity_id: complaintId,
        details: { reason: "user_requested" }
      });

      toast.success("Complaint moved to trash");
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
            This will move your complaint to trash. This action cannot be undone. The complaint will be permanently removed after 30 days.
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
