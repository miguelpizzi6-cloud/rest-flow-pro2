import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { simulateSwap, type EscalaCell } from "./scheduling/engine";
import { addDays } from "./scheduling/date-utils";

const OFERTA_TTL_MIN = 30;
const COOLDOWN_MIN = 5;

async function getMyFuncionario(supabase: any, userId: string) {
  const { data } = await supabase
    .from("funcionarios")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Funcionário não encontrado.");
  return data;
}

async function expirarAntigas(supabaseAdmin: any) {
  await supabaseAdmin
    .from("trocas")
    .update({ status: "expirada", atualizado_em: new Date().toISOString() })
    .eq("status", "aberta")
    .lt("expira_em", new Date().toISOString());
}

// ---------- Criar oferta de troca ----------
export const criarTroca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        data_origem: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        data_desejada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await expirarAntigas(supabaseAdmin);
    const me = await getMyFuncionario(context.supabase, context.userId);

    // Confirma que a data_origem é folga do funcionário
    const { data: escala } = await supabaseAdmin
      .from("escalas")
      .select("id,status")
      .eq("funcionario_id", me.id)
      .eq("data", data.data_origem)
      .maybeSingle();
    if (!escala || escala.status !== "folga")
      throw new Error("Você não tem folga nessa data.");

    // Sábado nunca folga
    if (new Date(data.data_desejada + "T00:00:00Z").getUTCDay() === 6)
      throw new Error("Sábado nunca pode ser folga.");

    // Regra: não pode haver outra oferta ativa nessa mesma folga
    const { data: outra } = await supabaseAdmin
      .from("trocas")
      .select("id")
      .eq("escala_origem_id", escala.id)
      .eq("status", "aberta")
      .maybeSingle();
    if (outra) throw new Error("Esta folga já possui uma oferta em aberto.");

    // Cooldown: última troca do criador expirada há < 5 min
    const { data: last } = await supabaseAdmin
      .from("trocas")
      .select("atualizado_em,status")
      .eq("criador_id", me.id)
      .eq("status", "expirada")
      .order("atualizado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) {
      const diffMin = (Date.now() - new Date(last.atualizado_em).getTime()) / 60000;
      if (diffMin < COOLDOWN_MIN)
        throw new Error(
          `Aguarde ${Math.ceil(COOLDOWN_MIN - diffMin)} min antes de criar outra oferta.`,
        );
    }

    const expira = new Date(Date.now() + OFERTA_TTL_MIN * 60000).toISOString();
    const { error } = await supabaseAdmin.from("trocas").insert({
      criador_id: me.id,
      escala_origem_id: escala.id,
      data_origem: data.data_origem,
      data_desejada: data.data_desejada,
      status: "aberta",
      expira_em: expira,
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });

// ---------- Cancelar oferta ----------
export const cancelarTroca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: troca } = await supabaseAdmin
      .from("trocas")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!troca) throw new Error("Troca não encontrada.");

    // Admin ou criador
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const me = await context.supabase
      .from("funcionarios")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!isAdmin && troca.criador_id !== me.data?.id)
      throw new Error("Você não pode cancelar esta troca.");

    await supabaseAdmin
      .from("trocas")
      .update({ status: "cancelada", atualizado_em: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true };
  });

