import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationBell } from "@/components/NotificationBell";
import { ComplaintCard } from "@/components/ComplaintCard";
import { ComplaintCardSkeleton } from "@/components/ComplaintCardSkeleton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { DesktopHeader } from "@/components/DesktopHeader";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: "academic" | "infrastructure" | "technical" | "administrative" | "other";
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchComplaints();
  }, [user, navigate]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("student_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <DesktopHeader />
      <div className="container mx-auto p-4 md:p-6 max-w-7xl pb-20 md:pb-6">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Student Dashboard</h1>
            <p className="text-muted-foreground">Track and manage your complaints</p>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <NotificationBell />
            <Button onClick={() => navigate("/student/new")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              New
            </Button>
          </div>
        </div>

        <div className="hidden md:flex justify-end gap-2 mb-6">
          <Button onClick={() => navigate("/student/new")} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Complaint
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4">
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
          </div>
        ) : complaints.length === 0 ? (
          <Card className="animate-scale-in">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No complaints submitted yet</p>
              <Button onClick={() => navigate("/student/new")}>
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Complaint
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {complaints.map((complaint, index) => (
              <div key={complaint.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <ComplaintCard
                  complaint={complaint}
                  userId={user?.id!}
                  onView={(id) => navigate(`/student/complaint/${id}`)}
                  onEdit={(id) => navigate(`/student/complaint/${id}/edit`)}
                  onDelete={fetchComplaints}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default StudentDashboard;
