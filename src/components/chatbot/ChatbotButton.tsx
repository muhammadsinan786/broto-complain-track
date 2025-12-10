import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatbotButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

const ChatbotButton = ({ isOpen, onClick }: ChatbotButtonProps) => {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 rounded-full w-14 h-14 p-0 shadow-lg transition-all duration-300 hover:scale-110",
        "bg-primary hover:bg-primary/90",
        isOpen && "rotate-90"
      )}
      aria-label={isOpen ? "Close chat" : "Open chat assistant"}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </Button>
  );
};

export default ChatbotButton;
