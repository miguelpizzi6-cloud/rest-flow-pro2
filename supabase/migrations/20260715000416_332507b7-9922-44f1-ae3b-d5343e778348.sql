
-- 1) Enum de setores
DO $$ BEGIN
  CREATE TYPE public.setor AS ENUM ('Tesouraria','Frente de Caixa','Fiscais','Atendimento','Empacotadores','Delivery');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) Ajuste de colunas em funcionarios
ALTER TABLE public.funcionarios
  DROP COLUMN IF EXISTS horario;

ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS horario_entrada text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS horario_intervalo_inicio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS horario_intervalo_volta text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS horario_saida text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS setor public.setor NOT NULL DEFAULT 'Frente de Caixa';

-- 3) Remove todos os funcionários exceto miguel1 e miguel2
--    Deletar em auth.users faz cascata via FK em funcionarios.user_id/user_roles
DELETE FROM auth.users
  WHERE id IN (
    SELECT user_id FROM public.funcionarios
     WHERE matricula NOT IN ('miguel1','miguel2') AND user_id IS NOT NULL
  );

DELETE FROM public.funcionarios
  WHERE matricula NOT IN ('miguel1','miguel2');

-- 4) Redefine senha de miguel1/miguel2 para 1234
UPDATE auth.users
   SET encrypted_password = crypt('1234', gen_salt('bf'))
 WHERE id IN (
   SELECT user_id FROM public.funcionarios WHERE matricula IN ('miguel1','miguel2')
 );
