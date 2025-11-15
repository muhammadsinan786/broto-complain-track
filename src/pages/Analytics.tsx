import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, Clock, Star, TrendingUp } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Stats {
  totalComplaints: number;
  averageResolutionTime: number;
  averageRating: number;
  categoryData: Array<{ name: string; value: number }>;
  monthlyData: Array<{ month: string; complaints: number }>;
  statusData: Array<{ name: string; value: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function Analytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalComplaints: 0,
    averageResolutionTime: 0,
    averageRating: 0,
    categoryData: [],
    monthlyData: [],
    statusData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
    fetchAnalytics();
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      navigate("/");
    }
  };

  const fetchAnalytics = async () => {
    const { data: complaints, error } = await supabase
      .from("complaints")
      .select("*");

    if (error) {
      console.error("Error fetching analytics:", error);
      setLoading(false);
      return;
    }

    // Calculate stats
    const total = complaints?.length || 0;
    
    // Average resolution time (in days)
    const resolvedComplaints = complaints?.filter(c => c.status === "resolved") || [];
    const avgResolution = resolvedComplaints.length > 0
      ? resolvedComplaints.reduce((acc, c) => {
          const created = new Date(c.created_at);
          const updated = new Date(c.updated_at);
          const days = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return acc + days;
        }, 0) / resolvedComplaints.length
      : 0;

    // Average rating
    const ratedComplaints = complaints?.filter(c => c.rating) || [];
    const avgRating = ratedComplaints.length > 0
      ? ratedComplaints.reduce((acc, c) => acc + (c.rating || 0), 0) / ratedComplaints.length
      : 0;

    // Category breakdown
    const categoryMap = new Map<string, number>();
    complaints?.forEach(c => {
      categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1);
    });
    const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

    // Monthly trends (last 6 months)
    const monthlyMap = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyMap.set(monthKey, 0);
    }
    
    complaints?.forEach(c => {
      const date = new Date(c.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, monthlyMap.get(monthKey)! + 1);
      }
    });
    const monthlyData = Array.from(monthlyMap.entries()).map(([month, complaints]) => ({ month, complaints }));

    // Status breakdown
    const statusMap = new Map<string, number>();
    complaints?.forEach(c => {
      statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1);
    });
    const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

    setStats({
      totalComplaints: total,
      averageResolutionTime: avgResolution,
      averageRating: avgRating,
      categoryData,
      monthlyData,
      statusData,
    });
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Complaint trends and performance metrics</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalComplaints}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageResolutionTime.toFixed(1)} days</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)} / 5</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((stats.statusData.find(s => s.name === "resolved")?.value || 0) / stats.totalComplaints * 100).toFixed(0)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Complaint Trends</CardTitle>
              <CardDescription>Complaints submitted per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="complaints" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Complaints by Category</CardTitle>
              <CardDescription>Distribution across categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {stats.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Complaints by Status</CardTitle>
              <CardDescription>Current status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
