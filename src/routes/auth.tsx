import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

/** Only same-origin relative paths are accepted as a post-login redirect. */
function safeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const target = safeNext(next);
        if (target) {
          window.location.replace(target);
          return;
        }
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id);
        const isAdmin = (roles ?? []).some((r) => r.role === "admin");
        navigate({ to: isAdmin ? "/admin" : "/app", replace: true });
      }
    });
  }, [navigate, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setLoading(true);
    try {
      const email = `${identifier.trim().toLowerCase()}@app.local`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        toast.error("Credenciais inválidas.");
        return;
      }
      const target = safeNext(next);
      if (target) {
        toast.success("Bem-vindo!");
        window.location.replace(target);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      toast.success("Bem-vindo!");
      navigate({ to: isAdmin ? "/admin" : "/app", replace: true });

    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft via-background to-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-elevated mb-4">
            <CalendarDays className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Inteligente de Folgas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Entre para acessar sua escala e trocas
          </p>
        </div>

        <Card className="p-6 shadow-soft">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="identifier">Matrícula</Label>
              <Input
                id="identifier"
                autoFocus
                autoComplete="username"
                placeholder="sua matrícula"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Não há cadastro público. Solicite acesso ao administrador.
        </p>
      </div>
    </div>
  );
}
