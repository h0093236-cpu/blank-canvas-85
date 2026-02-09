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
    const action = url.searchParams.get("action");

    // LIST USERS
    if (req.method === "GET" && action === "list") {
      const { data: users, error } =
        await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;

      // Get all roles
      const { data: allRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role");

      // Get all profiles
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, numeric_login, active, full_name");

      const enriched = users.users.map((u) => {
        const profile = profiles?.find((p) => p.id === u.id);
        const userRoles = allRoles?.filter((r) => r.user_id === u.id) || [];
        return {
          id: u.id,
          email: u.email,
          numeric_login: profile?.numeric_login || u.email?.split("@")[0],
          full_name: profile?.full_name || "",
          active: profile?.active ?? true,
          roles: userRoles.map((r) => r.role),
          created_at: u.created_at,
        };
      });

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE USER
    if (req.method === "POST" && action === "create") {
      const { numeric_login, password, role, full_name } = await req.json();

      if (!numeric_login || !password) {
        return new Response(
          JSON.stringify({ error: "Login e senha são obrigatórios" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const email = `${numeric_login}@extrabom.local`;

      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create profile
      await supabaseAdmin.from("profiles").insert({
        id: newUser.user.id,
        numeric_login,
        full_name: full_name || null,
      });

      // Assign role
      const assignRole = role === "admin" ? "admin" : "user";
      await supabaseAdmin.from("user_roles").insert({
        user_id: newUser.user.id,
        role: assignRole,
      });

      console.log(`User created: ${numeric_login} with role ${assignRole}`);

      return new Response(
        JSON.stringify({
          success: true,
          user: { id: newUser.user.id, numeric_login, role: assignRole },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // TOGGLE ACTIVE
    if (req.method === "POST" && action === "toggle-active") {
      const { user_id, active } = await req.json();

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ active })
        .eq("id", user_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RESET PASSWORD
    if (req.method === "POST" && action === "reset-password") {
      const { user_id, new_password } = await req.json();

      if (!user_id || !new_password) {
        return new Response(
          JSON.stringify({ error: "ID do usuário e nova senha são obrigatórios" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Senha deve ter pelo menos 6 dígitos" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { password: new_password }
      );

      if (updateError) {
        console.error("Reset password error:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`Password reset for user: ${user_id}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE USER
    if (req.method === "POST" && action === "update-user") {
      const { user_id, full_name, numeric_login, role } = await req.json();

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "ID do usuário é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update profile
      const profileUpdate: Record<string, unknown> = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (numeric_login !== undefined) profileUpdate.numeric_login = numeric_login;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", user_id);
        if (profileError) throw profileError;
      }

      // Update email if numeric_login changed
      if (numeric_login) {
        const newEmail = `${numeric_login}@extrabom.local`;
        await supabaseAdmin.auth.admin.updateUserById(user_id, { email: newEmail });
      }

      // Update role if provided
      if (role) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
        await supabaseAdmin.from("user_roles").insert({ user_id, role });
      }

      console.log(`User updated: ${user_id}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação não encontrada" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Manage users error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
