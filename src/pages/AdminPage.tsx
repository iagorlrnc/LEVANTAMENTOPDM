import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { criarUsuarioSchema, statusSituacaoSchema, type CriarUsuarioForm, type StatusSituacaoForm } from '@/lib/validation';
import {
  usePerfis,
  useCriarUsuario,
  useAtualizarPerfil,
  useSres,
  useStatusSituacao,
  useCriarStatusSituacao,
  useAtualizarStatusSituacao,
  useAuditoria,
} from '@/hooks/useData';
import { Layout } from '@/components/Layout';
import { Tabs, Modal, SkeletonTable, EmptyState, Pagination } from '@/components/ui';
import type { StatusSituacao, Papel } from '@/types';

const tabs = [
  { id: 'usuarios', label: 'Usuários' },
  { id: 'situacoes', label: 'Situações' },
  { id: 'auditoria', label: 'Auditoria' },
];

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('usuarios');

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Administração</h1>
          <p className="text-sm text-surface-500 mt-1">
            Gestão de usuários, opções de situação e log de auditoria
          </p>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'usuarios' && <UsuariosTab />}
        {activeTab === 'situacoes' && <SituacoesTab />}
        {activeTab === 'auditoria' && <AuditoriaTab />}
      </div>
    </Layout>
  );
}

// ========================
// Usuarios Tab
// ========================

