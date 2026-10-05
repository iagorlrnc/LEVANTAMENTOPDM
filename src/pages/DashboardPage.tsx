import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSreDashboard } from '@/hooks/useData';
import { Layout } from '@/components/Layout';
import { SkeletonCard, PrazoLevantamento, ProgressBar } from '@/components/ui';
import { useEffect } from 'react';

export function DashboardPage() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const { data: sres, isLoading, error } = useSreDashboard();

  // Auto-redirect for restricted users
  useEffect(() => {
    if (!perfil) return;
    if (perfil.papel === 'sre' && perfil.sre_id) {
      navigate(`/sre/${perfil.sre_id}`, { replace: true });
    }
  }, [perfil, navigate]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">
              Painel do Levantamento
            </h1>
            <p className="text-sm text-surface-500 mt-1">
              Acompanhe o progresso por Superintendência Regional de Educação
            </p>
          </div>
          <PrazoLevantamento />
        </div>

        {/* Summary stats */}
        {sres && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">SREs</p>
              <p className="text-2xl font-bold text-surface-900 mt-1">{sres.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">Escolas</p>
              <p className="text-2xl font-bold text-surface-900 mt-1">
                {sres.reduce((acc, s) => acc + s.total_escolas, 0)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">Estudantes</p>
              <p className="text-2xl font-bold text-surface-900 mt-1">
                {sres.reduce((acc, s) => acc + s.total_estudantes, 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">Escolas ativas</p>
              <p className="text-2xl font-bold text-accent-600 mt-1">
                {sres.reduce((acc, s) => acc + s.escolas_com_estudantes, 0)}
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="card p-6 border-red-200 bg-red-50">
            <p className="text-sm font-medium text-red-700">
              Erro ao carregar dados:{' '}
              {error instanceof Error
                ? error.message
                : typeof error === 'object' && error !== null && 'message' in error
                  ? String((error as { message: unknown }).message)
                  : JSON.stringify(error)}
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 13 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* SRE cards */}
        {sres && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sres.map((sre, index) => (
              <button
                key={sre.id}
                onClick={() => navigate(`/sre/${sre.id}`)}
                className="card p-5 text-left hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 group-hover:from-primary-200 group-hover:to-primary-300 transition-colors">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900 text-sm leading-tight">
                        {sre.nome}
                      </h3>
                      <p className="text-xs text-surface-400 mt-0.5">
                        {sre.total_escolas} escola{sre.total_escolas !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <svg className="h-4 w-4 text-surface-300 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-surface-900">{sre.total_estudantes}</p>
                    <p className="text-[10px] text-surface-400 uppercase">Estudantes</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary-600">{sre.pct_situacao_2025}%</p>
                    <p className="text-[10px] text-surface-400 uppercase">Sit. 2025</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-accent-600">{sre.pct_situacao_2026}%</p>
                    <p className="text-[10px] text-surface-400 uppercase">Sit. 2026</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-surface-400">
                    <span>Situação 2025</span>
                    <span className="font-medium text-surface-600">
                      {sre.escolas_com_2025}/{sre.total_escolas} ({sre.pct_situacao_2025}%)
                    </span>
                  </div>
                  <ProgressBar value={sre.pct_situacao_2025} color="primary" />
                  <div className="flex items-center justify-between text-[10px] text-surface-400">
                    <span>Situação 2026</span>
                    <span className="font-medium text-surface-600">
                      {sre.escolas_com_2026}/{sre.total_escolas} ({sre.pct_situacao_2026}%)
                    </span>
                  </div>
                  <ProgressBar value={sre.pct_situacao_2026} color="accent" />
                </div>

                <div className="mt-3 pt-3 border-t border-surface-100">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${sre.escolas_com_estudantes > 0 ? 'bg-accent-500' : 'bg-surface-300'}`} />
                    <span className="text-[11px] text-surface-500">
                      {sre.escolas_com_estudantes}/{sre.total_escolas} escolas com cadastro
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
