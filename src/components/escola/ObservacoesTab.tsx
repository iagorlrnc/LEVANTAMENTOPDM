import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { observacaoSchema, type ObservacaoForm } from '@/lib/validation';
import {
  useObservacoes,
  useCriarObservacao,
  useExcluirObservacao,
  useEstudantes,
} from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { ConfirmDialog, EmptyState, SkeletonTable } from '@/components/ui';
import { useState } from 'react';

interface Props {
  escolaId: number;
}

export function ObservacoesTab({ escolaId }: Props) {
  const { perfil } = useAuth();
  const { data: observacoes, isLoading, error } = useObservacoes(escolaId);
  const { data: estudantes } = useEstudantes(escolaId);
  const criarObservacao = useCriarObservacao();
  const excluirObservacao = useExcluirObservacao();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm<ObservacaoForm>({
    resolver: zodResolver(observacaoSchema),
    defaultValues: { texto: '', estudante_id: null },
  });

  const onSubmit = (data: ObservacaoForm) => {
    criarObservacao.mutate(
      { escolaId, dados: data },
      {
        onSuccess: () => {
          form.reset({ texto: '', estudante_id: null });
        },
      }
    );
  };

  const canDelete = (autorId: string) => {
    return perfil?.papel === 'admin' || perfil?.id === autorId;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add new observation */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-surface-900 mb-4">
          Adicionar informação
        </h3>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="obs-texto" className="label">Observação / Informação</label>
            <textarea
              id="obs-texto"
              rows={3}
              className="input-field resize-none"
              placeholder="Digite a informação que deseja registrar..."
              {...form.register('texto')}
            />
            {form.formState.errors.texto && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.texto.message}
              </p>
            )}
          </div>

          {estudantes && estudantes.length > 0 && (
            <div>
              <label htmlFor="obs-estudante" className="label">
                Vincular a estudante (opcional)
              </label>
              <select
                id="obs-estudante"
                className="select-field"
                value={form.watch('estudante_id') ?? ''}
                onChange={(e) =>
                  form.setValue('estudante_id', e.target.value || null)
                }
              >
                <option value="">— Informação geral da escola —</option>
                {estudantes.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.nome} ({est.id_sge_matricula})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={criarObservacao.isPending}
              className="btn-primary"
            >
              {criarObservacao.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                'Registrar observação'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">
          Erro ao carregar informações: {error instanceof Error ? error.message : 'Erro desconhecido'}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="card p-6">
          <SkeletonTable rows={3} />
        </div>
      )}

      {/* Observation list */}
      {!isLoading && observacoes && observacoes.length === 0 && (
        <EmptyState
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          }
          title="Nenhuma informação registrada"
          description="As informações adicionais registradas para esta escola aparecerão aqui."
        />
      )}

      {!isLoading && observacoes && observacoes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider">
              Informações registradas ({observacoes.length})
            </h3>
          </div>
          {observacoes.map((obs) => {
            const estudante = obs.estudante_id
              ? estudantes?.find((e) => e.id === obs.estudante_id)
              : null;

            return (
              <div
                key={obs.id}
                className="card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-primary-600">
                        {obs.autor?.nome ?? 'Usuário'}
                      </span>
                      <span className="text-xs text-surface-400">
                        {formatDate(obs.created_at)}
                      </span>
                      {obs.autor?.papel && (
                        <span className="badge-gray text-[10px] uppercase">
                          {obs.autor.papel}
                        </span>
                      )}
                      {estudante && (
                        <span className="badge-blue text-[10px]">
                          Estudante: {estudante.nome}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-surface-700 whitespace-pre-wrap">
                      {obs.texto}
                    </p>
                  </div>
                  {canDelete(obs.autor_id) && (
                    <button
                      onClick={() => setDeleteTarget(obs.id)}
                      className="p-1 text-surface-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Excluir"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            excluirObservacao.mutate({ id: deleteTarget, escolaId });
          }
        }}
        title="Excluir informação"
        message="Tem certeza que deseja excluir esta informação? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}
