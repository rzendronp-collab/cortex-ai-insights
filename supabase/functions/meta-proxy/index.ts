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

    // Parse request
    const { path, params, method: reqMethod } = await req.json();
    if (!path) {
      return new Response(JSON.stringify({ error: "path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get access token from meta_connections
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: connection, error: connError } = await supabaseAdmin
      .from("meta_connections")
      .select("access_token, token_expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (connError || !connection?.access_token) {
      return new Response(
        JSON.stringify({ error: "Meta not connected. Please connect your Meta account first." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check token expiry
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({ error: "Meta token expired. Please reconnect your Meta account." }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const graphMethod = (reqMethod || 'GET').toUpperCase();
    let graphRes: Response;

    if (graphMethod === 'POST') {
      // POST: send params as form body
      const graphUrl = `https://graph.facebook.com/v19.0/${path}`;
      const body = new URLSearchParams();
      const p = params || {};
      for (const [key, value] of Object.entries(p)) {
        body.set(key, String(value));
      }
      body.set('access_token', connection.access_token);
      graphRes = await fetch(graphUrl, { method: 'POST', body });
    } else {
      // GET: send params as query string
      const p = params || {};
      const parts: string[] = [];
      for (const [key, value] of Object.entries(p)) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
      parts.push(`access_token=${encodeURIComponent(connection.access_token)}`);
      const graphUrl = `https://graph.facebook.com/v19.0/${path}?${parts.join('&')}`;
      graphRes = await fetch(graphUrl);
    }

    // Call Meta Graph API
    const graphData = await graphRes.json();

    if (!graphRes.ok) {
      console.error("Graph API error:", graphData);
      return new Response(JSON.stringify({ error: graphData.error?.message || "Graph API error" }), {
        status: graphRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(graphData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meta proxy error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
