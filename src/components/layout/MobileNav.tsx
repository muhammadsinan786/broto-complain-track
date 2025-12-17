import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Home,
  PlusCircle,
  Megaphone,
  Vote,
  User,
  LineChart,
  ClipboardList,
} from "lucide-react";

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
}

export const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();

  const studentNavItems: NavItem[] = [
    { icon: Home, label: "Home", path: "/student" },
    { icon: PlusCircle, label: "New", path: "/student/new" },
    { icon: Vote, label: "Polls", path: "/polls" },
    { icon: Megaphone, label: "News", path: "/announcements" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const adminNavItems: NavItem[] = [
    { icon: Home, label: "Home", path: "/admin" },
    { icon: LineChart, label: "Analytics", path: "/analytics" },
    { icon: Vote, label: "Polls", path: "/polls-management" },
    { icon: Megaphone, label: "News", path: "/announcement-management" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const navItems = userRole === "admin" ? adminNavItems : studentNavItems;

  const isActive = (path: string) => {
    if (path === "/student" || path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-2 safe-area-pb">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px]",
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground active:bg-muted/50"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  active && "scale-110"
                )}
              />
              <span className={cn(
                "text-[10px] font-medium",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
