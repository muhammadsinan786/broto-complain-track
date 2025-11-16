import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ComplaintCardProps {
  complaint: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: "pending" | "in_progress" | "resolved";
    priority: "low" | "medium" | "high";
    updated_at: string;
  };
  userId: string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: () => void;
}

export const ComplaintCard = ({ complaint, userId, onView, onEdit, onDelete }: ComplaintCardProps) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {complaint.title}
          </h3>
          <div className="flex gap-2 shrink-0">
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {complaint.description}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated {formatDistanceToNow(new Date(complaint.updated_at), { addSuffix: true })}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(complaint.id)}
          className="flex-1 min-w-[80px]"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(complaint.id)}
          className="flex-1 min-w-[80px]"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
};
