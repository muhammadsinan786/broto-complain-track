import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplaintCard } from "@/components/ComplaintCard";
import { ComplaintCardSkeleton } from "@/components/ComplaintCardSkeleton";
import { AppLayout } from "@/components/layout";
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import Chatbot from "@/components/chatbot/Chatbot";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchComplaints();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = complaints;
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query)
      );
    }
    
    setFilteredComplaints(filtered);
  }, [complaints, statusFilter, searchQuery]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("student_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
      setFilteredComplaints(data || []);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "pending").length,
    inProgress: complaints.filter((c) => c.status === "in_progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  const StatCard = ({ 
    label, 
    value, 
    icon: Icon, 
    color 
  }: { 
    label: string; 
    value: number; 
    icon: typeof FileText; 
    color: string;
  }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn("p-2 rounded-lg", color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout 
      title="My Complaints" 
      subtitle="Track and manage your submitted complaints"
      actions={
        <Button onClick={() => navigate("/student/new")} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          New Complaint
        </Button>
      }
    >
      {/* Mobile Title */}
      <div className="md:hidden mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Complaints</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your submitted complaints</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="Total" value={stats.total} icon={FileText} color="bg-primary" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="bg-status-pending" />
        <StatCard label="In Progress" value={stats.inProgress} icon={AlertCircle} color="bg-status-in-progress" />
        <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle} color="bg-status-resolved" />
      </div>

      {/* Mobile New Complaint Button */}
      <div className="md:hidden mb-4">
        <Button onClick={() => navigate("/student/new")} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Submit New Complaint
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search complaints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
          <TabsList className="w-full md:w-auto grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs md:text-sm">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs md:text-sm">Pending</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs md:text-sm">Active</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs md:text-sm">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="grid gap-4">
          <ComplaintCardSkeleton />
          <ComplaintCardSkeleton />
          <ComplaintCardSkeleton />
        </div>
      ) : filteredComplaints.length === 0 ? (
        <Card className="animate-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {complaints.length === 0 ? "No complaints yet" : "No matching complaints"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {complaints.length === 0 
                ? "Start by submitting your first complaint. We're here to help!"
                : "Try adjusting your search or filter to find what you're looking for."}
            </p>
            {complaints.length === 0 && (
              <Button onClick={() => navigate("/student/new")} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Complaint
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredComplaints.map((complaint, index) => (
            <div 
              key={complaint.id} 
              className="animate-fade-in" 
              style={{ animationDelay: `${index * 0.05}s` }}
            >
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

      <Chatbot />
    </AppLayout>
  );
};

export default StudentDashboard;
