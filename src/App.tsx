import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import NewComplaint from "./pages/NewComplaint";
import ComplaintDetail from "./pages/ComplaintDetail";
import EditComplaint from "./pages/EditComplaint";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminComplaintDetail from "./pages/AdminComplaintDetail";
import NotFound from "./pages/NotFound";
import Trash from "./pages/Trash";
import Analytics from "./pages/Analytics";
import Feedback from "./pages/Feedback";
import FeedbackManagement from "./pages/FeedbackManagement";
import Announcements from "./pages/Announcements";
import AnnouncementManagement from "./pages/AnnouncementManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/new" element={<NewComplaint />} />
            <Route path="/student/complaint/:id" element={<ComplaintDetail />} />
            <Route path="/student/complaint/:id/edit" element={<EditComplaint />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/complaint/:id" element={<AdminComplaintDetail />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/feedback-management" element={<FeedbackManagement />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/announcement-management" element={<AnnouncementManagement />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
