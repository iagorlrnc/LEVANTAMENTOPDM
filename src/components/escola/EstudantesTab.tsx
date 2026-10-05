import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useEstudantes,
  useCriarEstudante,
  useAtualizarEstudante,
  useExcluirEstudante,
  useAtualizarSituacaoEmLote,
  useObservacoes,
} from '@/hooks/useData';
import { estudanteSchema, type EstudanteForm, maskCpf, formatCpf, onlyDigits } from '@/lib/validation';
import { Modal, ConfirmDialog, EmptyState, SkeletonTable } from '@/components/ui';
import type { StatusSituacao, Estudante } from '@/types';

interface Props {
  escolaId: number;
  statusList: StatusSituacao[];
}

export function EstudantesTab({ escolaId, statusList }: Props) {
  const { data: estudantes, isLoading } = useEstudantes(escolaId);
  const { data: observacoes } = useObservacoes(escolaId);
  const criarEstudante = useCriarEstudante();
  const atualizarEstudante = useAtualizarEstudante();
  const excluirEstudante = useExcluirEstudante();
  const atualizarEmLote = useAtualizarSituacaoEmLote();

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Estudante | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Estudante | null>(null);
  const [detailsCpfRevealed, setDetailsCpfRevealed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Estudante | null>(null);
  const [search, setSearch] = useState('');
  const [filterSituacao, setFilterSituacao] = useState<string>('todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchSituacaoId, setBatchSituacaoId] = useState<number | null>(null);
  const [revealedCpfs, setRevealedCpfs] = useState<Set<string>>(new Set());

  const studentObservacoes = useMemo(() => {
    if (!viewingStudent || !observacoes) return [];
    return observacoes.filter((o) => o.estudante_id === viewingStudent.id);
  }, [viewingStudent, observacoes]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const activeStatusList = statusList.filter((s) => s.ativo);

  const form = useForm<EstudanteForm>({
    resolver: zodResolver(estudanteSchema),
  });

  const filteredStudents = useMemo(() => {
    if (!estudantes) return [];
    let result = [...estudantes];

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.nome.toLowerCase().includes(term) ||
          e.id_sge_matricula.toLowerCase().includes(term) ||
          e.cpf.includes(onlyDigits(term))
      );
    }

    if (filterSituacao !== 'todos') {
      const id = parseInt(filterSituacao);
      result = result.filter(
        (e) => e.situacao_2025_id === id || e.situacao_2026_id === id
      );
    }

    return result;
  }, [estudantes, search, filterSituacao]);

  const openNew = () => {
    setEditingStudent(null);
    form.reset({
      id_sge_matricula: '',
      cpf: '',
      nome: '',
      situacao_2025_id: null,
      situacao_2026_id: null,
    });
    setShowModal(true);
  };

  const openEdit = (est: Estudante) => {
    setEditingStudent(est);
    form.reset({
      id_sge_matricula: est.id_sge_matricula,
      cpf: formatCpf(est.cpf),
      nome: est.nome,
      situacao_2025_id: est.situacao_2025_id,
      situacao_2026_id: est.situacao_2026_id,
    });
    setShowModal(true);
  };

  const onSubmit = (data: EstudanteForm) => {
    if (editingStudent) {
      atualizarEstudante.mutate(
        { id: editingStudent.id, escolaId, dados: data },
        { onSuccess: () => setShowModal(false) }
      );
    } else {
      criarEstudante.mutate(
        { escolaId, dados: data },
        { onSuccess: () => setShowModal(false) }
      );
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((e) => e.id)));
    }
  };

  const handleBatch = () => {
    if (!batchSituacaoId || selectedIds.size === 0) return;
    atualizarEmLote.mutate(
      {
        ids: Array.from(selectedIds),
        escolaId,
        campo: 'situacao_2026_id',
        valorId: batchSituacaoId,
      },
      {
        onSuccess: () => {
          setShowBatchModal(false);
          setSelectedIds(new Set());
          setBatchSituacaoId(null);
        },
      }
    );
  };

  const toggleRevealCpf = (id: string) => {
    const next = new Set(revealedCpfs);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setRevealedCpfs(next);
  };

  const getStatusLabel = (id: number | null) => {
    if (id == null) return '—';
    return statusList.find((s) => s.id === id)?.rotulo ?? '—';
  };

  const getStatusColor = (id: number | null) => {
    if (id == null) return '';
    return statusList.find((s) => s.id === id)?.cor ?? '';
  };

  if (isLoading) return <SkeletonTable rows={8} />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nome, matrícula ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
          />
        </div>
        <select
          value={filterSituacao}
          onChange={(e) => setFilterSituacao(e.target.value)}
          className="select-field sm:w-48"
        >
          <option value="todos">Todas as situações</option>
          {activeStatusList.map((s) => (
            <option key={s.id} value={s.id}>{s.rotulo}</option>
          ))}
        </select>
        <button onClick={openNew} className="btn-primary whitespace-nowrap">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo estudante
        </button>
      </div>

      {/* Batch action */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-xl animate-slide-down">
          <span className="text-sm font-medium text-primary-700">
            {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowBatchModal(true)}
            className="btn-primary btn-sm"
          >
            Definir situação 2026
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="btn-ghost btn-sm"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {/* Empty state */}
      {filteredStudents.length === 0 && !isLoading && (
        <EmptyState
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          title={search ? 'Nenhum estudante encontrado' : 'Nenhum estudante cadastrado'}
          description={
            search
              ? 'Tente outro termo de busca.'
              : 'Clique em "Novo estudante" ou use a aba "Importar" para começar o cadastro.'
          }
          action={
            !search ? (
              <button onClick={openNew} className="btn-primary">
                Cadastrar primeiro estudante
              </button>
            ) : undefined
          }
        />
      )}

      {/* Table */}
      {filteredStudents.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="table-header px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="table-header px-4 py-3">Matrícula</th>
                  <th className="table-header px-4 py-3">CPF</th>
                  <th className="table-header px-4 py-3">Nome</th>
                  <th className="table-header px-4 py-3">Situação 2025</th>
                  <th className="table-header px-4 py-3">Situação 2026</th>
                  <th className="table-header px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredStudents.map((est) => (
                  <tr
                    key={est.id}
                    onClick={() => {
                      setViewingStudent(est);
                      setDetailsCpfRevealed(false);
                    }}
                    className="hover:bg-primary-50/40 cursor-pointer transition-colors group"
                    title="Clique para ver todas as informações do estudante"
                  >
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(est.id)}
                        onChange={() => toggleSelect(est.id)}
                        className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </td>
                    <td className="table-cell font-mono text-xs">{est.id_sge_matricula}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">
                          {revealedCpfs.has(est.id) ? formatCpf(est.cpf) : maskCpf(est.cpf)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRevealCpf(est.id);
                          }}
                          className="p-0.5 text-surface-400 hover:text-surface-600"
                          title={revealedCpfs.has(est.id) ? 'Ocultar CPF' : 'Revelar CPF'}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {revealedCpfs.has(est.id) ? (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="table-cell font-medium text-surface-900 max-w-[200px] truncate group-hover:text-primary-700 transition-colors">
                      {est.nome}
                    </td>
                    <td className="table-cell">
                      <span
                        className="badge text-xs"
                        style={{
                          backgroundColor: `${getStatusColor(est.situacao_2025_id)}20`,
                          color: getStatusColor(est.situacao_2025_id) || undefined,
                        }}
                      >
                        {getStatusLabel(est.situacao_2025_id)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span
                        className="badge text-xs"
                        style={{
                          backgroundColor: `${getStatusColor(est.situacao_2026_id)}20`,
                          color: getStatusColor(est.situacao_2026_id) || undefined,
                        }}
                      >
                        {getStatusLabel(est.situacao_2026_id)}
                      </span>
                    </td>
                    <td className="table-cell text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(est)}
                          className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(est)}
                          className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-surface-100 text-xs text-surface-500">
            {filteredStudents.length} estudante{filteredStudents.length !== 1 ? 's' : ''}
            {estudantes && filteredStudents.length !== estudantes.length && ` de ${estudantes.length}`}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingStudent ? 'Editar estudante' : 'Novo estudante'}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="id_sge_matricula" className="label">ID-SGE-Matrícula</label>
            <input
              id="id_sge_matricula"
              type="text"
              className="input-field"
              {...form.register('id_sge_matricula')}
            />
            {form.formState.errors.id_sge_matricula && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.id_sge_matricula.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cpf" className="label">CPF</label>
            <input
              id="cpf"
              type="text"
              className="input-field"
              placeholder="000.000.000-00"
              {...form.register('cpf')}
            />
            {form.formState.errors.cpf && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.cpf.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="nome" className="label">Nome completo</label>
            <input
              id="nome"
              type="text"
              className="input-field"
              {...form.register('nome')}
            />
            {form.formState.errors.nome && (
              <p className="mt-1 text-xs text-red-500">
                {form.formState.errors.nome.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="situacao_2025" className="label">Situação 2025</label>
              <select
                id="situacao_2025"
                className="select-field"
                value={form.watch('situacao_2025_id') ?? ''}
                onChange={(e) =>
                  form.setValue(
                    'situacao_2025_id',
                    e.target.value ? parseInt(e.target.value) : null,
                    { shouldDirty: true }
                  )
                }
              >
                <option value="">— Não informado —</option>
                {activeStatusList.map((s) => (
                  <option key={s.id} value={s.id}>{s.rotulo}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="situacao_2026" className="label">Situação 2026</label>
              <select
                id="situacao_2026"
                className="select-field"
                value={form.watch('situacao_2026_id') ?? ''}
                onChange={(e) =>
                  form.setValue(
                    'situacao_2026_id',
                    e.target.value ? parseInt(e.target.value) : null,
                    { shouldDirty: true }
                  )
                }
              >
                <option value="">— Não informado —</option>
                {activeStatusList.map((s) => (
                  <option key={s.id} value={s.id}>{s.rotulo}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criarEstudante.isPending || atualizarEstudante.isPending}
              className="btn-primary"
            >
              {(criarEstudante.isPending || atualizarEstudante.isPending) ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : editingStudent ? (
                'Salvar alterações'
              ) : (
                'Cadastrar'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            excluirEstudante.mutate({ id: deleteTarget.id, escolaId });
          }
        }}
        title="Excluir estudante"
        message={`Tem certeza que deseja excluir o estudante "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
      />

      {/* Batch modal */}
      <Modal
        open={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="Definir situação 2026 em lote"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600">
            Selecione a situação para {selectedIds.size} estudante{selectedIds.size > 1 ? 's' : ''}:
          </p>
          <select
            className="select-field"
            value={batchSituacaoId ?? ''}
            onChange={(e) => setBatchSituacaoId(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Selecione...</option>
            {activeStatusList.map((s) => (
              <option key={s.id} value={s.id}>{s.rotulo}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowBatchModal(false)} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button
              onClick={handleBatch}
              disabled={!batchSituacaoId || atualizarEmLote.isPending}
              className="btn-primary btn-sm"
            >
              {atualizarEmLote.isPending ? 'Aplicando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Student Details Modal */}
      <Modal
        open={!!viewingStudent}
        onClose={() => {
          setViewingStudent(null);
          setDetailsCpfRevealed(false);
        }}
        title="Detalhes do Estudante"
        size="lg"
      >
        {viewingStudent && (
          <div className="space-y-6">
            {/* Header Profile */}
            <div className="flex items-center gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 font-bold text-xl uppercase shadow-sm">
                {viewingStudent.nome.charAt(0) || 'E'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-surface-900 truncate">
                  {viewingStudent.nome}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="badge-blue font-mono text-xs">
                    Matrícula: {viewingStudent.id_sge_matricula}
                  </span>
                  <span className="text-xs text-surface-500 font-mono">
                    ID: {viewingStudent.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-surface-50 rounded-lg border border-surface-100">
                <span className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">
                  CPF
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-surface-900">
                    {detailsCpfRevealed
                      ? formatCpf(viewingStudent.cpf)
                      : maskCpf(viewingStudent.cpf)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailsCpfRevealed(!detailsCpfRevealed)}
                    className="p-1 text-surface-400 hover:text-surface-600 rounded transition-colors"
                    title={detailsCpfRevealed ? 'Ocultar CPF' : 'Revelar CPF'}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {detailsCpfRevealed ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-lg border border-surface-100">
                <span className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">
                  ID SGE Matrícula
                </span>
                <span className="font-mono text-sm font-semibold text-surface-900">
                  {viewingStudent.id_sge_matricula}
                </span>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-lg border border-surface-100">
                <span className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">
                  Situação 2025
                </span>
                <span
                  className="badge text-xs"
                  style={{
                    backgroundColor: `${getStatusColor(viewingStudent.situacao_2025_id)}20`,
                    color: getStatusColor(viewingStudent.situacao_2025_id) || undefined,
                  }}
                >
                  {getStatusLabel(viewingStudent.situacao_2025_id)}
                </span>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-lg border border-surface-100">
                <span className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">
                  Situação 2026
                </span>
                <span
                  className="badge text-xs"
                  style={{
                    backgroundColor: `${getStatusColor(viewingStudent.situacao_2026_id)}20`,
                    color: getStatusColor(viewingStudent.situacao_2026_id) || undefined,
                  }}
                >
                  {getStatusLabel(viewingStudent.situacao_2026_id)}
                </span>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-lg border border-surface-100">
                <span className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">
                  Data de Cadastro
                </span>
                <span className="text-xs text-surface-700 font-medium">
                  {formatDate(viewingStudent.created_at)}
                </span>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-lg border border-surface-100">
                <span className="block text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">
                  Última Atualização
                </span>
                <span className="text-xs text-surface-700 font-medium">
                  {formatDate(viewingStudent.updated_at)}
                </span>
              </div>
            </div>

            {/* Observations Section */}
            <div className="border-t border-surface-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
                  <span>Observações e Informações Registradas</span>
                  <span className="badge-gray text-xs">
                    {studentObservacoes.length}
                  </span>
                </h4>
              </div>

              {studentObservacoes.length > 0 ? (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {studentObservacoes.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 bg-surface-50 rounded-lg border border-surface-200 text-xs"
                    >
                      <div className="flex items-center justify-between text-surface-400 mb-1 flex-wrap gap-1">
                        <span className="font-semibold text-primary-600">
                          {obs.autor?.nome ?? 'Usuário'}
                        </span>
                        <span>{formatDate(obs.created_at)}</span>
                      </div>
                      <p className="text-surface-700 whitespace-pre-wrap">{obs.texto}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-surface-50 text-center text-xs text-surface-400 border border-dashed border-surface-200">
                  Nenhuma observação registrada para este estudante.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-surface-200">
              <button
                type="button"
                onClick={() => {
                  setViewingStudent(null);
                  setDetailsCpfRevealed(false);
                }}
                className="btn-secondary btn-sm"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const est = viewingStudent;
                  setViewingStudent(null);
                  setDetailsCpfRevealed(false);
                  openEdit(est);
                }}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Estudante
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
