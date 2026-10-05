import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { escolaDadosSchema, type EscolaDadosForm, formatPhone, onlyDigits } from '@/lib/validation';
import { useAtualizarEscola } from '@/hooks/useData';
import type { Escola } from '@/types';

interface Props {
  escola: Escola;
  sreNome: string;
}

export function DadosUnidadeTab({ escola, sreNome }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const atualizarEscola = useAtualizarEscola();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EscolaDadosForm>({
    resolver: zodResolver(escolaDadosSchema),
    defaultValues: {
      cidade: escola.cidade ?? '',
      gestor_nome: escola.gestor_nome ?? '',
      gestor_contato: escola.gestor_contato ?? '',
      equipe_multiprofissional: escola.equipe_multiprofissional ?? '',
      ponto_focal_pdm_nome: escola.ponto_focal_pdm_nome ?? '',
      ponto_focal_pdm_contato: escola.ponto_focal_pdm_contato ?? '',
    },
  });

  useEffect(() => {
    reset({
      cidade: escola.cidade ?? '',
      gestor_nome: escola.gestor_nome ?? '',
      gestor_contato: escola.gestor_contato ?? '',
      equipe_multiprofissional: escola.equipe_multiprofissional ?? '',
      ponto_focal_pdm_nome: escola.ponto_focal_pdm_nome ?? '',
      ponto_focal_pdm_contato: escola.ponto_focal_pdm_contato ?? '',
    });
  }, [escola, reset]);

  const handleCancel = () => {
    reset({
      cidade: escola.cidade ?? '',
      gestor_nome: escola.gestor_nome ?? '',
      gestor_contato: escola.gestor_contato ?? '',
      equipe_multiprofissional: escola.equipe_multiprofissional ?? '',
      ponto_focal_pdm_nome: escola.ponto_focal_pdm_nome ?? '',
      ponto_focal_pdm_contato: escola.ponto_focal_pdm_contato ?? '',
    });
    setIsEditing(false);
  };

  const onSubmit = (data: EscolaDadosForm) => {
    atualizarEscola.mutate(
      {
        id: escola.id,
        dados: {
          ...data,
          cidade: escola.cidade ?? data.cidade ?? '',
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handlePhoneChange = (field: 'gestor_contato' | 'ponto_focal_pdm_contato') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const raw = onlyDigits(e.target.value);
    setValue(field, formatPhone(raw), { shouldDirty: true });
  };

  return (
    <div className="card p-6 animate-fade-in">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Read-only fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
          <div>
            <label className="label">Nome da Unidade Escolar</label>
            <p className="text-sm font-medium text-surface-900">{escola.nome}</p>
          </div>
          <div>
            <label className="label">Código INEP</label>
            <p className="text-sm font-medium text-surface-900 font-mono">{escola.codigo_inep}</p>
          </div>
          <div>
            <label className="label">Superintendência</label>
            <p className="text-sm font-medium text-surface-900">{sreNome}</p>
          </div>
          <div>
            <label className="label">Cidade</label>
            <p className="text-sm font-medium text-surface-900">{escola.cidade || '—'}</p>
          </div>
        </div>

        {/* Section before Gestor: Editar / Salvar / Cancelar */}
        <div className="flex items-center justify-between border-t border-surface-200 pt-4 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-semibold text-surface-900">Informações da Gestão</h3>
            <p className="text-xs text-surface-500">
              {isEditing
                ? 'Edite as informações abaixo e clique em Salvar'
                : 'Clique em Editar para alterar os dados do gestor e equipe'}
            </p>
          </div>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn-primary flex items-center gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={atualizarEscola.isPending}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={atualizarEscola.isPending}
                className="btn-primary flex items-center gap-1.5"
              >
                {atualizarEscola.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Salvar
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <h4 className="text-sm font-semibold text-surface-700 mb-3">Gestor(a)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="gestor_nome" className="label">Nome do Gestor(a)</label>
                <input
                  id="gestor_nome"
                  type="text"
                  disabled={!isEditing}
                  className="input-field disabled:bg-surface-100 disabled:text-surface-500 disabled:cursor-not-allowed"
                  placeholder="Nome completo"
                  {...register('gestor_nome')}
                />
                {errors.gestor_nome && (
                  <p className="mt-1 text-xs text-red-500">{errors.gestor_nome.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="gestor_contato" className="label">Contato</label>
                <input
                  id="gestor_contato"
                  type="text"
                  disabled={!isEditing}
                  className="input-field disabled:bg-surface-100 disabled:text-surface-500 disabled:cursor-not-allowed"
                  placeholder="(63) 99999-9999"
                  {...register('gestor_contato')}
                  onChange={handlePhoneChange('gestor_contato')}
                />
                {errors.gestor_contato && (
                  <p className="mt-1 text-xs text-red-500">{errors.gestor_contato.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="equipe_multiprofissional" className="label">Equipe Multiprofissional</label>
            <textarea
              id="equipe_multiprofissional"
              rows={2}
              disabled={!isEditing}
              className="input-field resize-none disabled:bg-surface-100 disabled:text-surface-500 disabled:cursor-not-allowed"
              placeholder="Nomes dos membros da equipe"
              {...register('equipe_multiprofissional')}
            />
          </div>

          <div className="sm:col-span-2 border-t border-surface-200 pt-4">
            <h4 className="text-sm font-semibold text-surface-700 mb-3">Ponto Focal do Programa Pé-de-Meia</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ponto_focal_pdm_nome" className="label">Nome</label>
                <input
                  id="ponto_focal_pdm_nome"
                  type="text"
                  disabled={!isEditing}
                  className="input-field disabled:bg-surface-100 disabled:text-surface-500 disabled:cursor-not-allowed"
                  placeholder="Nome completo"
                  {...register('ponto_focal_pdm_nome')}
                />
                {errors.ponto_focal_pdm_nome && (
                  <p className="mt-1 text-xs text-red-500">{errors.ponto_focal_pdm_nome.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="ponto_focal_pdm_contato" className="label">Contato</label>
                <input
                  id="ponto_focal_pdm_contato"
                  type="text"
                  disabled={!isEditing}
                  className="input-field disabled:bg-surface-100 disabled:text-surface-500 disabled:cursor-not-allowed"
                  placeholder="(63) 99999-9999"
                  {...register('ponto_focal_pdm_contato')}
                  onChange={handlePhoneChange('ponto_focal_pdm_contato')}
                />
                {errors.ponto_focal_pdm_contato && (
                  <p className="mt-1 text-xs text-red-500">{errors.ponto_focal_pdm_contato.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom actions when editing */}
        {isEditing && (
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={atualizarEscola.isPending}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={atualizarEscola.isPending}
              className="btn-primary flex items-center gap-1.5"
            >
              {atualizarEscola.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Salvar alterações
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
