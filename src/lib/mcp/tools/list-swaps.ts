import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_swaps",
  title: "Listar trocas de folga",
  description:
    "Lista as ofertas de troca de folga visíveis para o usuário autenticado, opcionalmente filtradas por status.",
  inputSchema: {
    status: z
      .enum(["aberta", "aceita", "cancelada", "expirada"])
      .optional()
      .describe("Filtrar pelo status da troca."),
    limite: z.number().int().min(1).max(100).optional().describe("Máximo de registros (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limite }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("trocas")
      .select("id, status, data_origem, data_desejada, criado_em, expira_em, criador_id, aceito_por")
      .order("criado_em", { ascending: false })
      .limit(limite ?? 25);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { trocas: data ?? [] },
    };
  },
});
