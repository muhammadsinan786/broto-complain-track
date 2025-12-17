import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const AppLayout = ({ children, title, subtitle, actions }: AppLayoutProps) => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Mobile Header */}
      <MobileHeader title={title} />
      
      {/* Main Content */}
      <main 
        className={cn(
          "transition-all duration-300 ease-in-out",
          "pt-0 md:pt-0",
          "pb-20 md:pb-0",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        <div className="container mx-auto px-4 py-6 md:px-6 md:py-8 max-w-7xl">
          {/* Page Header */}
          {(title || actions) && (
            <div className="hidden md:flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                {title && (
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-muted-foreground mt-1">{subtitle}</p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          )}
          
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};
