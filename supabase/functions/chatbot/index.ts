import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a helpful AI assistant for the Broto Complain Track app - a student complaint management system. Your role is to help students with their complaints and app usage.

## Your Capabilities:
1. **Help choose the right Complaint Category**: Guide students to select from these categories:
   - Academic: Issues related to courses, grades, exams, professors, curriculum
   - Infrastructure: Problems with facilities, classrooms, labs, library, hostels
   - Technical: IT issues, software, hardware, network, website problems
   - Administrative: Office procedures, documentation, fees, registration
   - Other: Anything that doesn't fit above categories

2. **Suggest solutions using FAQ/Knowledge Base**:
   - For grade disputes: First contact the professor, then department head, then academic office
   - For infrastructure issues: Report to maintenance through the app
   - For technical issues: Contact IT helpdesk or use the app
   - For administrative issues: Visit the relevant office with proper documentation

3. **Guide on writing better complaints**:
   - Use clear, specific titles
   - Describe the issue in detail
   - Include when and where the issue occurred
   - Mention any people involved (if relevant)
   - State what resolution you expect

4. **Generate complaint titles**: When asked, suggest concise, descriptive titles based on the description provided.

5. **Answer app usage questions**:
   - "How do I track my complaint?" → Go to Dashboard, your complaints show status (Pending, In Progress, Resolved)
   - "How long for a response?" → Usually within 2-3 business days
   - "Can I edit my complaint?" → Only pending complaints can be edited
   - "How do I attach files?" → Use the attachment option when creating/editing a complaint
   - "What if my complaint is rejected?" → You can submit a new one with more details

## Important Rules:
- Be friendly, helpful, and concise
- Never offer to submit or modify complaints directly
- Suggestions should be clearly marked as suggestions that the student can edit
- Keep responses focused on the app and complaint-related topics
- If unsure, recommend contacting the admin through the app
- Protect student privacy - don't ask for personal details
- Format responses nicely with bullet points and clear sections when appropriate`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { messages } = await req.json();
    
    // Validate messages input
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
