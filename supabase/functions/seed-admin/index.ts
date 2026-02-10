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

    const adminEmail = "484606@extrabom.local";
    const adminPassword = "123456";

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(
      (u) => u.email === adminEmail
    );

    let userId: string;

    if (existingAdmin) {
      userId = existingAdmin.id;
      console.log("Admin user already exists:", userId);

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: adminPassword,
      });
      if (updateError) {
        console.log("Failed to update admin password:", updateError.message);
      } else {
        console.log("Admin password updated successfully");
      }
    } else {
      // Create admin user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
        });

      if (createError) {
        throw new Error(`Failed to create admin: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log("Admin user created:", userId);

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          numeric_login: "484606",
        });

      if (profileError) {
        console.log("Profile insert error (may already exist):", profileError.message);
      }
    }

    // Assign admin role (upsert)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" }
      );

    if (roleError) {
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    console.log("Admin role assigned to:", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Admin seeded successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed admin error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
