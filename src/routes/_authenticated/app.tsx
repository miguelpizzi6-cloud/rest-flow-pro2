import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Calendar,
  History,
  KeyRound,
  Sun,
  TrendingUp,
} from "lucide-react";
import { getMinhaSemana } from "@/lib/escala.functions";
import { alterarMinhaSenha } from "@/lib/me.functions";
import {
  aceitarTroca,
  cancelarTroca,
  criarTroca,
  listarTrocasFuncionario,
} from "@/lib/trocas.functions";
import { DIAS_SEMANA_LONGO, formatBR } from "@/lib/scheduling/date-utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  ssr: false,
  component: FuncionarioHome,
});

function FuncionarioHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getMinha = useServerFn(getMinhaSemana);
  const listar = useServerFn(listarTrocasFuncionario);

  const semanaQ = useQuery({ queryKey: ["me/semana"], queryFn: () => getMinha() });
  const trocasQ = useQuery({ queryKey: ["me/trocas"], queryFn: () => listar() });

  // Realtime nas trocas
  useEffect(() => {
    const ch = supabase
      .channel("trocas-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trocas" },
        (payload: any) => {
          qc.invalidateQueries({ queryKey: ["me/trocas"] });
          if (payload.eventType === "INSERT") toast.info("Nova oferta de troca disponível.");
          if (payload.eventType === "UPDATE" && payload.new?.status === "aceita")
            toast.success("Uma oferta foi aceita.");
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  if (semanaQ.isLoading) {
    return (
      <AppShell title="Meu painel">
        <p className="text-muted-foreground">Carregando...</p>
      </AppShell>
    );
  }
  const s = semanaQ.data;
  if (!s) {
    return (
      <AppShell title="Meu painel">
        <Card className="p-6">
          <p>Seu cadastro de funcionário não foi encontrado. Fale com o administrador.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Olá, ${s.funcionario.nome}`}>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Sua próxima folga"
          value={s.folgaAtual ? formatBR(s.folgaAtual) : "Não definida"}
          hint={s.folgaAtual ? diaLongo(s.folgaAtual) : "Aguardando escala"}
        />
        <StatCard
          icon={<Sun className="h-5 w-5" />}
          label="Ciclo de domingos"
          value={`${s.contador_domingos} de 3`}
          hint={
            s.contador_domingos >= 3
              ? "Próximo domingo é folga"
              : `Trabalhando ${s.contador_domingos} domingo(s) seguido(s)`
          }
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Dias consecutivos"
          value={`${s.dias_consecutivos} dia(s)`}
          hint="Até sua próxima folga"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Semana atual</h3>
            <Badge variant="secondary">{(s.funcionario as any).setor || "Sem setor"}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            Horário: <span className="font-mono">{formatHorario(s.funcionario)}</span>
          </div>
          {s.folgaAtual ? (
            <div className="rounded-lg bg-primary-soft p-4">
              <p className="text-xs text-muted-foreground">Sua folga</p>
              <p className="text-lg font-semibold">{diaLongo(s.folgaAtual)}</p>
              <p className="text-sm text-muted-foreground">{formatBR(s.folgaAtual)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Escala ainda não publicada para esta semana.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Próxima semana</h3>
            <Badge variant="outline">Liberada a partir de quinta</Badge>
          </div>
          {s.folgaProxima ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">Sua folga</p>
              <p className="text-lg font-semibold">{diaLongo(s.folgaProxima)}</p>
              <p className="text-sm text-muted-foreground">{formatBR(s.folgaProxima)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Disponível a partir de quinta-feira.
            </p>
          )}
        </Card>
      </div>

      <Tabs defaultValue="trocas">
        <TabsList>
          <TabsTrigger value="trocas">
            <ArrowRightLeft className="h-4 w-4 mr-2" /> Trocas
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="h-4 w-4 mr-2" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="conta">
            <KeyRound className="h-4 w-4 mr-2" /> Conta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trocas" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Solicitar troca</h3>
                <p className="text-sm text-muted-foreground">
                  Ofereça sua folga para os colegas.
                </p>

              </div>
              <NovaTrocaDialog folgaAtual={s.folgaAtual} folgaProxima={s.folgaProxima} />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">Ofertas disponíveis</h3>
            {trocasQ.data?.ofertas.length ? (
              <ul className="divide-y">
                {trocasQ.data.ofertas.map((t: any) => (
                  <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{t.criador?.nome}</span> quer folgar em{" "}
                        <span className="font-medium">{formatBR(t.data_desejada)}</span>{" "}
                        e oferece <span className="font-medium">{formatBR(t.data_origem)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expira em{" "}
                        {new Date(t.expira_em).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <AceitarBtn id={t.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sem ofertas compatíveis no momento.</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">Minhas ofertas</h3>
            {trocasQ.data?.minhas.length ? (
              <ul className="divide-y">
                {trocasQ.data.minhas.map((t: any) => (
                  <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm">
                        Ofereço {formatBR(t.data_origem)} → quero {formatBR(t.data_desejada)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: <StatusBadge status={t.status} />
                      </p>
                    </div>
                    {t.status === "aberta" && <CancelarBtn id={t.id} />}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Você ainda não fez ofertas.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Meu histórico de trocas</h3>
            {trocasQ.data?.historico.length ? (
              <ul className="divide-y">
                {trocasQ.data.historico.map((h: any) => (
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
        </TabsContent>

        <TabsContent value="conta">
          <AlterarSenhaCard />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function diaLongo(iso: string) {
  const d = new Date(iso + "T00:00:00Z").getUTCDay();
  return DIAS_SEMANA_LONGO[d];
}

function formatHorario(f: any) {
  const ent = f.horario_entrada || "--:--";
  const ini = f.horario_intervalo_inicio || "--:--";
  const vol = f.horario_intervalo_volta || "--:--";
  const sai = f.horario_saida || "--:--";
  return `${ent} · int ${ini}-${vol} · ${sai}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    aberta: { label: "Aberta", variant: "default" },
    aceita: { label: "Aceita", variant: "secondary" },
    cancelada: { label: "Cancelada", variant: "outline" },
    expirada: { label: "Expirada", variant: "destructive" },
  };
  const cfg = map[status] || map.aberta;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function NovaTrocaDialog({
  folgaAtual,
  folgaProxima,
}: {
  folgaAtual: string | null;
  folgaProxima: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [origem, setOrigem] = useState<string>("");
  const [desejada, setDesejada] = useState<string>("");
  const criar = useServerFn(criarTroca);
  const qc = useQueryClient();

  const options = [folgaAtual, folgaProxima].filter(Boolean) as string[];

  const mut = useMutation({
    mutationFn: async () => criar({ data: { data_origem: origem, data_desejada: desejada } }),
    onSuccess: () => {
      toast.success("Oferta criada. Expira em 30 min.");
      qc.invalidateQueries({ queryKey: ["me/trocas"] });
      setOpen(false);
      setOrigem("");
      setDesejada("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!options.length}>Nova oferta</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar troca</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Sua folga (oferecer)</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o} value={o}>
                    {formatBR(o)} — {diaLongo(o)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dia que deseja folgar</Label>
            <Input
              type="date"
              value={desejada}
              onChange={(e) => setDesejada(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Sábado nunca pode ser folga.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mut.mutate()}
            disabled={!origem || !desejada || mut.isPending}
          >
            {mut.isPending ? "Enviando..." : "Criar oferta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AceitarBtn({ id }: { id: string }) {
  const aceitar = useServerFn(aceitarTroca);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => aceitar({ data: { id } }),
    onSuccess: () => {
      toast.success("Troca realizada!");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
      Aceitar
    </Button>
  );
}

function CancelarBtn({ id }: { id: string }) {
  const cancelar = useServerFn(cancelarTroca);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => cancelar({ data: { id } }),
    onSuccess: () => {
      toast.success("Cancelada.");
      qc.invalidateQueries({ queryKey: ["me/trocas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Button variant="outline" size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>
      Cancelar
    </Button>
  );
}

function AlterarSenhaCard() {
  const [nova, setNova] = useState("");
  const alterar = useServerFn(alterarMinhaSenha);
  const mut = useMutation({
    mutationFn: () => alterar({ data: { nova_senha: nova } }),
    onSuccess: () => {
      toast.success("Senha alterada.");
      setNova("");
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card className="p-5 max-w-md">
      <h3 className="font-semibold mb-3">Alterar minha senha</h3>
      <div className="space-y-3">
        <div>
          <Label>Nova senha (4 dígitos numéricos)</Label>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={nova}
            onChange={(e) => setNova(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
        <Button onClick={() => mut.mutate()} disabled={!/^\d{4}$/.test(nova) || mut.isPending}>
          Salvar
        </Button>
      </div>
    </Card>
  );
}