// ---------- Aceitar oferta ----------
export const aceitarTroca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await expirarAntigas(supabaseAdmin);
    const me = await getMyFuncionario(context.supabase, context.userId);

    const { data: troca } = await supabaseAdmin
      .from("trocas")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!troca) throw new Error("Troca não encontrada.");
    if (troca.status !== "aberta") throw new Error("Esta oferta não está mais disponível.");
    if (new Date(troca.expira_em).getTime() < Date.now())
      throw new Error("Oferta expirada.");
    if (troca.criador_id === me.id) throw new Error("Você criou esta oferta.");
    if (troca.criador_id === me.id) throw new Error("Você criou esta oferta.");

    // Aceitante precisa ter folga na data_desejada
    const { data: escAceit } = await supabaseAdmin
      .from("escalas")
      .select("id,status")
      .eq("funcionario_id", me.id)
      .eq("data", troca.data_desejada)
      .maybeSingle();
    if (!escAceit || escAceit.status !== "folga")
      throw new Error("Você não possui folga na data desejada.");

    // Validar regra 7 dias para ambos
    const from = addDays(troca.data_origem < troca.data_desejada ? troca.data_origem : troca.data_desejada, -7);
    const to = addDays(troca.data_origem > troca.data_desejada ? troca.data_origem : troca.data_desejada, 7);
    const { data: cellsAll } = await supabaseAdmin
      .from("escalas")
      .select("funcionario_id,data,status")
      .in("funcionario_id", [troca.criador_id, me.id])
      .gte("data", from)
      .lte("data", to);
    const cellsA: EscalaCell[] = (cellsAll ?? [])
      .filter((c) => c.funcionario_id === troca.criador_id)
      .map((c) => ({ funcionario_id: c.funcionario_id, data: c.data, status: c.status }));
    const cellsB: EscalaCell[] = (cellsAll ?? [])
      .filter((c) => c.funcionario_id === me.id)
      .map((c) => ({ funcionario_id: c.funcionario_id, data: c.data, status: c.status }));

    const sim = simulateSwap(cellsA, cellsB, troca.data_origem, troca.data_desejada);
    if (!sim.ok) throw new Error(sim.motivo || "Regra violada.");

    // Aplicar troca
    await supabaseAdmin
      .from("escalas")
      .update({ status: "trabalho" })
      .eq("funcionario_id", troca.criador_id)
      .eq("data", troca.data_origem);
    await supabaseAdmin
      .from("escalas")
      .upsert(
        {
          funcionario_id: troca.criador_id,
          data: troca.data_desejada,
          status: "folga",
        },
        { onConflict: "funcionario_id,data" },
      );

    await supabaseAdmin
      .from("escalas")
      .update({ status: "trabalho" })
      .eq("funcionario_id", me.id)
      .eq("data", troca.data_desejada);
    await supabaseAdmin
      .from("escalas")
      .upsert(
        {
          funcionario_id: me.id,
          data: troca.data_origem,
          status: "folga",
        },
        { onConflict: "funcionario_id,data" },
      );

    await supabaseAdmin
      .from("trocas")
      .update({
        status: "aceita",
        aceito_por: me.id,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", troca.id);

    await supabaseAdmin.from("historico_trocas").insert({
      troca_id: troca.id,
      funcionario1_id: troca.criador_id,
      funcionario2_id: me.id,
      descricao: `Troca: ${troca.data_origem} <-> ${troca.data_desejada}`,
    });

    return { ok: true };
  });

// ---------- Listar trocas para o funcionário (todas as ofertas + próprias) ----------
export const listarTrocasFuncionario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await expirarAntigas(supabaseAdmin);
    const me = await getMyFuncionario(context.supabase, context.userId);

    // Ofertas abertas em datas em que EU tenho folga
    const { data: minhasFolgas } = await supabaseAdmin
      .from("escalas")
      .select("data")
      .eq("funcionario_id", me.id)
      .eq("status", "folga")
      .gte("data", new Date().toISOString().slice(0, 10));
    const datasFolga = new Set((minhasFolgas ?? []).map((e) => e.data));

    const { data: abertas } = await supabaseAdmin
      .from("trocas")
      .select("*, criador:funcionarios!trocas_criador_id_fkey(nome,matricula)")
      .eq("status", "aberta")
      .neq("criador_id", me.id)
      .order("criado_em", { ascending: false });


    const ofertasCompativeis = (abertas ?? []).filter((t) => datasFolga.has(t.data_desejada));

    const { data: minhas } = await supabaseAdmin
      .from("trocas")
      .select("*")
      .eq("criador_id", me.id)
      .order("criado_em", { ascending: false })
      .limit(20);

    const { data: historico } = await supabaseAdmin
      .from("historico_trocas")
      .select("*, f1:funcionarios!historico_trocas_funcionario1_id_fkey(nome), f2:funcionarios!historico_trocas_funcionario2_id_fkey(nome)")
      .or(`funcionario1_id.eq.${me.id},funcionario2_id.eq.${me.id}`)
      .order("data_troca", { ascending: false })
      .limit(30);

    return {
      me,
      ofertas: ofertasCompativeis,
      minhas: minhas ?? [],
      historico: historico ?? [],
    };
  });

// ---------- Listar todas as trocas (admin) ----------
export const listarTrocasAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await expirarAntigas(supabaseAdmin);
    const { data: trocas } = await supabaseAdmin
      .from("trocas")
      .select("*, criador:funcionarios!trocas_criador_id_fkey(nome,matricula,setor), aceito:funcionarios!trocas_aceito_por_fkey(nome,matricula)")

      .order("criado_em", { ascending: false })
      .limit(100);
    const { data: historico } = await supabaseAdmin
      .from("historico_trocas")
      .select("*, f1:funcionarios!historico_trocas_funcionario1_id_fkey(nome), f2:funcionarios!historico_trocas_funcionario2_id_fkey(nome)")
      .order("data_troca", { ascending: false })
      .limit(100);
    return { trocas: trocas ?? [], historico: historico ?? [] };
  });
