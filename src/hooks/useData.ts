import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type {
  Sre,
  Escola,
  StatusSituacao,
  Estudante,
  Observacao,
  Perfil,
  Papel,
  Auditoria,
  SreDashboard,
  EscolaResumo,
} from '@/types';
import type {
  EscolaDadosForm,
  EstudanteForm,
  ObservacaoForm,
  StatusSituacaoForm,
} from '@/lib/validation';
import toast from 'react-hot-toast';

// ========================
// SREs
// ========================

export function useSres() {
  return useQuery<Sre[]>({
    queryKey: ['sres'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sres')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useSreDashboard() {
  return useQuery<SreDashboard[]>({
    queryKey: ['sre-dashboard'],
    queryFn: async () => {
      const { data: sres, error: sreErr } = await supabase
        .from('sres')
        .select('*')
        .order('nome');
      if (sreErr) throw new Error(sreErr.message || 'Erro ao carregar SREs');

      const { data: escolas, error: escErr } = await supabase
        .from('escolas')
        .select('id, sre_id');
      if (escErr) throw new Error(escErr.message || 'Erro ao carregar escolas');

      const { data: estudantes, error: estErr } = await supabase
        .from('estudantes')
        .select('id, escola_id, situacao_2025_id, situacao_2026_id');
      if (estErr) throw new Error(estErr.message || 'Erro ao carregar estudantes');

      return (sres as Sre[]).map((sre) => {
        const escolasDaSre = (escolas as Array<{ id: number; sre_id: number }>).filter(
          (e) => e.sre_id === sre.id
        );
        const escolaIds = new Set(escolasDaSre.map((e) => e.id));
        const estudantesDaSre = (
          estudantes as Array<{
            id: string;
            escola_id: number;
            situacao_2025_id: number | null;
            situacao_2026_id: number | null;
          }>
        ).filter((e) => escolaIds.has(e.escola_id));

        const escolasComEstudantes = new Set(estudantesDaSre.map((e) => e.escola_id));
        const total = estudantesDaSre.length;
        const totalEscolas = escolasDaSre.length;

        const escolasCom2025 = new Set(
          estudantesDaSre.filter((e) => e.situacao_2025_id != null).map((e) => e.escola_id)
        );
        const escolasCom2026 = new Set(
          estudantesDaSre.filter((e) => e.situacao_2026_id != null).map((e) => e.escola_id)
        );

        return {
          ...sre,
          total_escolas: totalEscolas,
          escolas_com_estudantes: escolasComEstudantes.size,
          escolas_com_2025: escolasCom2025.size,
          escolas_com_2026: escolasCom2026.size,
          total_estudantes: total,
          pct_situacao_2025: totalEscolas > 0 ? Math.round((escolasCom2025.size / totalEscolas) * 100) : 0,
          pct_situacao_2026: totalEscolas > 0 ? Math.round((escolasCom2026.size / totalEscolas) * 100) : 0,
        };
      });
    },
    staleTime: 30000,
  });
}

// ========================
// Escolas
// ========================

export function useEscolasDaSre(sreId: number | undefined) {
  return useQuery<EscolaResumo[]>({
    queryKey: ['escolas', sreId],
    enabled: !!sreId,
    queryFn: async () => {
      const { data: escolas, error } = await supabase
        .from('escolas')
        .select('*')
        .eq('sre_id', sreId!)
        .order('nome');
      if (error) throw error;

      const escolaIds = (escolas as Escola[]).map((e) => e.id);
      if (escolaIds.length === 0) return [];

      const { data: estudantes, error: estErr } = await supabase
        .from('estudantes')
        .select('id, escola_id, situacao_2025_id, situacao_2026_id')
        .in('escola_id', escolaIds);
      if (estErr) throw estErr;

      const estudantesPorEscola = new Map<
        number,
        Array<{
          id: string;
          situacao_2025_id: number | null;
          situacao_2026_id: number | null;
        }>
      >();

      for (const est of estudantes as Array<{
        id: string;
        escola_id: number;
        situacao_2025_id: number | null;
        situacao_2026_id: number | null;
      }>) {
        const arr = estudantesPorEscola.get(est.escola_id) ?? [];
        arr.push(est);
        estudantesPorEscola.set(est.escola_id, arr);
      }

      return (escolas as Escola[]).map((escola) => {
        const ests = estudantesPorEscola.get(escola.id) ?? [];
        const total = ests.length;
        let status: 'vazio' | 'parcial' | 'completo' = 'vazio';
        if (total > 0) {
          const todosPreenchidos = ests.every(
            (e) => e.situacao_2025_id != null && e.situacao_2026_id != null
          );
          status = todosPreenchidos ? 'completo' : 'parcial';
        }

        return {
          ...escola,
          total_estudantes: total,
          status_preenchimento: status,
        };
      });
    },
  });
}

export function useEscola(escolaId: number | undefined) {
  return useQuery<Escola | null>({
    queryKey: ['escola', escolaId],
    enabled: !!escolaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolas')
        .select('*')
        .eq('id', escolaId!)
        .single();
      if (error) throw error;
      return data as Escola;
    },
  });
}

export function useAtualizarEscola() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id: number; dados: EscolaDadosForm }) => {
      const { error } = await supabase
        .from('escolas')
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['escola', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['escolas'] });
      toast.success('Dados da escola salvos com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });
}

