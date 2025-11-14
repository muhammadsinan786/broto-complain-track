import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Badge } from "@/components/ui/badge";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: "academic" | "technical" | "administrative" | "infrastructure" | "other";
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "resolved";
  deleted_at: string;
  deleted_by: string;
  created_at: string;
  student_id: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export default function Trash() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUserRole();
    fetchDeletedComplaints();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const admin = roles?.some(r => r.role === "admin") || false;
    setIsAdmin(admin);
  };

  const fetchDeletedComplaints = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const admin = roles?.some(r => r.role === "admin") || false;

    // Fetch deleted complaints
    let query = supabase
      .from("complaints")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    
    if (!admin) {
      query = query.eq("student_id", user.id);
    }

    const { data: complaintsData, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch deleted complaints",
        variant: "destructive",
      });
      console.error(error);
      return;
    }

    // Fetch profiles separately for admin view
    if (admin && complaintsData && complaintsData.length > 0) {
      const studentIds = complaintsData.map(c => c.student_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", studentIds);

      const complaintsWithProfiles = complaintsData.map(complaint => ({
        ...complaint,
        profiles: profilesData?.find(p => p.id === complaint.student_id),
      }));

      setComplaints(complaintsWithProfiles);
    } else {
      setComplaints(complaintsData || []);
    }

    setLoading(false);
  };

  const handleRestore = async (complaintId: string) => {
    const { error } = await supabase
      .from("complaints")
      .update({ deleted_at: null, deleted_by: null })
      .eq("id", complaintId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to restore complaint",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Complaint restored successfully",
    });

    fetchDeletedComplaints();
  };

  const handlePermanentDelete = async (complaintId: string) => {
    const { error } = await supabase
      .from("complaints")
      .delete()
      .eq("id", complaintId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to permanently delete complaint",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Complaint permanently deleted",
    });

    fetchDeletedComplaints();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Trash</h1>
              <p className="text-muted-foreground">
                Deleted complaints can be restored or permanently removed
              </p>
            </div>
          </div>
        </div>

        {complaints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Trash2 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">Trash is empty</p>
              <p className="text-muted-foreground">
                No deleted complaints found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {complaints.map((complaint) => (
              <Card key={complaint.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{complaint.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {complaint.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(complaint.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Forever
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently Delete Complaint?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the complaint and all related data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handlePermanentDelete(complaint.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Forever
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Category:</span>
                      <Badge variant="outline">{complaint.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Priority:</span>
                      <PriorityBadge priority={complaint.priority} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status:</span>
                      <StatusBadge status={complaint.status} />
                    </div>
                    {isAdmin && complaint.profiles && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Student:</span>
                        <span>{complaint.profiles.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Deleted on:</span>
                      <span>{new Date(complaint.deleted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
