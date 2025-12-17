import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout";
import { TrendingUp, Clock, CheckCircle, AlertCircle, Search, FileText, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Chatbot from "@/components/chatbot/Chatbot";

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
  const { user, userRole } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
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
    let filtered = complaints;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    
    if (categoryFilter !== "all") {
      filtered = filtered.filter((c) => c.category === categoryFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.profiles?.name?.toLowerCase().includes(query) ||
          c.profiles?.email?.toLowerCase().includes(query)
      );
    }
    
    setFilteredComplaints(filtered);
  }, [statusFilter, categoryFilter, searchQuery, complaints]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const complaintsWithProfiles = await Promise.all(
        (data || []).map(async (complaint) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", complaint.student_id)
            .maybeSingle();
          
          return {
            ...complaint,
            profiles: profileData || { name: "Unknown", email: "" },
          };
        })
      );
      
      setComplaints(complaintsWithProfiles);
      setFilteredComplaints(complaintsWithProfiles);
      
      const totalComplaints = complaintsWithProfiles.length;
      const pending = complaintsWithProfiles.filter(c => c.status === "pending").length;
      const inProgress = complaintsWithProfiles.filter(c => c.status === "in_progress").length;
      const resolved = complaintsWithProfiles.filter(c => c.status === "resolved").length;
      
      const byCategory = complaintsWithProfiles.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
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
      <AppLayout title="Admin Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
        </div>
      </AppLayout>
    );
  }

  const StatCard = ({ 
    label, 
    value, 
    icon: Icon, 
    color,
    subtext 
  }: { 
    label: string; 
    value: number | string; 
    icon: typeof TrendingUp; 
    color: string;
    subtext?: string;
  }) => (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
          </div>
          <div className={cn("p-3 rounded-xl", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout 
      title="Admin Dashboard" 
      subtitle="Manage and respond to student complaints"
    >
      {/* Mobile Title */}
      <div className="md:hidden mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage complaints</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard 
          label="Total Complaints" 
          value={stats.total} 
          icon={TrendingUp} 
          color="bg-primary"
        />
        <StatCard 
          label="Pending" 
          value={stats.pending} 
          icon={Clock} 
          color="bg-status-pending"
          subtext="Awaiting review"
        />
        <StatCard 
          label="In Progress" 
          value={stats.in_progress} 
          icon={AlertCircle} 
          color="bg-status-in-progress"
          subtext="Being handled"
        />
        <StatCard 
          label="Resolved" 
          value={stats.resolved} 
          icon={CheckCircle} 
          color="bg-status-resolved"
          subtext="Completed"
        />
        <StatCard 
          label="Avg. Rating" 
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"} 
          icon={Star} 
          color="bg-accent"
          subtext={stats.avgRating > 0 ? "out of 5" : "No ratings yet"}
        />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints List */}
      {filteredComplaints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No complaints found</h3>
            <p className="text-muted-foreground max-w-sm">
              {complaints.length === 0 
                ? "There are no complaints in the system yet."
                : "Try adjusting your filters to find what you're looking for."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredComplaints.map((complaint, index) => (
            <Card
              key={complaint.id}
              className="hover:shadow-md transition-all cursor-pointer animate-fade-in group"
              style={{ animationDelay: `${index * 0.03}s` }}
              onClick={() => navigate(`/admin/complaint/${complaint.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                      {complaint.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">
                        {complaint.category}
                      </span>
                      <PriorityBadge priority={complaint.priority} />
                      {complaint.is_anonymous && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                          Anonymous
                        </span>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {complaint.description}
                    </CardDescription>
                  </div>
                  <StatusBadge status={complaint.status} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-muted-foreground">
                  {!complaint.is_anonymous && (
                    <p>
                      <span className="font-medium">{complaint.profiles.name}</span>
                      <span className="mx-1">·</span>
                      <span>{complaint.profiles.email}</span>
                    </p>
                  )}
                  <p className="md:ml-auto">
                    {new Date(complaint.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Chatbot />
    </AppLayout>
  );
};

export default AdminDashboard;
