import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEscola, useSres, useStatusSituacao } from '@/hooks/useData';
import { Layout } from '@/components/Layout';
import { Tabs, SkeletonTable } from '@/components/ui';
import { DadosUnidadeTab } from '@/components/escola/DadosUnidadeTab';
import { EstudantesTab } from '@/components/escola/EstudantesTab';
import { ObservacoesTab } from '@/components/escola/ObservacoesTab';
import { ImportarTab } from '@/components/escola/ImportarTab';
import { ExportarTab } from '@/components/escola/ExportarTab';

const tabs = [
  {
    id: 'dados',
    label: 'Dados da Unidade',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'estudantes',
    label: 'Estudantes',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'observacoes',
    label: 'Informações',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
  },
  {
    id: 'importar',
    label: 'Importar',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    id: 'exportar',
    label: 'Exportar',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

type TabId = 'dados' | 'estudantes' | 'observacoes' | 'importar' | 'exportar';

export function EscolaPage() {
  const { id } = useParams<{ id: string }>();
  const escolaId = id ? parseInt(id, 10) : undefined;
  const [activeTab, setActiveTab] = useState<TabId>('dados');

  const { data: escola, isLoading: loadingEscola } = useEscola(escolaId);
  const { data: sres } = useSres();
  const { data: statusList } = useStatusSituacao();

  const sre = sres?.find((s) => s.id === escola?.sre_id);

  if (loadingEscola) {
    return (
      <Layout>
        <SkeletonTable rows={8} />
      </Layout>
    );
  }

  if (!escola || !escolaId) {
    return (
      <Layout>
        <div className="card p-8 text-center">
          <p className="text-surface-600">Escola não encontrada.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
            Painel
          </Link>
          <span className="text-surface-300">/</span>
          {sre && (
            <>
              <Link
                to={`/sre/${sre.id}`}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                {sre.nome}
              </Link>
              <span className="text-surface-300">/</span>
            </>
          )}
          <span className="text-surface-600 truncate max-w-[300px]">{escola.nome}</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 leading-tight">
            {escola.nome}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="badge-blue">INEP: {escola.codigo_inep}</span>
            {sre && <span className="badge-green">{sre.nome}</span>}
            {escola.cidade && <span className="badge-gray">{escola.cidade}</span>}
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

        {/* Tab content */}
        <div className="min-h-[400px]">
          {activeTab === 'dados' && (
            <DadosUnidadeTab escola={escola} sreNome={sre?.nome ?? ''} />
          )}
          {activeTab === 'estudantes' && (
            <EstudantesTab escolaId={escolaId} statusList={statusList ?? []} />
          )}
          {activeTab === 'observacoes' && (
            <ObservacoesTab escolaId={escolaId} />
          )}
          {activeTab === 'importar' && (
            <ImportarTab
              escolaId={escolaId}
              statusList={statusList ?? []}
            />
          )}
          {activeTab === 'exportar' && (
            <ExportarTab
              escola={escola}
              sreNome={sre?.nome ?? ''}
              statusList={statusList ?? []}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
