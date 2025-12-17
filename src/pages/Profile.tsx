import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/layout";
import { Trash2, Save, Sun, Moon, Monitor, Calendar, Star, CheckCircle, FileText, User, Lock, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Chatbot from "@/components/chatbot/Chatbot";
import { cn } from "@/lib/utils";

const Profile = () => {
  const { user, signOut, userRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [stats, setStats] = useState({ total: 0, resolved: 0, avgRating: 0, joinedDate: "" });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        
        const { data: complaints } = await supabase
          .from("complaints")
          .select("status, rating, created_at")
          .eq("student_id", user?.id);

        if (complaints) {
          const resolved = complaints.filter(c => c.status === "resolved").length;
          const ratings = complaints.filter(c => c.rating).map(c => c.rating!);
          const avgRating = ratings.length > 0 
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
            : 0;

          setStats({
            total: complaints.length,
            resolved,
            avgRating,
            joinedDate: data.created_at,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", user?.id);

      if (profileError) throw profileError;

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("Passwords do not match");
          setSaving(false);
          return;
        }

        if (newPassword.length < 8) {
          toast.error("Password must be at least 8 characters");
          setSaving(false);
          return;
        }

        if (!currentPassword) {
          toast.error("Please enter your current password to change it");
          setSaving(false);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: currentPassword,
        });

        if (signInError) {
          toast.error("Current password is incorrect");
          setSaving(false);
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) throw passwordError;
        
        toast.success("Profile and password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
        setCurrentPassword("");
      } else {
        toast.success("Profile updated successfully!");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.error("Please enter your password to confirm deletion");
      return;
    }

    if (userRole === "admin") {
      toast.error("Admin accounts cannot be deleted from user side");
      return;
    }

    setDeleting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: deletePassword,
      });

      if (signInError) {
        toast.error("Invalid password");
        setDeleting(false);
        return;
      }

      const { error: complaintsError } = await supabase
        .from("complaints")
        .delete()
        .eq("student_id", user?.id);

      if (complaintsError) throw complaintsError;

      await supabase.from("audit_logs").insert({
        user_id: user?.id!,
        action: "account_deleted",
        entity_type: "user",
        entity_id: user?.id!,
        details: { reason: "user_requested" }
      });

      toast.success("Account deleted successfully. Goodbye!");
      
      setTimeout(() => {
        signOut();
        navigate("/");
      }, 2000);
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Profile">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading profile...</div>
        </div>
      </AppLayout>
    );
  }

  const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof FileText; color: string }) => (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
      <div className={cn("p-2.5 rounded-lg", color)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <AppLayout title="Profile" subtitle="Manage your account settings and preferences">
      {/* Mobile Title */}
      <div className="md:hidden mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Account settings</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Complaints" value={stats.total} icon={FileText} color="bg-primary" />
              <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle} color="bg-status-resolved" />
              <StatCard label="Avg Rating" value={stats.avgRating.toFixed(1)} icon={Star} color="bg-status-pending" />
              <StatCard 
                label="Member Since" 
                value={stats.joinedDate ? formatDistanceToNow(new Date(stats.joinedDate), { addSuffix: false }) : "N/A"} 
                icon={Calendar} 
                color="bg-status-in-progress" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="pl-10 bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Your phone number"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Theme Preference */}
              <div className="space-y-4">
                <h3 className="font-medium">Theme Preference</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light", icon: Sun, label: "Light" },
                    { value: "dark", icon: Moon, label: "Dark" },
                    { value: "system", icon: Monitor, label: "System" },
                  ].map(({ value, icon: Icon, label }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={theme === value ? "default" : "outline"}
                      onClick={() => setTheme(value as any)}
                      className="flex flex-col gap-2 h-auto py-4"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Password Change */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Change Password
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {userRole !== "admin" && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>
                          This action cannot be undone. This will permanently delete your account and remove all your complaints and data from our servers.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="deletePassword">Enter your password to confirm</Label>
                          <Input
                            id="deletePassword"
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Your password"
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletePassword("")}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? "Deleting..." : "Delete Account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>

      <Chatbot />
    </AppLayout>
  );
};

export default Profile;
