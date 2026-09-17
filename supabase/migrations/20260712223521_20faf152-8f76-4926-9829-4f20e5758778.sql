
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'funcionario');
CREATE TYPE public.escala_status AS ENUM ('folga', 'trabalho');
CREATE TYPE public.troca_status AS ENUM ('aberta', 'aceita', 'cancelada', 'expirada');

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- FUNCIONARIOS
CREATE TABLE public.funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  matricula text UNIQUE NOT NULL,
  nome text NOT NULL,
  turno text NOT NULL DEFAULT 'A',
  ativo boolean NOT NULL DEFAULT true,
  contador_domingos int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.funcionarios TO authenticated;
GRANT ALL ON public.funcionarios TO service_role;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "func self or admin read" ON public.funcionarios FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin manage funcionarios" ON public.funcionarios FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ESCALAS
CREATE TABLE public.escalas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data date NOT NULL,
  status public.escala_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funcionario_id, data)
);
GRANT SELECT ON public.escalas TO authenticated;
GRANT ALL ON public.escalas TO service_role;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
CREATE INDEX escalas_data_idx ON public.escalas(data);
CREATE INDEX escalas_func_idx ON public.escalas(funcionario_id);

CREATE POLICY "escala self or admin" ON public.escalas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.funcionarios f WHERE f.id = funcionario_id AND f.user_id = auth.uid())
);
CREATE POLICY "admin manage escalas" ON public.escalas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TROCAS
CREATE TABLE public.trocas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criador_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  escala_origem_id uuid REFERENCES public.escalas(id) ON DELETE SET NULL,
  data_origem date NOT NULL,
  data_desejada date NOT NULL,
  turno text NOT NULL,
  aceito_por uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  status public.troca_status NOT NULL DEFAULT 'aberta',
  expira_em timestamptz NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trocas TO authenticated;
GRANT ALL ON public.trocas TO service_role;
ALTER TABLE public.trocas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trocas visibility" ON public.trocas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.funcionarios f WHERE f.id = criador_id AND f.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.funcionarios f WHERE f.id = aceito_por AND f.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.funcionarios f WHERE f.user_id = auth.uid() AND f.turno = trocas.turno AND f.ativo = true)
);
CREATE POLICY "admin manage trocas" ON public.trocas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- HISTORICO TROCAS
CREATE TABLE public.historico_trocas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  troca_id uuid REFERENCES public.trocas(id) ON DELETE SET NULL,
  funcionario1_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  funcionario2_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  data_troca timestamptz NOT NULL DEFAULT now(),
  descricao text
);
GRANT SELECT ON public.historico_trocas TO authenticated;
GRANT ALL ON public.historico_trocas TO service_role;
ALTER TABLE public.historico_trocas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hist visibility" ON public.historico_trocas FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.funcionarios f WHERE f.id = funcionario1_id AND f.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.funcionarios f WHERE f.id = funcionario2_id AND f.user_id = auth.uid())
);

-- updated_at trigger for funcionarios
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER funcionarios_updated_at BEFORE UPDATE ON public.funcionarios
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Enable Realtime for trocas
ALTER PUBLICATION supabase_realtime ADD TABLE public.trocas;
