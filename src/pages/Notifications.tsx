import { DesktopHeader } from "@/components/DesktopHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NotificationsList } from "@/components/NotificationsList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Notifications = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DesktopHeader />
      <div className="container mx-auto p-4 md:p-6 max-w-4xl pb-20 md:pb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(userRole === "admin" ? "/admin" : "/student")}
          className="mb-6 md:hidden"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="animate-fade-in">
          <NotificationsList />
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default Notifications;
