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

    const { path, params, method: reqMethod } = await req.json();
    if (!path) {
      return new Response(JSON.stringify({ error: "path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: connection, error: connError } = await supabaseAdmin
      .from("meta_connections")
      .select("access_token, token_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connError || !connection?.access_token) {
      return new Response(
        JSON.stringify({ error: "Meta not connected." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Meta token expired. Please reconnect." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const graphMethod = (reqMethod || "GET").toUpperCase();
    const systemToken = Deno.env.get("META_SYSTEM_TOKEN");
    const p = params || {};

    console.log(`[meta-proxy] ${graphMethod} /${path} system=${!!systemToken}`);

    let graphRes: Response;

    if (graphMethod === "POST") {
      const token = systemToken || connection.access_token;
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(p)) form.append(k, String(v));
      form.append("access_token", token);
      graphRes = await fetch(`https://graph.facebook.com/v19.0/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
    } else {
      const qs = new URLSearchParams({ ...p, access_token: connection.access_token });
      graphRes = await fetch(`https://graph.facebook.com/v19.0/${path}?${qs.toString()}`);
    }

    const responseText = await graphRes.text();
    let graphData: any;
    try {
      graphData = responseText ? JSON.parse(responseText) : {};
    } catch {
      console.error("[meta-proxy] Failed to parse response:", responseText?.slice(0, 200));
      return new Response(
        JSON.stringify({ error: "Invalid response from Meta API", raw: responseText?.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!graphRes.ok) {
      console.error("[meta-proxy] error:", JSON.stringify(graphData));
      const metaError = graphData.error || {};
      const subcode = metaError.error_subcode;
      
      // Provide clearer error messages for common Meta API errors
      let userMessage = metaError.error_user_msg || metaError.message || "Graph API error";
      if (subcode === 4841013 || metaError.code === 200) {
        userMessage = "Sem permissão para esta ação. Verifique se sua conta tem acesso de gerenciamento (ads_management) para este recurso no Meta Business.";
      } else if (metaError.code === 17 || metaError.code === 32) {
        userMessage = "Rate limit atingido. Tente novamente em alguns minutos.";
      } else if (metaError.code === 190) {
        userMessage = "Token expirado ou inválido. Reconecte sua conta Meta.";
      }
      
      return new Response(
        JSON.stringify({ error: userMessage, meta_error_code: metaError.code, meta_subcode: subcode }),
        { status: graphRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
