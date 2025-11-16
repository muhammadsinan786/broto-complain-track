import { CheckCircle2, Clock, Eye, MessageSquare, CheckCheck } from "lucide-react";
import { format } from "date-fns";

interface TimelineEvent {
  status: "completed" | "active" | "pending";
  label: string;
  date?: string;
  icon: React.ReactNode;
}

interface ComplaintTimelineProps {
  complaint: {
    created_at: string;
    status: "pending" | "in_progress" | "resolved";
    updated_at: string;
  };
  hasAdminViewed: boolean;
  hasAdminReplied: boolean;
}

export const ComplaintTimeline = ({ complaint, hasAdminViewed, hasAdminReplied }: ComplaintTimelineProps) => {
  const events: TimelineEvent[] = [
    {
      status: "completed",
      label: "Complaint Submitted",
      date: complaint.created_at,
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      status: hasAdminViewed ? "completed" : "pending",
      label: "Admin Viewed",
      date: hasAdminViewed ? complaint.updated_at : undefined,
      icon: <Eye className="h-5 w-5" />,
    },
    {
      status: hasAdminReplied ? "completed" : "pending",
      label: "Admin Replied",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      status: complaint.status === "in_progress" || complaint.status === "resolved" ? "completed" : "pending",
      label: "In Progress",
      date: complaint.status !== "pending" ? complaint.updated_at : undefined,
      icon: <Clock className="h-5 w-5" />,
    },
    {
      status: complaint.status === "resolved" ? "completed" : complaint.status === "in_progress" ? "active" : "pending",
      label: "Resolved",
      date: complaint.status === "resolved" ? complaint.updated_at : undefined,
      icon: <CheckCheck className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-full py-6">
      <h3 className="text-lg font-semibold mb-6">Complaint Timeline</h3>
      <div className="relative">
        {events.map((event, index) => (
          <div key={index} className="flex gap-4 pb-8 last:pb-0 relative">
            {/* Timeline line */}
            {index !== events.length - 1 && (
              <div 
                className={`absolute left-[18px] top-[32px] w-0.5 h-full transition-colors duration-300 ${
                  event.status === "completed" ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
            
            {/* Icon */}
            <div 
              className={`relative z-10 flex items-center justify-center rounded-full w-9 h-9 shrink-0 transition-all duration-300 ${
                event.status === "completed" 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : event.status === "active"
                  ? "bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {event.icon}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <p className={`font-medium transition-colors duration-300 ${
                event.status === "completed" ? "text-foreground" : "text-muted-foreground"
              }`}>
                {event.label}
              </p>
              {event.date && (
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(event.date), "MMM dd, yyyy 'at' hh:mm a")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
