import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

export const SETORES = [
  "Operadores",
  "Empacotadores",
  "Tesouraria",
  "Fiscais",
  "Atendimento",
  "Delivery",
] as const;

export const STATUS = ["Ativo", "Férias", "Suspensão"] as const;

const senhaSchema = z
  .string()
  .regex(/^\d{4}$/, "Senha deve ter exatamente 4 dígitos numéricos");

// ---------- Listar funcionários ----------
export const listarFuncionarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("funcionarios")
      .select("*")
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Criar funcionário ----------
const criarSchema = z.object({
  matricula: z.string().trim().min(1).max(50).regex(/^[a-zA-Z0-9_.-]+$/, "Matrícula inválida"),
  nome: z.string().trim().min(2).max(100),
  senha: senhaSchema,
  setor: z.enum(SETORES),
  horario_entrada: z.string().trim().max(20).optional().default(""),
  horario_intervalo_inicio: z.string().trim().max(20).optional().default(""),
  horario_intervalo_volta: z.string().trim().max(20).optional().default(""),
  horario_saida: z.string().trim().max(20).optional().default(""),
  status: z.enum(STATUS).default("Ativo"),
  tipo: z.enum(["admin", "funcionario"]).default("funcionario"),
});

export const criarFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => criarSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = `${data.matricula.toLowerCase()}@app.local`;

    const { data: existente } = await supabaseAdmin
      .from("funcionarios")
      .select("id")
      .eq("matricula", data.matricula)
      .maybeSingle();
    if (existente) throw new Error("Matrícula já cadastrada.");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { matricula: data.matricula, nome: data.nome },
    });
    if (createErr || !created.user) throw new Error(createErr?.message || "Falha ao criar usuário.");

    const uid = created.user.id;

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: data.tipo });
    if (roleErr) throw new Error(roleErr.message);

    const { error: funcErr } = await supabaseAdmin.from("funcionarios").insert({
      user_id: uid,
      matricula: data.matricula,
      nome: data.nome,
      setor: data.setor,
      horario_entrada: data.horario_entrada ?? "",
      horario_intervalo_inicio: data.horario_intervalo_inicio ?? "",
      horario_intervalo_volta: data.horario_intervalo_volta ?? "",
      horario_saida: data.horario_saida ?? "",
      status: data.status,
      ativo: data.status === "Ativo",
    } as any);
    if (funcErr) throw new Error(funcErr.message);

    return { ok: true, user_id: uid };
  });

// ---------- Editar funcionário ----------
const horariosDiaSchema = z
  .object({
    entrada: z.string().trim().max(20).optional().default(""),
    intervalo_inicio: z.string().trim().max(20).optional().default(""),
    intervalo_volta: z.string().trim().max(20).optional().default(""),
    saida: z.string().trim().max(20).optional().default(""),
  })
  .partial();

const editarSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().trim().min(2).max(100).optional(),
  setor: z.enum(SETORES).optional(),
  horario_entrada: z.string().trim().max(20).optional(),
  horario_intervalo_inicio: z.string().trim().max(20).optional(),
  horario_intervalo_volta: z.string().trim().max(20).optional(),
  horario_saida: z.string().trim().max(20).optional(),
  status: z.enum(STATUS).optional(),
  horarios_semana: z.record(z.string(), horariosDiaSchema).optional(),
});

export const editarFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => editarSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, status, ...rest } = data;
    const upd: Record<string, unknown> = { ...rest };
    if (status !== undefined) {
      upd.status = status;
      upd.ativo = status === "Ativo";
    }
    const { error } = await supabaseAdmin.from("funcionarios").update(upd as any).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ---------- Redefinir senha ----------
export const redefinirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ funcionario_id: z.string().uuid(), nova_senha: senhaSchema }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: func } = await supabaseAdmin
      .from("funcionarios")
      .select("user_id")
      .eq("id", data.funcionario_id)
      .maybeSingle();
    if (!func?.user_id) throw new Error("Funcionário sem usuário vinculado.");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(func.user_id, {
      password: data.nova_senha,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Excluir funcionário ----------
export const excluirFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: func } = await supabaseAdmin
      .from("funcionarios")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    await supabaseAdmin.from("funcionarios").delete().eq("id", data.id);
    if (func?.user_id) {
      await supabaseAdmin.auth.admin.deleteUser(func.user_id);
    }
    return { ok: true };
  });
