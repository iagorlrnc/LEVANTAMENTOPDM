-- =============================================
-- Levantamento PDM 2025/2026 – Pé-de-Meia
-- Migration: initial schema
-- =============================================

-- SREs
CREATE TABLE sres (
  id integer PRIMARY KEY,
  nome text UNIQUE NOT NULL
);

-- Escolas
CREATE TABLE escolas (
  id integer PRIMARY KEY,
  codigo_inep text UNIQUE NOT NULL,
  nome text NOT NULL,
  sre_id integer NOT NULL REFERENCES sres(id),
  series_ofertadas text[] NOT NULL DEFAULT '{}',
  cidade text,
  gestor_nome text,
  gestor_contato text,
  equipe_multiprofissional text,
  ponto_focal_pdm_nome text,
  ponto_focal_pdm_contato text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_escolas_sre ON escolas(sre_id);

-- Status de Situação
CREATE TABLE status_situacao (
  id serial PRIMARY KEY,
  rotulo text UNIQUE NOT NULL,
  cor text NOT NULL DEFAULT '#64748b',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true
);

-- Seed initial status values
INSERT INTO status_situacao (rotulo, cor, ordem, ativo) VALUES
  ('Cursando/Frequente', '#0d9f6e', 1, true),
  ('Aprovado', '#1e5fa8', 2, true),
  ('Reprovado', '#dc2626', 3, true),
  ('Transferido', '#d97706', 4, true),
  ('Evadido/Abandono', '#ef4444', 5, true),
  ('Concluinte', '#7c3aed', 6, true),
  ('Não localizado', '#6b7280', 7, true),
  ('Sem informação', '#94a3b8', 8, true);

-- Estudantes
CREATE TABLE estudantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id integer NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  id_sge_matricula text NOT NULL,
  cpf text NOT NULL,
  nome text NOT NULL,
  situacao_2025_id integer REFERENCES status_situacao(id),
  situacao_2026_id integer REFERENCES status_situacao(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(escola_id, id_sge_matricula)
);

CREATE INDEX idx_estudantes_escola ON estudantes(escola_id);
CREATE INDEX idx_estudantes_cpf ON estudantes(cpf);

-- Observações
CREATE TABLE observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id integer NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  estudante_id uuid REFERENCES estudantes(id) ON DELETE SET NULL,
  texto text NOT NULL,
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_observacoes_escola ON observacoes(escola_id);

-- Perfis
CREATE TABLE perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  papel text NOT NULL CHECK (papel IN ('admin', 'sre', 'escola')),
  sre_id integer REFERENCES sres(id),
  escola_id integer REFERENCES escolas(id)
);

-- Auditoria
CREATE TABLE auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id text NOT NULL,
  acao text NOT NULL,
  dados_antes jsonb,
  dados_depois jsonb,
  usuario_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_auditoria_created ON auditoria(created_at DESC);

-- =============================================
-- Audit triggers
-- =============================================

CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria (tabela, registro_id, acao, dados_depois, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria (tabela, registro_id, acao, dados_antes, dados_depois, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria (tabela, registro_id, acao, dados_antes, usuario_id)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_escolas_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON escolas
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_estudantes_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON estudantes
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_observacoes_auditoria
  AFTER INSERT OR UPDATE OR DELETE ON observacoes
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE sres ENABLE ROW LEVEL SECURITY;
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_situacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE observacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Conceder permissões no schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Helper function to get current user's role (PL/pgSQL prevents inlining recursion)
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

-- SREs: everyone authenticated can read
CREATE POLICY sres_select ON sres FOR SELECT TO authenticated USING (true);
CREATE POLICY sres_admin ON sres FOR ALL TO authenticated USING (public.get_meu_papel() = 'admin');

-- Status Situação: everyone authenticated can read
CREATE POLICY status_select ON status_situacao FOR SELECT TO authenticated USING (true);
CREATE POLICY status_admin ON status_situacao FOR ALL TO authenticated USING (public.get_meu_papel() = 'admin');

-- Perfis: users can read their own; admin reads all
CREATE POLICY perfis_own ON perfis FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.get_meu_papel() = 'admin');
CREATE POLICY perfis_admin ON perfis FOR ALL TO authenticated
  USING (public.get_meu_papel() = 'admin');

-- Escolas
CREATE POLICY escolas_select_admin ON escolas FOR SELECT TO authenticated
  USING (get_meu_papel() = 'admin');
CREATE POLICY escolas_select_sre ON escolas FOR SELECT TO authenticated
  USING (get_meu_papel() = 'sre' AND sre_id = get_minha_sre_id());
CREATE POLICY escolas_select_escola ON escolas FOR SELECT TO authenticated
  USING (get_meu_papel() = 'escola' AND id = get_minha_escola_id());

CREATE POLICY escolas_update_admin ON escolas FOR UPDATE TO authenticated
  USING (get_meu_papel() = 'admin');
CREATE POLICY escolas_update_sre ON escolas FOR UPDATE TO authenticated
  USING (get_meu_papel() = 'sre' AND sre_id = get_minha_sre_id());
CREATE POLICY escolas_update_escola ON escolas FOR UPDATE TO authenticated
  USING (get_meu_papel() = 'escola' AND id = get_minha_escola_id());

CREATE POLICY escolas_insert_admin ON escolas FOR INSERT TO authenticated
  WITH CHECK (get_meu_papel() = 'admin');

-- Estudantes
CREATE POLICY estudantes_select_admin ON estudantes FOR SELECT TO authenticated
  USING (get_meu_papel() = 'admin');
CREATE POLICY estudantes_select_sre ON estudantes FOR SELECT TO authenticated
  USING (get_meu_papel() = 'sre' AND escola_id IN (SELECT id FROM escolas WHERE sre_id = get_minha_sre_id()));
CREATE POLICY estudantes_select_escola ON estudantes FOR SELECT TO authenticated
  USING (get_meu_papel() = 'escola' AND escola_id = get_minha_escola_id());

CREATE POLICY estudantes_insert_admin ON estudantes FOR INSERT TO authenticated
  WITH CHECK (get_meu_papel() = 'admin');
CREATE POLICY estudantes_insert_sre ON estudantes FOR INSERT TO authenticated
  WITH CHECK (get_meu_papel() = 'sre' AND escola_id IN (SELECT id FROM escolas WHERE sre_id = get_minha_sre_id()));
CREATE POLICY estudantes_insert_escola ON estudantes FOR INSERT TO authenticated
  WITH CHECK (get_meu_papel() = 'escola' AND escola_id = get_minha_escola_id());

CREATE POLICY estudantes_update_admin ON estudantes FOR UPDATE TO authenticated
  USING (get_meu_papel() = 'admin');
CREATE POLICY estudantes_update_sre ON estudantes FOR UPDATE TO authenticated
  USING (get_meu_papel() = 'sre' AND escola_id IN (SELECT id FROM escolas WHERE sre_id = get_minha_sre_id()));
CREATE POLICY estudantes_update_escola ON estudantes FOR UPDATE TO authenticated
  USING (get_meu_papel() = 'escola' AND escola_id = get_minha_escola_id());

CREATE POLICY estudantes_delete_admin ON estudantes FOR DELETE TO authenticated
  USING (get_meu_papel() = 'admin');
CREATE POLICY estudantes_delete_sre ON estudantes FOR DELETE TO authenticated
  USING (get_meu_papel() = 'sre' AND escola_id IN (SELECT id FROM escolas WHERE sre_id = get_minha_sre_id()));
CREATE POLICY estudantes_delete_escola ON estudantes FOR DELETE TO authenticated
  USING (get_meu_papel() = 'escola' AND escola_id = get_minha_escola_id());

-- Observações
CREATE POLICY obs_select_admin ON observacoes FOR SELECT TO authenticated
  USING (get_meu_papel() = 'admin');
CREATE POLICY obs_select_sre ON observacoes FOR SELECT TO authenticated
  USING (get_meu_papel() = 'sre' AND escola_id IN (SELECT id FROM escolas WHERE sre_id = get_minha_sre_id()));
CREATE POLICY obs_select_escola ON observacoes FOR SELECT TO authenticated
  USING (get_meu_papel() = 'escola' AND escola_id = get_minha_escola_id());

CREATE POLICY obs_insert_admin ON observacoes FOR INSERT TO authenticated
  WITH CHECK (get_meu_papel() = 'admin');
CREATE POLICY obs_insert_sre ON observacoes FOR INSERT TO authenticated
  WITH CHECK (get_meu_papel() = 'sre' AND escola_id IN (SELECT id FROM escolas WHERE sre_id = get_minha_sre_id()));
CREATE POLICY obs_insert_escola ON observacoes FOR INSERT TO authenticated
  WITH CHECK (get_meu_papel() = 'escola' AND escola_id = get_minha_escola_id());

CREATE POLICY obs_delete_own ON observacoes FOR DELETE TO authenticated
  USING (autor_id = auth.uid() OR get_meu_papel() = 'admin');

-- Auditoria: only admin
CREATE POLICY auditoria_admin ON auditoria FOR SELECT TO authenticated
  USING (get_meu_papel() = 'admin');

-- =============================================
-- Trigger: Criação automática de perfil ao cadastrar usuário no auth.users
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_nome text;
  v_papel text;
  v_sre_id integer;
  v_escola_id integer;
  v_total_perfis integer;
BEGIN
  v_nome := COALESCE(
    NEW.raw_user_meta_data->>'nome',
    split_part(NEW.email, '@', 1),
    'Usuário'
  );

  SELECT count(*) INTO v_total_perfis FROM public.perfis;
  IF v_total_perfis = 0 THEN
    v_papel := 'admin';
  ELSE
    v_papel := COALESCE(NEW.raw_user_meta_data->>'papel', 'admin');
  END IF;

  IF v_papel NOT IN ('admin', 'sre', 'escola') THEN
    v_papel := 'admin';
  END IF;

  IF (NEW.raw_user_meta_data->>'sre_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'sre_id') <> '' THEN
    v_sre_id := (NEW.raw_user_meta_data->>'sre_id')::integer;
  ELSE
    v_sre_id := NULL;
  END IF;

  IF (NEW.raw_user_meta_data->>'escola_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'escola_id') <> '' THEN
    v_escola_id := (NEW.raw_user_meta_data->>'escola_id')::integer;
  ELSE
    v_escola_id := NULL;
  END IF;

  INSERT INTO public.perfis (id, nome, papel, sre_id, escola_id)
  VALUES (NEW.id, v_nome, v_papel, v_sre_id, v_escola_id)
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, perfis.nome),
    papel = COALESCE(perfis.papel, EXCLUDED.papel);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao criar perfil automático para o usuário %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função RPC para garantir/recuperar perfil do usuário autenticado atual
CREATE OR REPLACE FUNCTION public.garantir_meu_perfil()
RETURNS public.perfis AS $$
DECLARE
  v_perfil public.perfis%ROWTYPE;
  v_user auth.users%ROWTYPE;
  v_nome text;
  v_papel text;
  v_total_perfis integer;
BEGIN
  SELECT * INTO v_perfil FROM public.perfis WHERE id = auth.uid();
  IF FOUND THEN
    RETURN v_perfil;
  END IF;

  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_total_perfis FROM public.perfis;
  IF v_total_perfis = 0 THEN
    v_papel := 'admin';
  ELSE
    v_papel := COALESCE(v_user.raw_user_meta_data->>'papel', 'admin');
  END IF;

  IF v_papel NOT IN ('admin', 'sre', 'escola') THEN
    v_papel := 'admin';
  END IF;

  v_nome := COALESCE(
    v_user.raw_user_meta_data->>'nome',
    split_part(v_user.email, '@', 1),
    'Administrador'
  );

  INSERT INTO public.perfis (id, nome, papel)
  VALUES (v_user.id, v_nome, v_papel)
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome
  RETURNING * INTO v_perfil;

  RETURN v_perfil;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.garantir_meu_perfil() TO authenticated;

-- Políticas adicionais para perfis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'perfis' AND policyname = 'perfis_insert_own'
  ) THEN
    CREATE POLICY perfis_insert_own ON perfis FOR INSERT TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'perfis' AND policyname = 'perfis_update_own'
  ) THEN
    CREATE POLICY perfis_update_own ON perfis FOR UPDATE TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Backfill para usuários pré-existentes
INSERT INTO public.perfis (id, nome, papel)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1), 'Administrador'),
  COALESCE(u.raw_user_meta_data->>'papel', 'admin')
FROM auth.users u
LEFT JOIN public.perfis p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
