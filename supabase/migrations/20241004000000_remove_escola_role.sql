-- =======================================================
-- Levantamento PDM 2025/2026 – Pé-de-Meia
-- Migration: Remoção do perfil 'escola' (mantendo apenas 'admin' e 'sre')
-- =======================================================

-- 1. Migrar eventuais perfis 'escola' existentes para 'sre'
UPDATE public.perfis SET papel = 'sre' WHERE papel = 'escola';

-- 2. Atualizar a constraint de validação do papel na tabela perfis
ALTER TABLE public.perfis DROP CONSTRAINT IF EXISTS perfis_papel_check;
ALTER TABLE public.perfis ADD CONSTRAINT perfis_papel_check CHECK (papel IN ('admin', 'sre'));

-- 3. Atualizar o trigger de criação automática de usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_nome text;
  v_papel text;
  v_sre_id integer;
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
    v_papel := COALESCE(NEW.raw_user_meta_data->>'papel', 'sre');
  END IF;

  -- Permite apenas 'admin' ou 'sre'
  IF v_papel NOT IN ('admin', 'sre') THEN
    v_papel := 'sre';
  END IF;

  IF (NEW.raw_user_meta_data->>'sre_id') IS NOT NULL AND (NEW.raw_user_meta_data->>'sre_id') <> '' THEN
    v_sre_id := (NEW.raw_user_meta_data->>'sre_id')::integer;
  ELSE
    v_sre_id := NULL;
  END IF;

  INSERT INTO public.perfis (id, nome, papel, sre_id, escola_id)
  VALUES (NEW.id, v_nome, v_papel, v_sre_id, NULL)
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, perfis.nome),
    papel = COALESCE(perfis.papel, EXCLUDED.papel);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao criar perfil automático para o usuário %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atualizar a função RPC de auto-recuperação
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
    -- Garante que se o perfil tiver 'escola', seja ajustado para 'sre'
    IF v_perfil.papel = 'escola' THEN
      UPDATE public.perfis SET papel = 'sre' WHERE id = v_perfil.id RETURNING * INTO v_perfil;
    END IF;
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
    v_papel := COALESCE(v_user.raw_user_meta_data->>'papel', 'sre');
  END IF;

  IF v_papel NOT IN ('admin', 'sre') THEN
    v_papel := 'sre';
  END IF;

  v_nome := COALESCE(
    v_user.raw_user_meta_data->>'nome',
    split_part(v_user.email, '@', 1),
    'Administrador'
  );

  INSERT INTO public.perfis (id, nome, papel, sre_id, escola_id)
  VALUES (
    v_user.id,
    v_nome,
    v_papel,
    (v_user.raw_user_meta_data->>'sre_id')::integer,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome
  RETURNING * INTO v_perfil;

  RETURN v_perfil;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Limpar políticas antigas de RLS do papel 'escola' que não são mais necessárias
DROP POLICY IF EXISTS escolas_select_escola ON escolas;
DROP POLICY IF EXISTS escolas_update_escola ON escolas;
DROP POLICY IF EXISTS estudantes_select_escola ON estudantes;
DROP POLICY IF EXISTS estudantes_insert_escola ON estudantes;
DROP POLICY IF EXISTS estudantes_update_escola ON estudantes;
DROP POLICY IF EXISTS estudantes_delete_escola ON estudantes;
DROP POLICY IF EXISTS obs_select_escola ON observacoes;
DROP POLICY IF EXISTS obs_insert_escola ON observacoes;