// ========================
// Status Situação
// ========================

export function useStatusSituacao() {
  return useQuery<StatusSituacao[]>({
    queryKey: ['status-situacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_situacao')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return data as StatusSituacao[];
    },
    staleTime: 60000,
  });
}

export function useCriarStatusSituacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: StatusSituacaoForm) => {
      const { error } = await supabase.from('status_situacao').insert(dados);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-situacao'] });
      toast.success('Status criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar status: ${error.message}`);
    },
  });
}

export function useAtualizarStatusSituacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id: number; dados: Partial<StatusSituacaoForm> }) => {
      const { error } = await supabase.from('status_situacao').update(dados).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-situacao'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });
}

// ========================
// Estudantes
// ========================

export function useEstudantes(escolaId: number | undefined) {
  return useQuery<Estudante[]>({
    queryKey: ['estudantes', escolaId],
    enabled: !!escolaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estudantes')
        .select('*')
        .eq('escola_id', escolaId!)
        .order('nome');
      if (error) throw error;
      return data as Estudante[];
    },
  });
}

export function useCriarEstudante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      escolaId,
      dados,
    }: {
      escolaId: number;
      dados: EstudanteForm;
    }) => {
      const { error } = await supabase.from('estudantes').insert({
        escola_id: escolaId,
        ...dados,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estudantes', variables.escolaId] });
      queryClient.invalidateQueries({ queryKey: ['sre-dashboard'] });
      toast.success('Estudante cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      const msg = error.message.includes('duplicate')
        ? 'Já existe um estudante com esta matrícula ou CPF nesta escola.'
        : error.message;
      toast.error(`Erro: ${msg}`);
    },
  });
}

export function useAtualizarEstudante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      escolaId,
      dados,
    }: {
      id: string;
      escolaId: number;
      dados: Partial<EstudanteForm>;
    }) => {
      const { error } = await supabase
        .from('estudantes')
        .update({
          ...dados,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      return escolaId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estudantes', variables.escolaId] });
      queryClient.invalidateQueries({ queryKey: ['sre-dashboard'] });
      toast.success('Estudante atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

export function useExcluirEstudante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, escolaId }: { id: string; escolaId: number }) => {
      const { error } = await supabase.from('estudantes').delete().eq('id', id);
      if (error) throw error;
      return escolaId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estudantes', variables.escolaId] });
      queryClient.invalidateQueries({ queryKey: ['sre-dashboard'] });
      toast.success('Estudante excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });
}

export function useAtualizarSituacaoEmLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids,
      escolaId,
      campo,
      valorId,
    }: {
      ids: string[];
      escolaId: number;
      campo: 'situacao_2025_id' | 'situacao_2026_id';
      valorId: number;
    }) => {
      const { error } = await supabase
        .from('estudantes')
        .update({ [campo]: valorId, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      return escolaId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estudantes', variables.escolaId] });
      queryClient.invalidateQueries({ queryKey: ['sre-dashboard'] });
      toast.success(`Situação atualizada para ${variables.ids.length} estudantes!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro na atualização em lote: ${error.message}`);
    },
  });
}

