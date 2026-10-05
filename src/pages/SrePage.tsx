import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEscolasDaSre, useSres, useStatusSituacao } from '@/hooks/useData';
import { Layout } from '@/components/Layout';
import { SkeletonTable, StatusBadge, EmptyState, PrazoLevantamento } from '@/components/ui';
import { exportarSreXlsx } from '@/lib/xlsx';
import { supabase } from '@/lib/supabase';
import type { Estudante } from '@/types';
import toast from 'react-hot-toast';

type SortField = 'nome' | 'codigo_inep' | 'cidade' | 'total_estudantes';
type SortDir = 'asc' | 'desc';
type FilterStatus = 'todos' | 'vazio' | 'parcial' | 'completo';

export function SrePage() {
  const { id } = useParams<{ id: string }>();
  const sreId = id ? parseInt(id) : undefined;
  const navigate = useNavigate();

  const { data: sres } = useSres();
  const { data: escolas, isLoading, error } = useEscolasDaSre(sreId);
  const { data: statusList } = useStatusSituacao();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [exporting, setExporting] = useState(false);

  const sre = sres?.find((s) => s.id === sreId);

  const filteredEscolas = useMemo(() => {
    if (!escolas) return [];

    let result = [...escolas];

    // Search
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.nome.toLowerCase().includes(term) ||
          e.codigo_inep.includes(term) ||
          (e.cidade?.toLowerCase().includes(term) ?? false)
      );
    }

    // Filter by status
    if (filterStatus !== 'todos') {
      result = result.filter((e) => e.status_preenchimento === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'nome':
          cmp = a.nome.localeCompare(b.nome, 'pt-BR');
          break;
        case 'codigo_inep':
          cmp = a.codigo_inep.localeCompare(b.codigo_inep);
          break;
        case 'cidade':
          cmp = (a.cidade ?? '').localeCompare(b.cidade ?? '', 'pt-BR');
          break;
        case 'total_estudantes':
          cmp = a.total_estudantes - b.total_estudantes;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [escolas, search, filterStatus, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-surface-300 ml-1">↕</span>;
    return <span className="text-primary-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleExportSre = async () => {
    if (!escolas || !statusList || !sre) return;
    setExporting(true);
    try {
      const escolaIds = escolas.map((e) => e.id);
      let allEstudantes: Estudante[] = [];

      if (escolaIds.length > 0) {
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error: fetchErr } = await supabase
            .from('estudantes')
            .select('*')
            .in('escola_id', escolaIds)
            .order('id')
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (fetchErr) throw fetchErr;

          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allEstudantes = allEstudantes.concat(data as Estudante[]);
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }
      }

      // Group students by escola_id
      const estudantesPorEscola = new Map<number, Estudante[]>();
      for (const est of allEstudantes) {
        const list = estudantesPorEscola.get(est.escola_id) || [];
        list.push(est);
        estudantesPorEscola.set(est.escola_id, list);
      }

      // Sort each school's students by name
      for (const list of estudantesPorEscola.values()) {
        list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      }

      const escolasComEstudantes = escolas.map((escola) => ({
        escola,
        estudantes: estudantesPorEscola.get(escola.id) || [],
      }));

      await exportarSreXlsx(sre.nome, escolasComEstudantes, statusList);
      toast.success('Exportação da SRE concluída com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar SRE:', err);
      toast.error('Erro ao exportar planilha da SRE.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium">
            Painel
          </Link>
          <span className="text-surface-300">/</span>
          <span className="text-surface-600">{sre?.nome ?? 'SRE'}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">
              {sre?.nome ?? 'Carregando...'}
            </h1>
            <p className="text-sm text-surface-500 mt-1">
              {escolas ? `${escolas.length} escolas` : ''}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <PrazoLevantamento />
            <button
              onClick={handleExportSre}
              disabled={exporting || !escolas?.length}
              className="btn-accent shrink-0"
            >
              {exporting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Exportar XLSX da SRE
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nome ou INEP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="select-field sm:w-48"
          >
            <option value="todos">Todos os status</option>
            <option value="vazio">Vazio</option>
            <option value="parcial">Parcial</option>
            <option value="completo">Completo</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="card p-6 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">Erro ao carregar escolas.</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && <SkeletonTable rows={10} />}

        {/* Empty */}
        {escolas && filteredEscolas.length === 0 && (
          <EmptyState
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            title="Nenhuma escola encontrada"
            description={search ? 'Tente outro termo de busca.' : 'Nenhuma escola cadastrada nesta SRE.'}
          />
        )}

        {/* Table */}
        {filteredEscolas.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th
                      className="table-header px-4 py-3 cursor-pointer select-none hover:bg-surface-100"
                      onClick={() => toggleSort('codigo_inep')}
                    >
                      INEP <SortIcon field="codigo_inep" />
                    </th>
                    <th
                      className="table-header px-4 py-3 cursor-pointer select-none hover:bg-surface-100"
                      onClick={() => toggleSort('nome')}
                    >
                      Escola <SortIcon field="nome" />
                    </th>
                    <th
                      className="table-header px-4 py-3 cursor-pointer select-none hover:bg-surface-100"
                      onClick={() => toggleSort('cidade')}
                    >
                      Cidade <SortIcon field="cidade" />
                    </th>
                    <th className="table-header px-4 py-3">Gestor</th>
                    <th className="table-header px-4 py-3">Ponto Focal</th>
                    <th
                      className="table-header px-4 py-3 cursor-pointer select-none hover:bg-surface-100 text-right"
                      onClick={() => toggleSort('total_estudantes')}
                    >
                      Estudantes <SortIcon field="total_estudantes" />
                    </th>
                    <th className="table-header px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filteredEscolas.map((escola) => (
                    <tr
                      key={escola.id}
                      onClick={() => navigate(`/escola/${escola.id}`)}
                      className="hover:bg-primary-50/50 cursor-pointer transition-colors"
                    >
                      <td className="table-cell font-mono text-xs">{escola.codigo_inep}</td>
                      <td className="table-cell font-medium text-surface-900 max-w-[250px] truncate">
                        {escola.nome}
                      </td>
                      <td className="table-cell">{escola.cidade ?? '—'}</td>
                      <td className="table-cell text-xs">{escola.gestor_nome ?? '—'}</td>
                      <td className="table-cell text-xs">{escola.ponto_focal_pdm_nome ?? '—'}</td>
                      <td className="table-cell text-right font-semibold">
                        {escola.total_estudantes}
                      </td>
                      <td className="table-cell text-center">
                        <StatusBadge status={escola.status_preenchimento} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
