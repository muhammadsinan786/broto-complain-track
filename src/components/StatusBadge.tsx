import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "pending" | "in_progress" | "resolved";
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusConfig = {
    pending: {
      label: "Pending",
      className: "bg-status-pending text-white",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-status-in-progress text-white",
    },
    resolved: {
      label: "Resolved",
      className: "bg-status-resolved text-white",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
};