export function useImportarEstudantes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      escolaId,
      estudantes,
    }: {
      escolaId: number;
      estudantes: Array<{
        id_sge_matricula: string;
        cpf: string;
        nome: string;
        situacao_2025_id: number | null;
        situacao_2026_id: number | null;
        observacoes?: string[];
      }>;
    }) => {
      const rows = estudantes.map((e) => ({
        escola_id: escolaId,
        id_sge_matricula: e.id_sge_matricula,
        cpf: e.cpf,
        nome: e.nome,
        situacao_2025_id: e.situacao_2025_id,
        situacao_2026_id: e.situacao_2026_id,
      }));

      const { data: upserted, error } = await supabase
        .from('estudantes')
        .upsert(rows, {
          onConflict: 'escola_id,id_sge_matricula',
        })
        .select('id, id_sge_matricula');

      if (error) throw error;

      // Tratar observações dos estudantes (para textos de situação não padronizados)
      const estudantesComObs = estudantes.filter(
        (e) => e.observacoes && e.observacoes.length > 0
      );

      let totalObsCriadas = 0;
      if (estudantesComObs.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        const idMap = new Map<string, string>();
        if (upserted && Array.isArray(upserted)) {
          upserted.forEach((u: { id: string; id_sge_matricula: string }) => {
            idMap.set(u.id_sge_matricula, u.id);
          });
        }

        // Buscar IDs faltantes caso upsert não tenha retornado todos
        const missingMatriculas = estudantesComObs
          .map((e) => e.id_sge_matricula)
          .filter((mat) => !idMap.has(mat));

        if (missingMatriculas.length > 0) {
          const { data: fetched } = await supabase
            .from('estudantes')
            .select('id, id_sge_matricula')
            .eq('escola_id', escolaId)
            .in('id_sge_matricula', missingMatriculas);
          if (fetched) {
            fetched.forEach((f: { id: string; id_sge_matricula: string }) => {
              idMap.set(f.id_sge_matricula, f.id);
            });
          }
        }

        // Evitar duplicar observações idênticas já cadastradas
        const { data: existingObs } = await supabase
          .from('observacoes')
          .select('estudante_id, texto')
          .eq('escola_id', escolaId)
          .not('estudante_id', 'is', null);

        const existingSet = new Set(
          (existingObs ?? []).map((o) => `${o.estudante_id}::${o.texto}`)
        );

        const obsRows: Array<{
          escola_id: number;
          estudante_id: string;
          texto: string;
          autor_id?: string;
        }> = [];

        for (const est of estudantesComObs) {
          const estudanteId = idMap.get(est.id_sge_matricula);
          if (!estudanteId) continue;

          for (const texto of est.observacoes!) {
            const key = `${estudanteId}::${texto}`;
            if (!existingSet.has(key)) {
              existingSet.add(key);
              obsRows.push({
                escola_id: escolaId,
                estudante_id: estudanteId,
                texto,
                ...(userId ? { autor_id: userId } : {}),
              });
            }
          }
        }

        if (obsRows.length > 0) {
          const { error: obsError } = await supabase
            .from('observacoes')
            .insert(obsRows);
          if (obsError) {
            console.error('Erro ao registrar observações de situação:', obsError);
          } else {
            totalObsCriadas = obsRows.length;
          }
        }
      }

      return { totalEstudantes: estudantes.length, totalObs: totalObsCriadas };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estudantes', variables.escolaId] });
      queryClient.invalidateQueries({ queryKey: ['observacoes', variables.escolaId] });
      queryClient.invalidateQueries({ queryKey: ['sre-dashboard'] });
      if (result.totalObs > 0) {
        toast.success(
          `${result.totalEstudantes} estudantes importados! (${result.totalObs} observação(ões) de situação registrada(s))`
        );
      } else {
        toast.success(`${result.totalEstudantes} estudantes importados com sucesso!`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });
}

// ========================
// Observações
// ========================

