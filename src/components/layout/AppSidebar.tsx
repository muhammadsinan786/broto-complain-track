import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Home,
  FileText,
  PlusCircle,
  MessageSquare,
  Bell,
  BarChart3,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Megaphone,
  Vote,
  ClipboardList,
  LineChart,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  icon: typeof Home;
  label: string;
  path: string;
  badge?: number;
}

export const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, signOut, user } = useAuth();

  const studentNavItems: NavItem[] = [
    { icon: Home, label: "Dashboard", path: "/student" },
    { icon: PlusCircle, label: "New Complaint", path: "/student/new" },
    { icon: MessageSquare, label: "App Feedback", path: "/feedback" },
    { icon: Megaphone, label: "Announcements", path: "/announcements" },
    { icon: Vote, label: "Polls & Surveys", path: "/polls" },
  ];

  const adminNavItems: NavItem[] = [
    { icon: Home, label: "Dashboard", path: "/admin" },
    { icon: LineChart, label: "Analytics", path: "/analytics" },
    { icon: ClipboardList, label: "Feedback", path: "/feedback-management" },
    { icon: Megaphone, label: "Announcements", path: "/announcement-management" },
    { icon: Vote, label: "Polls", path: "/polls-management" },
  ];

  const navItems = userRole === "admin" ? adminNavItems : studentNavItems;

  const isActive = (path: string) => {
    if (path === "/student" || path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    const button = (
      <Button
        variant="ghost"
        onClick={() => navigate(item.path)}
        className={cn(
          "w-full justify-start gap-3 h-11 px-3 transition-all duration-200",
          collapsed && "justify-center px-2",
          active
            ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {!collapsed && item.badge && (
          <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </Button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 h-screen border-r border-border bg-card z-40",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Broto Track</span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => (
            <NavButton key={item.path} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-border p-2">
        <NavButton 
          item={{ icon: Bell, label: "Notifications", path: "/notifications" }} 
        />
        <NavButton 
          item={{ icon: User, label: "Profile", path: "/profile" }} 
        />
        
        <Separator className="my-2" />
        
        {/* User Info & Logout */}
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg",
          collapsed && "justify-center"
        )}>
          {!collapsed && (
            <>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
            </>
          )}
        </div>
        
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full justify-start gap-3 h-10 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-border bg-card shadow-sm hover:bg-muted"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
};
