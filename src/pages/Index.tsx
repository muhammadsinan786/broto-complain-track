import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (userRole === "admin") {
        navigate("/admin");
      } else {
        navigate("/student");
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="text-center space-y-6 px-4">
        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            Brototype Complaints
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Student complaint management system for efficient issue tracking and resolution
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="w-full sm:w-auto min-w-[200px]"
          >
            Get Started
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="font-semibold text-lg mb-2">Submit Complaints</h3>
            <p className="text-sm text-muted-foreground">
              Easily raise and track your concerns with file attachments
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="font-semibold text-lg mb-2">Real-time Updates</h3>
            <p className="text-sm text-muted-foreground">
              Get notified when admins update your complaint status
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg border">
            <h3 className="font-semibold text-lg mb-2">Admin Support</h3>
            <p className="text-sm text-muted-foreground">
              Direct communication with admins for quick resolutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
