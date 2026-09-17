import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Meu perfil",
  description:
    "Retorna o perfil do usuário autenticado: nome, matrícula, setor, status, horários padrão e se é administrador.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [{ data: roles, error: rolesError }, { data: func, error: funcError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("funcionarios").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const error = rolesError ?? funcError;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const profile = { userId, isAdmin, funcionario: func ?? null };
    return {
      content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      structuredContent: profile,
    };
  },
});
