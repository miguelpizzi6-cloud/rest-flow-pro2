import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_schedule",
  title: "Listar escala",
  description:
    "Lista a escala (folgas e dias de trabalho) num intervalo de datas. Funcionários veem apenas a própria escala; administradores veem a de todos.",
  inputSchema: {
    data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Data inicial (YYYY-MM-DD)."),
    data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Data final (YYYY-MM-DD)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ data_inicio, data_fim }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("escalas")
      .select("id, data, status, funcionarios(nome, matricula, setor)")
      .gte("data", data_inicio)
      .lte("data", data_fim)
      .order("data");

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { escalas: data ?? [] },
    };
  },
});
