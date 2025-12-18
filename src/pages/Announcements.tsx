import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Download } from "lucide-react";
import { FormattedText } from "@/components/FormattedText";
import Chatbot from "@/components/chatbot/Chatbot";
import { AppLayout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

interface Announcement {
  id: string;
  title: string;
  message: string;
  attachment_url: string | null;
  expiry_date: string | null;
  created_at: string;
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();

    // Subscribe to new announcements
    const channel = supabase
      .channel("announcements")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "announcements",
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .or(`expiry_date.is.null,expiry_date.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching announcements:", error);
      return;
    }

    setAnnouncements(data || []);
    setLoading(false);
  };

  return (
    <AppLayout title="Announcements" subtitle="Important updates and notices">
      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Megaphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xl font-semibold mb-2">No announcements</p>
              <p className="text-muted-foreground">Check back later for updates</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Megaphone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Posted on {new Date(announcement.created_at).toLocaleDateString()}
                      {announcement.expiry_date && (
                        <> • Expires on {new Date(announcement.expiry_date).toLocaleDateString()}</>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                  <FormattedText text={announcement.message} />
                </div>
                {announcement.attachment_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(announcement.attachment_url!, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Attachment
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <Chatbot />
    </AppLayout>
  );
}
