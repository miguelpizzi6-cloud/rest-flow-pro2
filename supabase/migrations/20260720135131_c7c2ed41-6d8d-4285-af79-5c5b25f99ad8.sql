ALTER TYPE public.setor RENAME VALUE 'Frente de Caixa' TO 'Operadores';
ALTER TABLE public.funcionarios ALTER COLUMN setor SET DEFAULT 'Operadores'::public.setor;