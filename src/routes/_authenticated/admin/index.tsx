import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  CalendarDays,
  Download,
  History,
  Plus,
  RefreshCw,
  Users,
  Wand2,
} from "lucide-react";
import {
  criarFuncionario,
  editarFuncionario,
  excluirFuncionario,
  listarFuncionarios,
  redefinirSenha,
  SETORES,
  STATUS,
} from "@/lib/funcionarios.functions";
import {
  editarFolga,
  gerarEscalaSemanal,
  listarEscala,
} from "@/lib/escala.functions";
import { cancelarTroca, listarTrocasAdmin } from "@/lib/trocas.functions";
import {
  addDays,
  DIAS_SEMANA_CURTO,
  formatBR,
  todayISO,
  weekDays,
  weekStart,
} from "@/lib/scheduling/date-utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,
  component: AdminHome,
});

function AdminHome() {
  const listFunc = useServerFn(listarFuncionarios);
  const listTrocas = useServerFn(listarTrocasAdmin);
  const funcQ = useQuery({ queryKey: ["admin/funcs"], queryFn: () => listFunc() });
  const trocasQ = useQuery({ queryKey: ["admin/trocas"], queryFn: () => listTrocas() });

  const totais = useMemo(() => {
    const f = funcQ.data ?? [];
    const t = trocasQ.data?.trocas ?? [];
    return {
      total: f.length,
      ativos: f.filter((x: any) => x.ativo).length,
      pendentes: t.filter((x: any) => x.status === "aberta").length,
      concluidas: t.filter((x: any) => x.status === "aceita").length,
    };
  }, [funcQ.data, trocasQ.data]);

  return (
    <AppShell title="Painel administrativo">
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard label="Funcionários" value={String(totais.total)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Ativos" value={String(totais.ativos)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Trocas pendentes" value={String(totais.pendentes)} icon={<ArrowRightLeft className="h-5 w-5" />} />
        <StatCard label="Trocas concluídas" value={String(totais.concluidas)} icon={<History className="h-5 w-5" />} />
      </div>

      <Tabs defaultValue="escala">
        <TabsList>
          <TabsTrigger value="escala"><CalendarDays className="h-4 w-4 mr-2" />Escala</TabsTrigger>
          <TabsTrigger value="funcionarios"><Users className="h-4 w-4 mr-2" />Funcionários</TabsTrigger>
          <TabsTrigger value="trocas"><ArrowRightLeft className="h-4 w-4 mr-2" />Trocas</TabsTrigger>
          <TabsTrigger value="historico"><History className="h-4 w-4 mr-2" />Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="escala"><EscalaPanel /></TabsContent>
        <TabsContent value="funcionarios"><FuncionariosPanel funcionarios={funcQ.data ?? []} /></TabsContent>
        <TabsContent value="trocas"><TrocasPanel trocas={trocasQ.data?.trocas ?? []} /></TabsContent>
        <TabsContent value="historico"><HistoricoPanel historico={trocasQ.data?.historico ?? []} /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center">{icon}</div>
      </div>
    </Card>
  );
}

// ============ ESCALA ============
function EscalaPanel() {
  const [semana, setSemana] = useState<string>(weekStart(todayISO()));
  const listar = useServerFn(listarEscala);
  const gerar = useServerFn(gerarEscalaSemanal);
  const editar = useServerFn(editarFolga);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin/escala", semana],
    queryFn: () => listar({ data: { semana } }),
  });

  const gerarMut = useMutation({
    mutationFn: () => gerar({ data: { semana } }),
    onSuccess: (r: any) => {
      toast.success(`Escala gerada (${r.count} entradas).`);
      if (r.warnings?.length) r.warnings.forEach((w: string) => toast.warning(w));
      qc.invalidateQueries({ queryKey: ["admin/escala"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: (v: { funcionario_id: string; nova_folga: string }) =>
      editar({ data: { ...v, semana } }),
    onSuccess: () => {
      toast.success("Folga atualizada.");
      qc.invalidateQueries({ queryKey: ["admin/escala"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const week = weekDays(semana);
  const cellsMap = new Map<string, string>();
  for (const c of q.data?.cells ?? []) cellsMap.set(`${c.funcionario_id}|${c.data}`, c.status);


  function exportarCSV() {
    const funcs = q.data?.funcionarios ?? [];
    const lines = [
      ["Setor", "Nome", ...week.map((d) => formatBR(d))].join(";"),
      ...SETORES.flatMap((setor) =>
        funcs
          .filter((f: any) => (f.setor || "-") === setor)
          .map((f: any) =>
            [
              setor,
              f.nome,
              ...week.map((d) => (cellsMap.get(`${f.id}|${d}`) === "folga" ? "FOLGA" : "T")),
            ].join(";"),
          ),
      ),
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escala-${semana}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    const w = window.open("", "_blank");
    if (!w) return;
    const funcs = q.data?.funcionarios ?? [];
    w.document.write(`<html><head><title>Escala ${formatBR(semana)}</title>
      <style>body{font-family:sans-serif;padding:24px}h1{color:#2563EB}h2{color:#1e3a8a;margin-top:24px;border-bottom:2px solid #2563EB;padding-bottom:4px}table{border-collapse:collapse;width:100%;margin-bottom:16px}th,td{border:1px solid #ddd;padding:6px;text-align:center;font-size:12px}th{background:#eff6ff}td.folga{background:#dbeafe;font-weight:bold;color:#2563EB}td.nome{text-align:left;font-weight:600}</style>
      </head><body><h1>Escala Semanal — ${formatBR(semana)}</h1>
      ${SETORES.map((setor) => {
        const grupo = funcs.filter((f: any) => (f.setor || "-") === setor);
        if (!grupo.length) return "";
        return `<h2>${setor}</h2>
        <table><thead><tr><th>Funcionário</th>${week.map((d) => `<th>${DIAS_SEMANA_CURTO[new Date(d + "T00:00:00Z").getUTCDay()]}<br/><small>${formatBR(d)}</small></th>`).join("")}</tr></thead>
        <tbody>${grupo.map((f: any) => `<tr><td class="nome">${f.nome}</td>${week.map((d) => {
          const s = cellsMap.get(`${f.id}|${d}`);
          return s === "folga" ? `<td class="folga">FOLGA</td>` : `<td>—</td>`;
        }).join("")}</tr>`).join("")}</tbody></table>`;
      }).join("")}
      <script>window.print()</script></body></html>`);
    w.document.close();
  }


  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <Label>Semana (domingo)</Label>
          <Input
            type="date"
            value={semana}
            onChange={(e) => setSemana(weekStart(e.target.value))}
            className="w-48"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setSemana(weekStart(todayISO()))}>
            Hoje
          </Button>
          <Button variant="outline" onClick={() => setSemana(addDays(semana, -7))}>
            ← Semana ant.
          </Button>
          <Button variant="outline" onClick={() => setSemana(addDays(semana, 7))}>
            Próx. semana →
          </Button>
          <Button onClick={() => gerarMut.mutate()} disabled={gerarMut.isPending}>
            <Wand2 className="h-4 w-4 mr-2" />
            {gerarMut.isPending ? "Gerando..." : "Gerar escala"}
          </Button>
          <Button variant="outline" onClick={exportarCSV}>
            <Download className="h-4 w-4 mr-2" />CSV
          </Button>
          <Button variant="outline" onClick={exportarPDF}>
            <Download className="h-4 w-4 mr-2" />PDF
          </Button>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-6 rounded bg-primary text-primary-foreground text-[10px] font-bold text-center leading-4">F</span>
          <span className="text-muted-foreground">Folga</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-6 rounded border bg-background text-[10px] text-center leading-4">T</span>
          <span className="text-muted-foreground">Trabalho</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-6 rounded bg-destructive/10 text-destructive text-[10px] text-center leading-4">Sáb</span>
          <span className="text-muted-foreground">Sábado (bloqueado)</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          Total funcionários: <strong className="text-foreground">{(q.data?.funcionarios ?? []).length}</strong>
        </div>
      </div>

      {/* Grade agrupada por setor */}
      <div className="overflow-auto rounded-lg border bg-card">
        <div className="min-w-[1100px]">
          {/* Cabeçalho */}
          <div
            className="grid sticky top-0 z-10 bg-muted/60 backdrop-blur border-b"
            style={{ gridTemplateColumns: "260px repeat(7, minmax(90px, 1fr))" }}
          >
            <div className="p-3 text-xs font-semibold uppercase tracking-wide">Funcionário</div>
            {week.map((d) => {
              const dt = new Date(d + "T00:00:00Z");
              const isSat = dt.getUTCDay() === 6;
              const isSun = dt.getUTCDay() === 0;
              return (
                <div
                  key={d}
                  className={`p-2 text-center border-l ${
                    isSat ? "bg-destructive/10 text-destructive" : isSun ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="text-sm font-bold uppercase">
                    {DIAS_SEMANA_CURTO[dt.getUTCDay()]}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatBR(d)}</div>
                </div>
              );
            })}
          </div>

          {(() => {
            const allFuncs = [...(q.data?.funcionarios ?? [])].sort((a: any, b: any) =>
              a.nome.localeCompare(b.nome),
            );
            const grupos = SETORES.map((setor) => ({
              setor,
              funcs: allFuncs.filter((f: any) => (f.setor || "-") === setor),
            })).filter((g) => g.funcs.length > 0);

            if (grupos.length === 0) {
              return (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  Nenhum funcionário cadastrado.
                </div>
              );
            }

            return grupos.map((grupo) => (
              <div key={grupo.setor}>
                <div className="bg-primary/10 border-y px-4 py-2 text-sm font-bold text-primary uppercase tracking-wide sticky top-[52px] z-[5]">
                  {grupo.setor} <span className="text-xs text-muted-foreground font-normal">({grupo.funcs.length})</span>
                </div>
                {grupo.funcs.map((f: any, idx: number) => {
                  const folga = week.find((d) => cellsMap.get(`${f.id}|${d}`) === "folga");
                  return (
                    <div
                      key={f.id}
                      className={`grid border-b last:border-b-0 ${idx % 2 === 1 ? "bg-muted/20" : ""}`}
                      style={{ gridTemplateColumns: "260px repeat(7, minmax(90px, 1fr))" }}
                    >
                      <div className="p-3 font-medium truncate" title={f.nome}>{f.nome}</div>
                      {week.map((d) => {
                        const isFolga = cellsMap.get(`${f.id}|${d}`) === "folga";
                        const isSat = new Date(d + "T00:00:00Z").getUTCDay() === 6;
                        return (
                          <button
                            type="button"
                            key={d}
                            onClick={() => {
                              if (isSat) return toast.error("Sábado nunca pode ser folga.");
                              if (folga === d) return;
                              editMut.mutate({ funcionario_id: f.id, nova_folga: d });
                            }}
                            className={`border-l h-14 flex items-center justify-center text-sm transition-all ${
                              isFolga
                                ? "bg-primary text-primary-foreground font-bold shadow-inner"
                                : isSat
                                  ? "bg-destructive/5 text-destructive/60 cursor-not-allowed"
                                  : "hover:bg-primary/10 text-muted-foreground"
                            }`}
                          >
                            {isFolga ? "FOLGA" : isSat ? "—" : "T"}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      </div>


      <p className="text-xs text-muted-foreground mt-3">
        💡 Clique em qualquer célula <strong>T</strong> para mover a folga do funcionário para aquele dia — a regra dos 7 dias consecutivos é validada automaticamente.
      </p>
    </Card>
  );
}

// ============ FUNCIONÁRIOS ============
const DIA_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
const DIAS_LONGO_MAP = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function horarioDoDia(f: any, dowIdx: number) {
  const hs = (f.horarios_semana ?? {}) as Record<string, any>;
  const dia = hs[DIA_KEYS[dowIdx]] ?? {};
  return {
    entrada: dia.entrada || f.horario_entrada || "",
    intervalo_inicio: dia.intervalo_inicio || f.horario_intervalo_inicio || "",
    intervalo_volta: dia.intervalo_volta || f.horario_intervalo_volta || "",
    saida: dia.saida || f.horario_saida || "",
  };
}

function FuncionariosPanel({ funcionarios }: { funcionarios: any[] }) {
  const [semana, setSemana] = useState<string>(weekStart(todayISO()));
  const listar = useServerFn(listarEscala);
  const escalaQ = useQuery({
    queryKey: ["admin/escala", semana],
    queryFn: () => listar({ data: { semana } }),
  });
  const week = weekDays(semana);
  const folgasMap = new Map<string, string>();
  for (const c of escalaQ.data?.cells ?? []) {
    if (c.status === "folga") folgasMap.set(`${c.funcionario_id}|${c.data}`, "folga");
  }

  function gerarPdfDia(dowIdx: number) {
    const data = week[dowIdx];
    const w = window.open("", "_blank");
    if (!w) return;
    const grupos = SETORES.map((setor) => ({
      setor,
      funcs: funcionarios
        .filter((f) => (f.setor || "-") === setor)
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    })).filter((g) => g.funcs.length > 0);

    const [yy, mm, dd] = data.split("-");
    const dataCurta = `${dd}/${mm}/${yy.slice(2)}`;

    w.document.write(`<html><head><title>${DIAS_LONGO_MAP[dowIdx]} — ${formatBR(data)}</title>
      <style>
        body{font-family:sans-serif;padding:20px;color:#111}
        .head{display:flex;align-items:baseline;gap:10px;margin-bottom:12px}
        .head h1{color:#2563EB;margin:0;font-size:22px}
        .head .data{color:#666;font-size:12px}
        h2{color:#1e3a8a;margin:18px 0 6px;border-bottom:2px solid #2563EB;padding-bottom:3px;font-size:14px}
        table{border-collapse:collapse;width:100%;margin-bottom:8px;font-size:12px}
        th,td{border:1px solid #999;padding:5px 6px}
        th{background:#eff6ff;font-size:11px;text-transform:uppercase}
        td.folga{background:#fee2e2;color:#DC2626;font-weight:bold;text-align:center}
        td.nome{font-weight:600}
        td.cx,td.chek{width:36px;background:#f9fafb}
      </style></head><body>
      <div class="head"><h1>${DIAS_LONGO_MAP[dowIdx]}</h1><span class="data">${dataCurta}</span></div>
      ${grupos
        .map((g) => {
          const isCaixa = g.setor === "Operadores";
          const nomeSetor = g.setor;
          const colspanFolga = isCaixa ? 6 : 4;
          const rows = g.funcs
            .map((f) => {
              const isFolga = folgasMap.get(`${f.id}|${data}`) === "folga";
              if (isFolga) {
                return `<tr><td class="chek"></td><td class="nome">${f.nome}</td><td class="folga" colspan="${colspanFolga}">FOLGA</td></tr>`;
              }
              const h = horarioDoDia(f, dowIdx);
              const cxCols = isCaixa ? `<td class="cx"></td><td class="cx"></td>` : "";
              return `<tr>
                <td class="chek"></td>
                <td class="nome">${f.nome}</td>
                <td>${h.entrada || "—"}</td>
                <td>${h.intervalo_inicio || "—"}</td>
                <td>${h.intervalo_volta || "—"}</td>
                <td>${h.saida || "—"}</td>
                ${cxCols}
              </tr>`;
            })
            .join("");
          const cxHead = isCaixa ? `<th>Cx1</th><th>Cx2</th>` : "";
          return `<h2>${nomeSetor}</h2>
            <table>
              <thead><tr>
                <th>Chek</th><th>Funcionário</th>
                <th>Entrada</th><th>Int. início</th><th>Int. volta</th><th>Saída</th>
                ${cxHead}
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>`;
        })
        .join("")}
      <script>window.print()</script></body></html>`);
    w.document.close();
  }


  const ordenados = SETORES.flatMap((setor) =>
    funcionarios
      .filter((f) => (f.setor || "-") === setor)
      .sort((a, b) => a.nome.localeCompare(b.nome)),
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-semibold">Funcionários cadastrados</h3>
        <NovoFuncionarioDialog />
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 mb-4">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div>
            <Label className="text-xs">Semana (domingo)</Label>
            <Input
              type="date"
              value={semana}
              onChange={(e) => setSemana(weekStart(e.target.value))}
              className="w-44 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSemana(weekStart(todayISO()))}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSemana(addDays(semana, -7))}>
            ←
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSemana(addDays(semana, 7))}>
            →
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Gere o PDF do dia com os horários detalhados (entrada, intervalo, saída) por setor:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {week.map((d, i) => (
            <Button
              key={d}
              variant="outline"
              size="sm"
              onClick={() => gerarPdfDia(i)}
              className="flex flex-col h-auto py-2"
            >
              <span className="text-[10px] uppercase font-bold">{DIAS_SEMANA_CURTO[i]}</span>
              <span className="text-[11px] text-muted-foreground">{formatBR(d)}</span>
            </Button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Matrícula</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Intervalo</TableHead>
            <TableHead>Saída</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenados.map((f) => (
            <FuncionarioRow key={f.id} f={f} />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

const STATUS_OPTS = STATUS;

function FuncionarioRow({ f }: { f: any }) {
  const editar = useServerFn(editarFuncionario);
  const excluir = useServerFn(excluirFuncionario);
  const reset = useServerFn(redefinirSenha);
  const qc = useQueryClient();
  const [novaSenha, setNovaSenha] = useState("");
  const [openSenha, setOpenSenha] = useState(false);
  const [openDias, setOpenDias] = useState(false);
  const [entrada, setEntrada] = useState<string>(f.horario_entrada ?? "");
  const [intIni, setIntIni] = useState<string>(f.horario_intervalo_inicio ?? "");
  const [intVolta, setIntVolta] = useState<string>(f.horario_intervalo_volta ?? "");
  const [saida, setSaida] = useState<string>(f.horario_saida ?? "");

  const salvarCampo = useMutation({
    mutationFn: (patch: Record<string, unknown>) => editar({ data: { id: f.id, ...patch } as any }),
    onSuccess: () => {
      toast.success("Atualizado.");
      qc.invalidateQueries({ queryKey: ["admin/funcs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => excluir({ data: { id: f.id } }),
    onSuccess: () => {
      toast.success("Excluído.");
      qc.invalidateQueries({ queryKey: ["admin/funcs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const resetMut = useMutation({
    mutationFn: () => reset({ data: { funcionario_id: f.id, nova_senha: novaSenha } }),
    onSuccess: () => {
      toast.success("Senha redefinida.");
      setOpenSenha(false);
      setNovaSenha("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <TableRow>
      <TableCell className="font-medium">{f.nome}</TableCell>
      <TableCell className="font-mono text-xs">{f.matricula}</TableCell>
      <TableCell>
        <Select
          value={(f.setor as string) ?? "Operadores"}
          onValueChange={(v) => salvarCampo.mutate({ setor: v })}
        >
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SETORES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={entrada}
          placeholder="07:00"
          onChange={(e) => setEntrada(e.target.value)}
          onBlur={() => {
            if (entrada !== (f.horario_entrada ?? ""))
              salvarCampo.mutate({ horario_entrada: entrada });
          }}
          className="h-8 w-20"
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-1 items-center">
          <Input
            value={intIni}
            placeholder="11:00"
            onChange={(e) => setIntIni(e.target.value)}
            onBlur={() => {
              if (intIni !== (f.horario_intervalo_inicio ?? ""))
                salvarCampo.mutate({ horario_intervalo_inicio: intIni });
            }}
            className="h-8 w-20"
          />
          <span className="text-muted-foreground text-xs">→</span>
          <Input
            value={intVolta}
            placeholder="12:00"
            onChange={(e) => setIntVolta(e.target.value)}
            onBlur={() => {
              if (intVolta !== (f.horario_intervalo_volta ?? ""))
                salvarCampo.mutate({ horario_intervalo_volta: intVolta });
            }}
            className="h-8 w-20"
          />
        </div>
      </TableCell>
      <TableCell>
        <Input
          value={saida}
          placeholder="15:20"
          onChange={(e) => setSaida(e.target.value)}
          onBlur={() => {
            if (saida !== (f.horario_saida ?? ""))
              salvarCampo.mutate({ horario_saida: saida });
          }}
          className="h-8 w-20"
        />
      </TableCell>
      <TableCell>
        <Select
          value={(f.status as string) ?? "Ativo"}
          onValueChange={(v) => salvarCampo.mutate({ status: v })}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setOpenDias(true)}>
            <CalendarDays className="h-3 w-3 mr-1" />Por dia
          </Button>
          <Dialog open={openSenha} onOpenChange={setOpenSenha}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <RefreshCw className="h-3 w-3 mr-1" />Senha
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova senha para {f.nome}</DialogTitle>
              </DialogHeader>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="4 dígitos"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
              <DialogFooter>
                <Button
                  onClick={() => resetMut.mutate()}
                  disabled={!/^\d{4}$/.test(novaSenha) || resetMut.isPending}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm(`Excluir ${f.nome}?`)) del.mutate();
            }}
          >
            Excluir
          </Button>
        </div>

        <HorariosPorDiaDialog
          open={openDias}
          onOpenChange={setOpenDias}
          f={f}
          onSave={(hs) => salvarCampo.mutate({ horarios_semana: hs })}
        />
      </TableCell>
    </TableRow>
  );
}

function HorariosPorDiaDialog({
  open,
  onOpenChange,
  f,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  f: any;
  onSave: (hs: Record<string, any>) => void;
}) {
  const inicial = useMemo(() => {
    const hs = (f.horarios_semana ?? {}) as Record<string, any>;
    const out: Record<string, any> = {};
    for (const k of DIA_KEYS) {
      const d = hs[k] ?? {};
      out[k] = {
        entrada: d.entrada ?? "",
        intervalo_inicio: d.intervalo_inicio ?? "",
        intervalo_volta: d.intervalo_volta ?? "",
        saida: d.saida ?? "",
      };
    }
    return out;
  }, [f]);
  const [dados, setDados] = useState(inicial);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Horários por dia — {f.nome}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          Deixe em branco para usar o horário padrão do funcionário.
        </p>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Dia</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Int. início</TableHead>
                <TableHead>Int. volta</TableHead>
                <TableHead>Saída</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DIA_KEYS.map((k, idx) => (
                <TableRow key={k}>
                  <TableCell className="font-semibold text-sm">{DIAS_LONGO_MAP[idx]}</TableCell>
                  {(["entrada", "intervalo_inicio", "intervalo_volta", "saida"] as const).map(
                    (campo) => (
                      <TableCell key={campo}>
                        <Input
                          className="h-8"
                          placeholder={
                            campo === "entrada"
                              ? f.horario_entrada || "07:00"
                              : campo === "intervalo_inicio"
                                ? f.horario_intervalo_inicio || "11:00"
                                : campo === "intervalo_volta"
                                  ? f.horario_intervalo_volta || "12:00"
                                  : f.horario_saida || "15:20"
                          }
                          value={dados[k][campo]}
                          onChange={(e) =>
                            setDados({
                              ...dados,
                              [k]: { ...dados[k], [campo]: e.target.value },
                            })
                          }
                        />
                      </TableCell>
                    ),
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              onSave(dados);
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoFuncionarioDialog() {
  const [open, setOpen] = useState(false);
  const emptyForm = {
    matricula: "",
    nome: "",
    senha: "",
    setor: "Operadores" as (typeof SETORES)[number],
    horario_entrada: "",
    horario_intervalo_inicio: "",
    horario_intervalo_volta: "",
    horario_saida: "",
    status: "Ativo" as (typeof STATUS)[number],
    tipo: "funcionario" as "funcionario" | "admin",
  };
  const [form, setForm] = useState(emptyForm);
  const criar = useServerFn(criarFuncionario);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => criar({ data: form }),
    onSuccess: () => {
      toast.success("Funcionário criado.");
      qc.invalidateQueries({ queryKey: ["admin/funcs"] });
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo funcionário</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Matrícula (login)</Label>
              <Input
                value={form.matricula}
                onChange={(e) => setForm({ ...form, matricula: e.target.value })}
              />
            </div>
            <div>
              <Label>Senha (4 dígitos)</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={form.senha}
                onChange={(e) =>
                  setForm({ ...form, senha: e.target.value.replace(/\D/g, "").slice(0, 4) })
                }
              />
            </div>
          </div>
          <div>
            <Label>Setor</Label>
            <Select
              value={form.setor}
              onValueChange={(v) => setForm({ ...form, setor: v as any })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SETORES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Horário de entrada</Label>
              <Input
                placeholder="07:00"
                value={form.horario_entrada}
                onChange={(e) => setForm({ ...form, horario_entrada: e.target.value })}
              />
            </div>
            <div>
              <Label>Horário de saída</Label>
              <Input
                placeholder="15:20"
                value={form.horario_saida}
                onChange={(e) => setForm({ ...form, horario_saida: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Intervalo — início</Label>
              <Input
                placeholder="11:00"
                value={form.horario_intervalo_inicio}
                onChange={(e) => setForm({ ...form, horario_intervalo_inicio: e.target.value })}
              />
            </div>
            <div>
              <Label>Intervalo — volta</Label>
              <Input
                placeholder="12:00"
                value={form.horario_intervalo_volta}
                onChange={(e) => setForm({ ...form, horario_intervalo_volta: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de acesso</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="funcionario">Funcionário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.nome || !form.matricula || !/^\d{4}$/.test(form.senha)}
          >
            {mut.isPending ? "Salvando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ TROCAS ============
function TrocasPanel({ trocas }: { trocas: any[] }) {
  const cancelar = useServerFn(cancelarTroca);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (id: string) => cancelar({ data: { id } }),
    onSuccess: () => {
      toast.success("Cancelada.");
      qc.invalidateQueries({ queryKey: ["admin/trocas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">Trocas</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Criador</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead>Oferece</TableHead>
            <TableHead>Deseja</TableHead>
            <TableHead>Aceito por</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trocas.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.criador?.nome}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {t.criador?.setor || "-"}
                </Badge>
              </TableCell>

              <TableCell>{formatBR(t.data_origem)}</TableCell>
              <TableCell>{formatBR(t.data_desejada)}</TableCell>
              <TableCell>{t.aceito?.nome ?? "—"}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    t.status === "aceita"
                      ? "default"
                      : t.status === "aberta"
                        ? "secondary"
                        : t.status === "expirada"
                          ? "destructive"
                          : "outline"
                  }
                >
                  {t.status}
                </Badge>
              </TableCell>
              <TableCell>
                {t.status === "aberta" && (
                  <Button size="sm" variant="destructive" onClick={() => mut.mutate(t.id)}>
                    Cancelar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!trocas.length && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                Nenhuma troca registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

// ============ HISTÓRICO ============
function HistoricoPanel({ historico }: { historico: any[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4">Histórico de trocas concluídas</h3>
      {historico.length ? (
        <ul className="divide-y">
          {historico.map((h) => (
            <li key={h.id} className="py-3">
              <p className="text-sm">
                <span className="font-medium">{h.f1?.nome}</span> ↔{" "}
                <span className="font-medium">{h.f2?.nome}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(h.data_troca).toLocaleString("pt-BR")} — {h.descricao}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Sem histórico.</p>
      )}
    </Card>
  );
}
