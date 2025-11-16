import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, FileText, BarChart3, MessageSquare, Bell, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";

export const DesktopHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, signOut } = useAuth();

  const studentNavItems = [
    { icon: Home, label: "Dashboard", path: "/student" },
    { icon: FileText, label: "New Complaint", path: "/student/new" },
    { icon: MessageSquare, label: "Feedback", path: "/feedback" },
    { icon: Bell, label: "Announcements", path: "/announcements" },
  ];

  const adminNavItems = [
    { icon: Home, label: "Dashboard", path: "/admin" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: MessageSquare, label: "Feedback", path: "/feedback-management" },
    { icon: Bell, label: "Announcements", path: "/announcement-management" },
  ];

  const navItems = userRole === "admin" ? adminNavItems : studentNavItems;

  return (
    <header className="hidden md:block sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-primary">Broto Complain Track</h1>
          
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "transition-all duration-200",
                    isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profile")}
            className={cn(
              "transition-colors duration-200",
              location.pathname === "/profile" && "bg-primary/10 text-primary"
            )}
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};
