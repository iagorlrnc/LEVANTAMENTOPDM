import { useState } from 'react';
import { useEstudantes } from '@/hooks/useData';
import { exportarEscolaXlsx } from '@/lib/xlsx';
import type { Escola, StatusSituacao } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  escola: Escola;
  sreNome: string;
  statusList: StatusSituacao[];
}

export function ExportarTab({ escola, sreNome, statusList }: Props) {
  const { data: estudantes } = useEstudantes(escola.id);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!estudantes) return;
    setExporting(true);
    try {
      await exportarEscolaXlsx(escola, sreNome, estudantes, statusList);
      toast.success('Arquivo exportado com sucesso!');
    } catch (err) {
      toast.error('Erro ao exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card p-8 text-center animate-fade-in">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-100">
        <svg className="h-8 w-8 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-surface-900 mb-2">
        Exportar planilha da escola
      </h3>
      <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">
        Gere um arquivo XLSX no mesmo layout da planilha oficial do levantamento,
        com todos os dados da escola e estudantes preenchidos.
      </p>

      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="text-center px-4">
          <p className="text-2xl font-bold text-surface-900">
            {estudantes?.length ?? 0}
          </p>
          <p className="text-xs text-surface-400 uppercase">Estudantes</p>
        </div>
        <div className="h-8 w-px bg-surface-200" />
        <div className="text-center px-4">
          <p className="text-2xl font-bold text-primary-600">
            {estudantes?.filter((e) => e.situacao_2025_id != null).length ?? 0}
          </p>
          <p className="text-xs text-surface-400 uppercase">Com sit. 2025</p>
        </div>
        <div className="h-8 w-px bg-surface-200" />
        <div className="text-center px-4">
          <p className="text-2xl font-bold text-accent-600">
            {estudantes?.filter((e) => e.situacao_2026_id != null).length ?? 0}
          </p>
          <p className="text-xs text-surface-400 uppercase">Com sit. 2026</p>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting || !estudantes}
        className="btn-accent btn-lg"
      >
        {exporting ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Baixar XLSX
          </>
        )}
      </button>
    </div>
  );
}
