import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: "academic" | "infrastructure" | "technical" | "administrative" | "other";
  status: "pending" | "in_progress" | "resolved";
  created_at: string;
}

const StudentDashboard = () => {
  const { user, signOut } = useAuth();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">My Complaints</h1>
            <p className="text-muted-foreground mt-2">Track and manage your submitted complaints</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => navigate("/student/new")} size="lg" className="flex-1 md:flex-none">
              <Plus className="mr-2 h-5 w-5" />
              New Complaint
            </Button>
            <Button onClick={signOut} variant="outline" size="lg">
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>

        {complaints.length === 0 ? (
          <Card>
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
            {complaints.map((complaint) => (
              <Card
                key={complaint.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/student/complaint/${complaint.id}`)}
              >
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{complaint.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
                          {complaint.category}
                        </span>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {complaint.description}
                      </CardDescription>
                    </div>
                    <StatusBadge status={complaint.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Submitted {new Date(complaint.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
