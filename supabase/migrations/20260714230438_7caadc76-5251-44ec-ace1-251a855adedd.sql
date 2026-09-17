
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS horario text NOT NULL DEFAULT '';
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Ativo';
ALTER TABLE public.funcionarios DROP CONSTRAINT IF EXISTS funcionarios_status_check;
ALTER TABLE public.funcionarios ADD CONSTRAINT funcionarios_status_check
  CHECK (status IN ('Ativo', 'Férias', 'Sustentação'));

UPDATE public.funcionarios SET horario = turno WHERE horario = '' AND turno IS NOT NULL;
UPDATE public.funcionarios SET status = 'Férias' WHERE ativo = false AND status = 'Ativo';

-- Recria política que dependia de funcionarios.turno
DROP POLICY IF EXISTS "trocas visibility" ON public.trocas;
CREATE POLICY "trocas visibility" ON public.trocas
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.funcionarios f WHERE f.id = trocas.criador_id AND f.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.funcionarios f WHERE f.id = trocas.aceito_por AND f.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.funcionarios f WHERE f.user_id = auth.uid() AND f.ativo = true)
);

ALTER TABLE public.funcionarios DROP COLUMN IF EXISTS turno;
ALTER TABLE public.trocas ALTER COLUMN turno DROP NOT NULL;
