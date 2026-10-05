-- =============================================
-- Levantamento PDM 2025/2026 – Pé-de-Meia
-- Migration: Criação automática de perfil ao cadastrar usuário no auth
-- =============================================

-- 1. Função para criar perfil automaticamente a partir do auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_nome text;
  v_papel text;
  v_sre_id integer;
  v_escola_id integer;
  v_total_perfis integer;
BEGIN
  -- Extrair nome dos metadados ou do e-mail
  v_nome := COALESCE(
    NEW.raw_user_meta_data->>'nome',
    split_part(NEW.email, '@', 1),
    'Usuário'
  );

  -- Se for o primeiro usuário da base, define como admin automaticamente
  SELECT count(*) INTO v_total_perfis FROM public.perfis;
  IF v_total_perfis = 0 THEN
    v_papel := 'admin';
  ELSE
    v_papel := COALESCE(NEW.raw_user_meta_data->>'papel', 'admin');
  END IF;

  -- Validar papel permitido
  IF v_papel NOT IN ('admin', 'sre', 'escola') THEN
    v_papel := 'admin';
  END IF;

  -- Extrair sre_id e escola_id se informados
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

  -- Inserir ou atualizar na tabela pública perfis
  INSERT INTO public.perfis (id, nome, papel, sre_id, escola_id)
  VALUES (NEW.id, v_nome, v_papel, v_sre_id, v_escola_id)
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, perfis.nome),
    papel = COALESCE(perfis.papel, EXCLUDED.papel);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de qualquer erro, registra aviso sem travar criação no auth
  RAISE WARNING 'Erro ao criar perfil automático para o usuário %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Função RPC de auto-recuperação (chama quando o usuário loga e seu perfil não foi encontrado)
CREATE OR REPLACE FUNCTION public.garantir_meu_perfil()
RETURNS public.perfis AS $$
DECLARE
  v_perfil public.perfis%ROWTYPE;
  v_user auth.users%ROWTYPE;
  v_nome text;
  v_papel text;
  v_total_perfis integer;
BEGIN
  -- Se o perfil já existe, retorna direto
  SELECT * INTO v_perfil FROM public.perfis WHERE id = auth.uid();
  IF FOUND THEN
    RETURN v_perfil;
  END IF;

  -- Busca dados do usuário autenticado no auth.users
  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Define papel (se for o primeiro, é admin)
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

-- 4. Políticas de RLS em perfis para permitir inserção/atualização do próprio perfil
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

-- 5. Backfill imediato para usuários já cadastrados no auth.users sem registro em perfis
INSERT INTO public.perfis (id, nome, papel)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1), 'Administrador'),
  COALESCE(u.raw_user_meta_data->>'papel', 'admin')
FROM auth.users u
LEFT JOIN public.perfis p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
