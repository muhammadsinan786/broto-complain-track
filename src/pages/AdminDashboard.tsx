import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, TrendingUp, Clock, CheckCircle, AlertCircle, User, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: "academic" | "infrastructure" | "technical" | "administrative" | "other";
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "resolved";
  is_anonymous: boolean;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  byCategory: Record<string, number>;
  avgRating: number;
}

const AdminDashboard = () => {
  const { user, signOut, userRole } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
    byCategory: {},
    avgRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || userRole !== "admin") {
      navigate("/auth");
      return;
    }
    fetchComplaints();
  }, [user, userRole, navigate]);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredComplaints(complaints);
    } else {
      setFilteredComplaints(
        complaints.filter((c) => c.status === statusFilter)
      );
    }
  }, [statusFilter, complaints]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles for all complaints
      const complaintsWithProfiles = await Promise.all(
        (data || []).map(async (complaint) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", complaint.student_id)
            .single();
          
          return {
            ...complaint,
            profiles: profileData || { name: "Unknown", email: "" },
          };
        })
      );
      
      setComplaints(complaintsWithProfiles);
      setFilteredComplaints(complaintsWithProfiles);
      
      // Calculate statistics
      const totalComplaints = complaintsWithProfiles.length;
      const pending = complaintsWithProfiles.filter(c => c.status === "pending").length;
      const inProgress = complaintsWithProfiles.filter(c => c.status === "in_progress").length;
      const resolved = complaintsWithProfiles.filter(c => c.status === "resolved").length;
      
      const byCategory = complaintsWithProfiles.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Calculate average rating
      const { data: ratingsData } = await supabase
        .from("complaints")
        .select("rating")
        .not("rating", "is", null);
      
      const avgRating = ratingsData && ratingsData.length > 0
        ? ratingsData.reduce((sum, c) => sum + (c.rating || 0), 0) / ratingsData.length
        : 0;
      
      setStats({
        total: totalComplaints,
        pending,
        in_progress: inProgress,
        resolved,
        byCategory,
        avgRating,
      });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage and respond to student complaints</p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <NotificationBell />
            <Button onClick={() => navigate("/analytics")} variant="outline" size="lg">
              Analytics
            </Button>
            <Button onClick={() => navigate("/feedback-management")} variant="outline" size="lg">
              Feedback
            </Button>
            <Button onClick={() => navigate("/announcement-management")} variant="outline" size="lg">
              Announcements
            </Button>
            <Button onClick={() => navigate("/polls-management")} variant="outline" size="lg">
              <BarChart3 className="mr-2 h-5 w-5" />
              Polls
            </Button>
            <Button onClick={() => navigate("/profile")} variant="outline" size="lg">
              <User className="mr-2 h-5 w-5" />
              Profile
            </Button>
            <Button onClick={signOut} variant="outline" size="lg">
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Complaints</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.in_progress}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredComplaints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No complaints found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredComplaints.map((complaint) => (
              <Card
                key={complaint.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/admin/complaint/${complaint.id}`)}
              >
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{complaint.title}</CardTitle>
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
                      <CardDescription className="line-clamp-2 mb-2">
                        {complaint.description}
                      </CardDescription>
                      {!complaint.is_anonymous && (
                        <p className="text-sm text-muted-foreground">
                          Student: {complaint.profiles.name} ({complaint.profiles.email})
                        </p>
                      )}
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

export default AdminDashboard;
