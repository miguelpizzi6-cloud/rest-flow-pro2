import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  generateWeeklySchedule,
  isSevenDayOk,
  type EscalaCell,
  type Funcionario,
} from "./scheduling/engine";
import { addDays, weekDays, weekStart, todayISO } from "./scheduling/date-utils";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado.");
}

// ---------- Gerar escala semanal ----------
export const gerarEscalaSemanal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ semana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sunday = weekStart(data.semana);
    const week = weekDays(sunday);

    // Buscar funcionários com status Ativo
    const { data: funcs, error: funcErr } = await supabaseAdmin
      .from("funcionarios")
      .select("*")
      .eq("status", "Ativo");
    if (funcErr) throw new Error(funcErr.message);


    // Buscar histórico (7 dias antes da semana) para regra 7d
    const from = addDays(sunday, -7);
    const to = addDays(sunday, 6);
    const { data: hist } = await supabaseAdmin
      .from("escalas")
      .select("funcionario_id,data,status")
      .gte("data", from)
      .lte("data", to);

    const historyByFunc: Record<string, EscalaCell[]> = {};
    for (const h of hist ?? []) {
      (historyByFunc[h.funcionario_id] ??= []).push({
        funcionario_id: h.funcionario_id,
        data: h.data,
        status: h.status,
      });
    }

    const funcionarios: Funcionario[] = (funcs ?? []).map((f) => ({
      id: f.id,
      nome: f.nome,
      setor: (f as any).setor ?? "-",
      contador_domingos: f.contador_domingos ?? 0,
      ativo: (f.status ?? "Ativo") === "Ativo",
    }));


    const result = generateWeeklySchedule(funcionarios, sunday, historyByFunc);

    // Remove escala existente da semana e insere nova
    await supabaseAdmin
      .from("escalas")
      .delete()
      .gte("data", sunday)
      .lte("data", week[6])
      .in(
        "funcionario_id",
        funcionarios.map((f) => f.id),
      );

    const { error: insErr } = await supabaseAdmin.from("escalas").insert(
      result.cells.map((c) => ({
        funcionario_id: c.funcionario_id,
        data: c.data,
        status: c.status,
      })),
    );
    if (insErr) throw new Error(insErr.message);

    // Atualiza contador_domingos
    for (const [fid, novo] of Object.entries(result.contadorUpdates)) {
      await supabaseAdmin.from("funcionarios").update({ contador_domingos: novo }).eq("id", fid);
    }

    return { ok: true, warnings: result.warnings, count: result.cells.length };
  });

// ---------- Editar folga (admin) ----------
export const editarFolga = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        funcionario_id: z.string().uuid(),
        semana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        nova_folga: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sunday = weekStart(data.semana);
    const week = weekDays(sunday);
    if (!week.includes(data.nova_folga)) throw new Error("Data fora da semana.");
    if (new Date(data.nova_folga + "T00:00:00Z").getUTCDay() === 6)
      throw new Error("Sábado nunca pode ser folga.");

    // Buscar contexto ±7 dias para validar 7 dias
    const from = addDays(sunday, -7);
    const to = addDays(sunday, 13);
    const { data: cells } = await supabaseAdmin
      .from("escalas")
      .select("funcionario_id,data,status")
      .eq("funcionario_id", data.funcionario_id)
      .gte("data", from)
      .lte("data", to);

    const projected: EscalaCell[] = (cells ?? []).map((c) => ({
      funcionario_id: c.funcionario_id,
      data: c.data,
      status: week.includes(c.data)
        ? c.data === data.nova_folga
          ? "folga"
          : "trabalho"
        : c.status,
    }));
    // se semana não existe ainda, cria projeção
    if (!projected.find((p) => week.includes(p.data))) {
      for (const d of week) {
        projected.push({
          funcionario_id: data.funcionario_id,
          data: d,
          status: d === data.nova_folga ? "folga" : "trabalho",
        });
      }
    }

    if (!isSevenDayOk(projected)) {
      throw new Error(
        "Esta alteração faria um funcionário trabalhar mais de sete dias consecutivos. A operação não é permitida.",
      );
    }

    // Aplicar: setar folga em nova_folga, trabalho nos demais da semana
    for (const d of week) {
      await supabaseAdmin
        .from("escalas")
        .upsert(
          {
            funcionario_id: data.funcionario_id,
            data: d,
            status: d === data.nova_folga ? "folga" : "trabalho",
          },
          { onConflict: "funcionario_id,data" },
        );
    }
    return { ok: true };
  });

// ---------- Listar escala (admin) ----------
export const listarEscala = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ semana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sunday = weekStart(data.semana);
    const to = addDays(sunday, 6);
    const [{ data: funcs }, { data: cells }] = await Promise.all([
      supabaseAdmin.from("funcionarios").select("*").order("nome"),
      supabaseAdmin.from("escalas").select("*").gte("data", sunday).lte("data", to),
    ]);
    return { funcionarios: funcs ?? [], cells: cells ?? [], sunday };
  });

// ---------- Dados da home do funcionário ----------
export const getMinhaSemana = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: func } = await supabase
      .from("funcionarios")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!func) return null;

    const hoje = todayISO();
    const semanaAtual = weekStart(hoje);
    const proximaSemana = addDays(semanaAtual, 7);
    const fimProxima = addDays(proximaSemana, 6);
    const inicioAnterior = addDays(semanaAtual, -7);

    const { data: cells } = await supabase
      .from("escalas")
      .select("*")
      .eq("funcionario_id", func.id)
      .gte("data", inicioAnterior)
      .lte("data", fimProxima);

    const folgaAtual = (cells ?? []).find(
      (c) => c.status === "folga" && c.data >= semanaAtual && c.data <= addDays(semanaAtual, 6),
    );
    const folgaProxima = (cells ?? []).find(
      (c) => c.status === "folga" && c.data >= proximaSemana && c.data <= fimProxima,
    );

    // Só mostra próxima semana a partir de quinta (dow=4)
    const dowHoje = new Date(hoje + "T00:00:00Z").getUTCDay();
    const podeMostrarProxima = dowHoje >= 4;

    // Dias consecutivos até próxima folga
    let diasConsec = 0;
    const proximaFolga = (cells ?? [])
      .filter((c) => c.status === "folga" && c.data >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data))[0];
    if (proximaFolga) {
      let cursor = hoje;
      while (cursor < proximaFolga.data) {
        const cell = (cells ?? []).find((c) => c.data === cursor);
        if (cell?.status === "trabalho") diasConsec += 1;
        cursor = addDays(cursor, 1);
      }
    }

    return {
      funcionario: func,
      folgaAtual: folgaAtual?.data ?? null,
      folgaProxima: podeMostrarProxima ? (folgaProxima?.data ?? null) : null,
      contador_domingos: func.contador_domingos ?? 0,
      dias_consecutivos: diasConsec,
    };
  });
