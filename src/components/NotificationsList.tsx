import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
}

export const NotificationsList = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user?.id)
        .eq("is_read", false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark notifications as read");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "complaint":
        return <Bell className="h-5 w-5" />;
      case "message":
        return <MessageSquare className="h-5 w-5" />;
      case "status_update":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const groupNotifications = () => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const thisWeek: Notification[] = [];
    const older: Notification[] = [];

    notifications.forEach(notification => {
      const date = new Date(notification.created_at);
      if (isToday(date)) {
        today.push(notification);
      } else if (isYesterday(date)) {
        yesterday.push(notification);
      } else if (date >= startOfWeek(new Date())) {
        thisWeek.push(notification);
      } else {
        older.push(notification);
      }
    });

    return { today, yesterday, thisWeek, older };
  };

  const grouped = groupNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" size="sm">
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.today.length > 0 && (
            <NotificationGroup
              title="Today"
              notifications={grouped.today}
              onMarkAsRead={markAsRead}
              getIcon={getNotificationIcon}
            />
          )}
          {grouped.yesterday.length > 0 && (
            <NotificationGroup
              title="Yesterday"
              notifications={grouped.yesterday}
              onMarkAsRead={markAsRead}
              getIcon={getNotificationIcon}
            />
          )}
          {grouped.thisWeek.length > 0 && (
            <NotificationGroup
              title="This Week"
              notifications={grouped.thisWeek}
              onMarkAsRead={markAsRead}
              getIcon={getNotificationIcon}
            />
          )}
          {grouped.older.length > 0 && (
            <NotificationGroup
              title="Older"
              notifications={grouped.older}
              onMarkAsRead={markAsRead}
              getIcon={getNotificationIcon}
            />
          )}
        </div>
      )}
    </div>
  );
};

interface NotificationGroupProps {
  title: string;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  getIcon: (type: string) => React.ReactNode;
}

const NotificationGroup = ({ title, notifications, onMarkAsRead, getIcon }: NotificationGroupProps) => (
  <div>
    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h3>
    <div className="space-y-2">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={cn(
            "transition-all duration-200 cursor-pointer hover:shadow-md",
            !notification.is_read && "bg-primary/5 border-primary/20"
          )}
          onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
        >
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className={cn(
                "flex items-center justify-center rounded-full w-10 h-10 shrink-0",
                notification.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
              )}>
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-medium mb-1",
                  !notification.is_read && "font-semibold"
                )}>
                  {notification.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
              {!notification.is_read && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);