function UsuariosTab() {
  const { data: perfis, isLoading } = usePerfis();
  const { data: sres } = useSres();
  const criarUsuario = useCriarUsuario();
  const atualizarPerfil = useAtualizarPerfil();
  const [showModal, setShowModal] = useState(false);

  const form = useForm<CriarUsuarioForm>({
    resolver: zodResolver(criarUsuarioSchema),
    defaultValues: {
      email: '',
      senha: '',
      nome: '',
      papel: 'sre',
      sre_id: null,
      escola_id: null,
    },
  });

  const papel = form.watch('papel');

  const onSubmit = (data: CriarUsuarioForm) => {
    criarUsuario.mutate(data, {
      onSuccess: () => {
        setShowModal(false);
        form.reset();
      },
    });
  };

  const handlePapelChange = (userId: string, novoPapel: Papel) => {
    let dados: { papel: Papel; sre_id?: number | null; escola_id?: number | null } = { papel: novoPapel };
    if (novoPapel === 'admin') {
      dados = { papel: novoPapel, sre_id: null, escola_id: null };
    }
    atualizarPerfil.mutate({ id: userId, dados });
  };

  if (isLoading) return <SkeletonTable rows={5} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo usuário
        </button>
      </div>

      {perfis && perfis.length === 0 && (
        <EmptyState
          title="Nenhum usuário cadastrado"
          description="Crie o primeiro usuário para começar."
        />
      )}

      {perfis && perfis.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="table-header px-4 py-3">Nome</th>
                <th className="table-header px-4 py-3">Papel</th>
                <th className="table-header px-4 py-3">Vinculação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {perfis.map((p) => (
                <tr key={p.id} className="hover:bg-surface-50/50">
                  <td className="table-cell font-medium">{p.nome}</td>
                  <td className="table-cell">
                    <select
                      value={p.papel}
                      onChange={(e) => handlePapelChange(p.id, e.target.value as Papel)}
                      disabled={atualizarPerfil.isPending}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md border cursor-pointer transition-all shadow-sm ${
                        p.papel === 'admin'
                          ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      <option value="admin">Administrador</option>
                      <option value="sre">SRE</option>
                    </select>
                  </td>
                  <td className="table-cell text-xs">
                    {p.papel === 'admin' && (
                      <span className="text-surface-400 font-medium">Acesso total</span>
                    )}
                    {p.papel === 'sre' && (
                      <select
                        value={p.sre_id ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value, 10) : null;
                          atualizarPerfil.mutate({ id: p.id, dados: { sre_id: val, escola_id: null } });
                        }}
                        disabled={atualizarPerfil.isPending}
                        className="select-field text-xs py-1 max-w-[240px]"
                      >
                        <option value="">Selecione a SRE...</option>
                        {sres?.map((s) => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Novo usuário"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="user-email" className="label">E-mail</label>
            <input id="user-email" type="email" className="input-field" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="user-senha" className="label">Senha</label>
            <input id="user-senha" type="password" className="input-field" {...form.register('senha')} />
            {form.formState.errors.senha && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.senha.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="user-nome" className="label">Nome</label>
            <input id="user-nome" type="text" className="input-field" {...form.register('nome')} />
            {form.formState.errors.nome && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.nome.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="user-papel" className="label">Papel</label>
            <select
              id="user-papel"
              className="select-field"
              {...form.register('papel')}
            >
              <option value="admin">Administrador</option>
              <option value="sre">SRE</option>
            </select>
          </div>

          {papel === 'sre' && sres && (
            <div>
              <label htmlFor="user-sre" className="label">SRE</label>
              <select
                id="user-sre"
                className="select-field"
                value={form.watch('sre_id') ?? ''}
                onChange={(e) =>
                  form.setValue('sre_id', e.target.value ? parseInt(e.target.value) : null)
                }
              >
                <option value="">Selecione...</option>
                {sres.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={criarUsuario.isPending} className="btn-primary">
              {criarUsuario.isPending ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ========================
// Situações Tab
// ========================

function SituacoesTab() {
  const { data: statusList, isLoading } = useStatusSituacao();
  const criarStatus = useCriarStatusSituacao();
  const atualizarStatus = useAtualizarStatusSituacao();
  const [showModal, setShowModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusSituacao | null>(null);

  const form = useForm<StatusSituacaoForm>({
    resolver: zodResolver(statusSituacaoSchema),
    defaultValues: { rotulo: '', cor: '#1e5fa8', ordem: 0, ativo: true },
  });

  const openNew = () => {
    setEditingStatus(null);
    form.reset({ rotulo: '', cor: '#1e5fa8', ordem: (statusList?.length ?? 0) + 1, ativo: true });
    setShowModal(true);
  };

  const openEdit = (s: StatusSituacao) => {
    setEditingStatus(s);
    form.reset({ rotulo: s.rotulo, cor: s.cor, ordem: s.ordem, ativo: s.ativo });
    setShowModal(true);
  };

  const onSubmit = (data: StatusSituacaoForm) => {
    if (editingStatus) {
      atualizarStatus.mutate(
        { id: editingStatus.id, dados: data },
        { onSuccess: () => setShowModal(false) }
      );
    } else {
      criarStatus.mutate(data, { onSuccess: () => setShowModal(false) });
    }
  };

  if (isLoading) return <SkeletonTable rows={5} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-500">
          Gerencie as opções de situação disponíveis nos campos "Situação 2025" e "Situação 2026".
        </p>
        <button onClick={openNew} className="btn-primary btn-sm">
          Novo status
        </button>
      </div>

      {statusList && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="table-header px-4 py-3">Ordem</th>
                <th className="table-header px-4 py-3">Rótulo</th>
                <th className="table-header px-4 py-3">Cor</th>
                <th className="table-header px-4 py-3">Ativo</th>
                <th className="table-header px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {statusList.map((s) => (
                <tr key={s.id} className="hover:bg-surface-50/50">
                  <td className="table-cell">{s.ordem}</td>
                  <td className="table-cell font-medium">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${s.cor}20`,
                        color: s.cor,
                      }}
                    >
                      {s.rotulo}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full border border-surface-200"
                        style={{ backgroundColor: s.cor }}
                      />
                      <span className="text-xs font-mono text-surface-400">{s.cor}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={s.ativo ? 'badge-green' : 'badge-gray'}>
                      {s.ativo ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <button
                      onClick={() => openEdit(s)}
                      className="btn-ghost btn-sm"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingStatus ? 'Editar status' : 'Novo status'}
        size="sm"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="status-rotulo" className="label">Rótulo</label>
            <input id="status-rotulo" type="text" className="input-field" {...form.register('rotulo')} />
            {form.formState.errors.rotulo && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.rotulo.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="status-cor" className="label">Cor</label>
            <div className="flex items-center gap-3">
              <input
                id="status-cor"
                type="color"
                className="h-10 w-14 rounded-lg border border-surface-300 cursor-pointer"
                {...form.register('cor')}
              />
              <input
                type="text"
                className="input-field flex-1"
                value={form.watch('cor')}
                onChange={(e) => form.setValue('cor', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="status-ordem" className="label">Ordem</label>
            <input
              id="status-ordem"
              type="number"
              className="input-field"
              {...form.register('ordem', { valueAsNumber: true })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="status-ativo"
              type="checkbox"
              className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              {...form.register('ativo')}
            />
            <label htmlFor="status-ativo" className="text-sm text-surface-700">
              Ativo (visível nos formulários)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn-primary btn-sm">
              {editingStatus ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ========================
// Auditoria Tab
// ========================

function AuditoriaTab() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAuditoria(page);

  if (isLoading) return <SkeletonTable rows={10} />;
  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="Sem registros"
        description="O log de auditoria aparecerá aqui conforme o sistema for utilizado."
      />
    );
  }

  const totalPages = Math.ceil(data.count / 50);

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="table-header px-4 py-3">Data/Hora</th>
                <th className="table-header px-4 py-3">Tabela</th>
                <th className="table-header px-4 py-3">Ação</th>
                <th className="table-header px-4 py-3">Registro</th>
                <th className="table-header px-4 py-3">Usuário</th>
                <th className="table-header px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {data.data.map((log) => (
                <tr key={log.id} className="hover:bg-surface-50/50">
                  <td className="table-cell text-xs">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="table-cell">
                    <span className="badge-gray">{log.tabela}</span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`badge ${
                        log.acao === 'INSERT'
                          ? 'badge-green'
                          : log.acao === 'UPDATE'
                          ? 'badge-blue'
                          : 'badge-red'
                      }`}
                    >
                      {log.acao}
                    </span>
                  </td>
                  <td className="table-cell font-mono text-xs">{log.registro_id}</td>
                  <td className="table-cell text-xs">{log.usuario_id?.slice(0, 8) ?? '—'}</td>
                  <td className="table-cell text-xs max-w-[200px] truncate">
                    {log.dados_depois
                      ? JSON.stringify(log.dados_depois).slice(0, 100)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
