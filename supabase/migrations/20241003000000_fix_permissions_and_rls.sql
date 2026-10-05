-- =======================================================
-- Levantamento PDM 2025/2026 – Pé-de-Meia
-- Migration: Correção de permissões de tabela e recursão de RLS
-- =======================================================

-- 1. Conceder permissões completas no schema public para os papéis da API
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Reescrever funções de contexto de papel em PL/pgSQL com SECURITY DEFINER
-- Isso impede a inlining do planejador SQL do PostgreSQL e previne recursão infinita no RLS.
CREATE OR REPLACE FUNCTION public.get_meu_papel()
RETURNS text AS $$
DECLARE
  v_papel text;
BEGIN
  SELECT papel INTO v_papel FROM public.perfis WHERE id = auth.uid();
  RETURN v_papel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_minha_sre_id()
RETURNS integer AS $$
DECLARE
  v_id integer;
BEGIN
  SELECT sre_id INTO v_id FROM public.perfis WHERE id = auth.uid();
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_minha_escola_id()
RETURNS integer AS $$
DECLARE
  v_id integer;
BEGIN
  SELECT escola_id INTO v_id FROM public.perfis WHERE id = auth.uid();
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_meu_papel() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_minha_sre_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_minha_escola_id() TO authenticated, service_role;

-- 3. Atualizar políticas de RLS em perfis para evitar recursão
DROP POLICY IF EXISTS perfis_own ON perfis;
DROP POLICY IF EXISTS perfis_admin ON perfis;
DROP POLICY IF EXISTS perfis_select_own ON perfis;
DROP POLICY IF EXISTS perfis_all_admin ON perfis;

CREATE POLICY perfis_select_own ON perfis FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.get_meu_papel() = 'admin');

CREATE POLICY perfis_all_admin ON perfis FOR ALL TO authenticated
  USING (public.get_meu_papel() = 'admin');

-- 4. Garantir políticas em SREs e Escolas
DROP POLICY IF EXISTS sres_select ON sres;
CREATE POLICY sres_select ON sres FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sres_admin ON sres;
CREATE POLICY sres_admin ON sres FOR ALL TO authenticated USING (public.get_meu_papel() = 'admin');

DROP POLICY IF EXISTS status_select ON status_situacao;
CREATE POLICY status_select ON status_situacao FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS status_admin ON status_situacao;
CREATE POLICY status_admin ON status_situacao FOR ALL TO authenticated USING (public.get_meu_papel() = 'admin');
