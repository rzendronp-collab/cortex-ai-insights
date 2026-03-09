import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Parse request body
    const { messages, system, max_tokens } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Read Claude API key from DB server-side
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("claude_api_key")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.claude_api_key) {
      return new Response(
        JSON.stringify({
          error: "Claude API key not configured. Go to Config in the sidebar to add your key.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Claude API
    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": profile.claude_api_key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: max_tokens || 2048,
          system:
            system ||
            "Você é o assistente CortexAds, especialista em Meta Ads. Responda em português do Brasil de forma concisa e prática.",
          messages,
        }),
      }
    );

    if (!claudeResponse.ok) {
      const errorBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errorBody);
      const isAuthError = claudeResponse.status === 401 || claudeResponse.status === 403;
      return new Response(
        JSON.stringify({
          error: isAuthError
            ? "Claude API Key inválida — verifique em Config"
            : `Claude API error: ${claudeResponse.status}`,
          code: isAuthError ? 'INVALID_API_KEY' : 'API_ERROR',
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const claudeData = await claudeResponse.json();
    const assistantMessage =
      claudeData.content?.[0]?.text || "Sem resposta da IA.";

    return new Response(
      JSON.stringify({ content: assistantMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
