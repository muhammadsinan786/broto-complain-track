import { Badge } from "@/components/ui/badge";

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high";
}

export const PriorityBadge = ({ priority }: PriorityBadgeProps) => {
  const styles = {
    low: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    high: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  };

  return (
    <Badge variant="outline" className={styles[priority]}>
      {priority.toUpperCase()}
    </Badge>
  );
};
