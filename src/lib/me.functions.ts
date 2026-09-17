import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Retorna dados do usuário logado (funcionário + role) ----------
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: roles }, { data: func }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("funcionarios").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    return {
      userId,
      isAdmin,
      funcionario: func ?? null,
    };
  });

// ---------- Alterar própria senha ----------
export const alterarMinhaSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        nova_senha: z.string().regex(/^\d{4}$/, "Senha deve ter 4 dígitos numéricos"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.nova_senha,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
