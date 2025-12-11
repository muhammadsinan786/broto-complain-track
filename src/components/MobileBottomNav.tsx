import { Home, FileText, Bell, User, BarChart3, LayoutDashboard } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();

  const studentNavItems = [
    { icon: Home, label: "Home", path: "/student" },
    { icon: BarChart3, label: "Polls", path: "/polls" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const adminNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: BarChart3, label: "Polls", path: "/polls-management" },
    { icon: Bell, label: "Announce", path: "/announcement-management" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const navItems = userRole === "admin" ? adminNavItems : studentNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors duration-200 min-w-[60px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform duration-200",
                isActive && "scale-110"
              )} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
