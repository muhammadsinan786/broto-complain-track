import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Megaphone, Download } from "lucide-react";
import { FormattedText } from "@/components/FormattedText";

interface Announcement {
  id: string;
  title: string;
  message: string;
  attachment_url: string | null;
  expiry_date: string | null;
  created_at: string;
}

export default function Announcements() {
  const navigate = useNavigate();
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Announcements</h1>
            <p className="text-muted-foreground text-sm md:text-base">Important updates and notices</p>
          </div>
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Megaphone className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">No announcements</p>
              <p className="text-muted-foreground">Check back later for updates</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    {announcement.title}
                  </CardTitle>
                  <CardDescription>
                    Posted on {new Date(announcement.created_at).toLocaleDateString()}
                    {announcement.expiry_date && (
                      <> • Expires on {new Date(announcement.expiry_date).toLocaleDateString()}</>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap mb-4">
                    <FormattedText text={announcement.message} />
                  </p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
