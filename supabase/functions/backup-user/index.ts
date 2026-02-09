import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("user_id");

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "user_id é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

    // Fetch all clients for this operator
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("operator_id", targetUserId);

    const clientIds = (clients || []).map((c) => c.id);

    // Fetch all loans for these clients
    let loans: any[] = [];
    if (clientIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("loans")
        .select("*")
        .eq("operator_id", targetUserId);
      loans = data || [];
    }

    const loanIds = loans.map((l) => l.id);

    // Fetch all payments for these loans
    let payments: any[] = [];
    if (loanIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("operator_id", targetUserId);
      payments = data || [];
    }

    // Collect all image paths
    const imagePaths: string[] = [];
    for (const c of clients || []) {
      if (c.photo_document_path) imagePaths.push(c.photo_document_path);
      if (c.photo_selfie_path) imagePaths.push(c.photo_selfie_path);
    }
    for (const l of loans) {
      if (l.transfer_receipt_path) imagePaths.push(l.transfer_receipt_path);
    }
    for (const p of payments) {
      if (p.receipt_path) imagePaths.push(p.receipt_path);
    }

    // Generate signed URLs for images
    const imageUrls: { path: string; url: string }[] = [];
    for (const path of imagePaths) {
      // Determine bucket from path or try both
      const buckets = ["photos", "receipts"];
      for (const bucket of buckets) {
        const { data: signedData } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 3600);
        if (signedData?.signedUrl) {
          imageUrls.push({ path: `${bucket}/${path}`, url: signedData.signedUrl });
          break;
        }
      }
    }

    console.log(
      `Backup for user ${targetUserId}: ${clients?.length || 0} clients, ${loans.length} loans, ${payments.length} payments, ${imageUrls.length} images`
    );

    return new Response(
      JSON.stringify({
        profile,
        clients: clients || [],
        loans,
        payments,
        imageUrls,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Backup error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
