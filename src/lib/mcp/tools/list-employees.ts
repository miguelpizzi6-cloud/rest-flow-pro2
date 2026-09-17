import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const SETORES = [
  "Operadores",
  "Empacotadores",
  "Tesouraria",
  "Fiscais",
  "Atendimento",
  "Delivery",
] as const;

export default defineTool({
  name: "list_employees",
  title: "Listar funcionários",
  description:
    "Lista os funcionários cadastrados (nome, matrícula, setor, status e horários). Apenas administradores enxergam todos; funcionários veem apenas o próprio registro.",
  inputSchema: {
    setor: z.enum(SETORES).optional().describe("Filtrar por setor."),
    apenas_ativos: z.boolean().optional().describe("Se verdadeiro, retorna apenas funcionários ativos."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ setor, apenas_ativos }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("funcionarios")
      .select(
        "id, nome, matricula, setor, status, ativo, horario_entrada, horario_intervalo_inicio, horario_intervalo_volta, horario_saida",
      )
      .order("nome");
    if (setor) query = query.eq("setor", setor);
    if (apenas_ativos) query = query.eq("ativo", true);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { funcionarios: data ?? [] },
    };
  },
});