export function useObservacoes(escolaId: number | undefined) {
  return useQuery<Observacao[]>({
    queryKey: ['observacoes', escolaId],
    enabled: !!escolaId,
    queryFn: async () => {
      const { data: obsData, error: obsErr } = await supabase
        .from('observacoes')
        .select('*')
        .eq('escola_id', escolaId!)
        .order('created_at', { ascending: false });
      if (obsErr) throw obsErr;

      if (!obsData || obsData.length === 0) return [];

      const autorIds = [...new Set(obsData.map((o) => o.autor_id).filter(Boolean))];
      let perfisMap = new Map<string, Perfil>();

      if (autorIds.length > 0) {
        try {
          const { data: perfisData } = await supabase
            .from('perfis')
            .select('id, nome, papel')
            .in('id', autorIds);

          if (perfisData) {
            perfisMap = new Map(perfisData.map((p) => [p.id, p as Perfil]));
          }
        } catch {
          // ignore profile lookup failure
        }
      }

      return obsData.map((obs) => ({
        ...obs,
        autor: perfisMap.get(obs.autor_id),
      })) as Observacao[];
    },
  });
}

export function useCriarObservacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      escolaId,
      dados,
    }: {
      escolaId: number;
      dados: ObservacaoForm;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { error } = await supabase.from('observacoes').insert({
        escola_id: escolaId,
        texto: dados.texto,
        estudante_id: dados.estudante_id || null,
        ...(userId ? { autor_id: userId } : {}),
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['observacoes', variables.escolaId] });
      toast.success('Informação registrada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useExcluirObservacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, escolaId }: { id: string; escolaId: number }) => {
      const { error } = await supabase.from('observacoes').delete().eq('id', id);
      if (error) throw error;
      return escolaId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['observacoes', variables.escolaId] });
      toast.success('Observação excluída!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });
}

// ========================
// Admin: Perfis / Usuários
// ========================

export function usePerfis() {
  return useQuery<Perfil[]>({
    queryKey: ['perfis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as Perfil[];
    },
  });
}

export function useCriarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      email: string;
      senha: string;
      nome: string;
      papel: string;
      sre_id?: number | null;
      escola_id?: number | null;
    }) => {
      const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const session = (await supabase.auth.getSession()).data.session;

      // 1. Tentar via Edge Function se estiver implantada
      let edgeSuccess = false;
      try {
        const res = await fetch(`${baseUrl}/functions/v1/criar-usuario`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(dados),
        });
        if (res.ok) {
          edgeSuccess = true;
          return await res.json();
        }
      } catch {
        // Edge function não disponível ou sem deploy, prossegue com o fallback
      }

      // 2. Fallback direto via Supabase Auth + Trigger/Upsert no banco
      if (!edgeSuccess) {
        const tempClient = createClient(baseUrl, anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });

        const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
          email: dados.email,
          password: dados.senha,
          options: {
            data: {
              nome: dados.nome,
              papel: dados.papel,
              sre_id: dados.sre_id,
              escola_id: dados.escola_id,
            },
          },
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (signUpData.user) {
          // Garante a inserção/atualização direta na tabela de perfis
          const { error: perfilError } = await supabase
            .from('perfis')
            .upsert({
              id: signUpData.user.id,
              nome: dados.nome,
              papel: dados.papel as Papel,
              sre_id: dados.sre_id,
              escola_id: dados.escola_id,
            });

          if (perfilError) {
            console.warn('Aviso no perfil:', perfilError.message);
          }
        }

        return { success: true, user: signUpData.user };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] });
      toast.success('Usuário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useAtualizarPerfil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      dados,
    }: {
      id: string;
      dados: {
        nome?: string;
        papel?: Papel;
        sre_id?: number | null;
        escola_id?: number | null;
      };
    }) => {
      const { error } = await supabase
        .from('perfis')
        .update(dados)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perfis'] });
      toast.success('Papel do usuário atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

// ========================
// Auditoria
// ========================

export function useAuditoria(page: number, pageSize: number = 50) {
  return useQuery<{ data: Auditoria[]; count: number }>({
    queryKey: ['auditoria', page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('auditoria')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data as Auditoria[], count: count ?? 0 };
    },
  });
}

// ========================
// Todas as escolas (para admin)
// ========================

export function useTodasEscolas() {
  return useQuery<Escola[]>({
    queryKey: ['todas-escolas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escolas')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as Escola[];
    },
  });
}
