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

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // If we receive ?code=, this is the OAuth callback from Meta
  if (code) {
    return handleOAuthCallback(code, req);
  }

  // Otherwise, return the OAuth URL for the frontend to redirect to
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appId = Deno.env.get("META_APP_ID")!;
    const redirectUri = Deno.env.get("META_REDIRECT_URI")!;
    const userId = claimsData.claims.sub;

    // Build Meta OAuth URL with state containing user ID
    const state = btoa(JSON.stringify({ userId }));
    const oauthUrl =
      `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=ads_read,ads_management,business_management,read_insights` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}`;

    return new Response(JSON.stringify({ url: oauthUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating OAuth URL:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleOAuthCallback(code: string, req: Request) {
  const url = new URL(req.url);
  const stateParam = url.searchParams.get("state");

  if (!stateParam) {
    return redirectWithError("Missing state parameter");
  }

  let userId: string;
  try {
    const state = JSON.parse(atob(stateParam));
    userId = state.userId;
  } catch {
    return redirectWithError("Invalid state parameter");
  }

  const appId = Deno.env.get("META_APP_ID")!;
  const appSecret = Deno.env.get("META_APP_SECRET")!;
  const redirectUri = Deno.env.get("META_REDIRECT_URI")!;

  try {
    // Step 1: Exchange code for short-lived token
    const tokenUrl =
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${appSecret}` +
      `&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData.error);
      return redirectWithError(tokenData.error.message || "Token exchange failed");
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange for long-lived token (60 days)
    const longTokenUrl =
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortLivedToken}`;

    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();

    if (longTokenData.error) {
      console.error("Long-lived token error:", longTokenData.error);
      return redirectWithError("Failed to get long-lived token");
    }

    const longLivedToken = longTokenData.access_token;
    const expiresIn = longTokenData.expires_in || 5184000; // default 60 days

    // Step 3: Get Meta user info
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?access_token=${longLivedToken}`
    );
    const meData = await meRes.json();

    if (meData.error) {
      console.error("Me endpoint error:", meData.error);
      return redirectWithError("Failed to get user info");
    }

    // Step 4: Save to meta_connections using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(
      Date.now() + expiresIn * 1000
    ).toISOString();

    // Upsert: update if exists, insert if not
    const { error: upsertError } = await supabaseAdmin
      .from("meta_connections")
      .upsert(
        {
          user_id: userId,
          access_token: longLivedToken,
          meta_user_id: meData.id,
          meta_user_name: meData.name,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      // Try insert if upsert fails (no unique constraint on user_id)
      const { data: existing } = await supabaseAdmin
        .from("meta_connections")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from("meta_connections")
          .update({
            access_token: longLivedToken,
            meta_user_id: meData.id,
            meta_user_name: meData.name,
            token_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        await supabaseAdmin.from("meta_connections").insert({
          user_id: userId,
          access_token: longLivedToken,
          meta_user_id: meData.id,
          meta_user_name: meData.name,
          token_expires_at: expiresAt,
        });
      }
    }

    // Step 5: Fetch ad accounts and save them
    const accountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,business,account_status,currency&access_token=${longLivedToken}`
    );
    const accountsData = await accountsRes.json();

    if (accountsData.data && Array.isArray(accountsData.data)) {
      for (const account of accountsData.data) {
        const { data: existingAccount } = await supabaseAdmin
          .from("ad_accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("account_id", account.account_id)
          .maybeSingle();

        if (!existingAccount) {
          await supabaseAdmin.from("ad_accounts").insert({
            user_id: userId,
            account_id: account.account_id,
            account_name: account.name,
            business_id: account.business?.id || null,
            business_name: account.business?.name || null,
            currency: account.currency,
            is_active: account.account_status === 1,
          });
        }
      }
    }

    // Redirect to dashboard with success
    const dashboardUrl = Deno.env.get("META_REDIRECT_URI")!
      .replace("/auth/meta-callback", "/dashboard")
      .replace(/\/functions\/v1\/meta-auth$/, "");
    
    // Construct the app URL from SUPABASE_URL
    // The app URL should be the published app URL, not the Supabase URL
    // We'll redirect to a relative path that the frontend handles
    const appBaseUrl = redirectUri.replace(/\/auth\/meta-callback.*$/, "").replace(/\/functions\/v1\/meta-auth$/, "");
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appBaseUrl}/dashboard?connected=true`,
      },
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return redirectWithError("Internal server error");
  }
}

function redirectWithError(message: string) {
  return new Response(
    `<html><body><script>window.location.href='/dashboard?meta_error=${encodeURIComponent(message)}';</script></body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}
