import { useState, useRef, useMemo } from 'react';
import { parseUploadedFile, exportarModeloXlsx } from '@/lib/xlsx';
import { useImportarEstudantes, useAtualizarEscola } from '@/hooks/useData';
import type { StatusSituacao, ImportPreview } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  escolaId: number;
  statusList: StatusSituacao[];
}

export function ImportarTab({ escolaId, statusList }: Props) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importar = useImportarEstudantes();
  const atualizarEscola = useAtualizarEscola();

  const statusMap = useMemo(() => {
    return new Map(statusList.map((s) => [s.rotulo.toLowerCase().trim(), s.id]));
  }, [statusList]);

  const totalComObs = useMemo(() => {
    return preview
      ? preview.rows.filter((r) => r.observacoes && r.observacoes.length > 0).length
      : 0;
  }, [preview]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const result = await parseUploadedFile(file, statusList);
      setPreview(result);
      if (result.rows.length === 0) {
        toast.error('Nenhum dado encontrado no arquivo.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao ler arquivo');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;

    const validRows = preview.rows.filter((r) => r.erros.length === 0);
    if (validRows.length === 0) {
      toast.error('Nenhum registro válido para importar.');
      return;
    }

    const estudantes = validRows.map((r) => {
      const sit2025Valida = r.situacao_2025
        ? statusMap.get(r.situacao_2025.toLowerCase().trim()) ?? null
        : null;
      const sit2026Valida = r.situacao_2026
        ? statusMap.get(r.situacao_2026.toLowerCase().trim()) ?? null
        : null;

      const observacoes: string[] = [];
      if (r.observacoes && r.observacoes.length > 0) {
        observacoes.push(...r.observacoes);
      } else {
        if (r.situacao_2025 && !sit2025Valida) {
          observacoes.push(`Situação 2025: ${r.situacao_2025}`);
        }
        if (r.situacao_2026 && !sit2026Valida) {
          observacoes.push(`Situação 2026: ${r.situacao_2026}`);
        }
      }

      return {
        id_sge_matricula: r.id_sge_matricula,
        cpf: r.cpf,
        nome: r.nome,
        situacao_2025_id: sit2025Valida,
        situacao_2026_id: sit2026Valida,
        observacoes,
      };
    });

    importar.mutate(
      { escolaId, estudantes },
      {
        onSuccess: () => {
          setPreview(null);
          if (fileRef.current) fileRef.current.value = '';

          // Also update school header data if available
          if (preview.header.cidade || preview.header.gestor) {
            const headerData: Record<string, string> = {};
            if (preview.header.cidade) headerData['cidade'] = preview.header.cidade;
            if (preview.header.gestor) headerData['gestor_nome'] = preview.header.gestor;
            if (preview.header.gestor_contato) headerData['gestor_contato'] = preview.header.gestor_contato;
            if (preview.header.equipe_multiprofissional)
              headerData['equipe_multiprofissional'] = preview.header.equipe_multiprofissional;
            if (preview.header.ponto_focal_nome)
              headerData['ponto_focal_pdm_nome'] = preview.header.ponto_focal_nome;
            if (preview.header.ponto_focal_contato)
              headerData['ponto_focal_pdm_contato'] = preview.header.ponto_focal_contato;

            if (Object.keys(headerData).length > 0) {
              atualizarEscola.mutate({
                id: escolaId,
                dados: {
                  cidade: headerData['cidade'] ?? '',
                  gestor_nome: headerData['gestor_nome'] ?? '',
                  gestor_contato: headerData['gestor_contato'] ?? '',
                  equipe_multiprofissional: headerData['equipe_multiprofissional'] ?? '',
                  ponto_focal_pdm_nome: headerData['ponto_focal_pdm_nome'] ?? '',
                  ponto_focal_pdm_contato: headerData['ponto_focal_pdm_contato'] ?? '',
                },
              });
            }
          }
        },
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload area */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-surface-900 mb-4">Importar dados</h3>
        <p className="text-sm text-surface-500 mb-4">
          Selecione um arquivo XLSX ou CSV no layout da planilha do levantamento. O sistema lerá as
          colunas B a F a partir da linha 8 (e o cabeçalho B2:B6, se houver).
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-surface-300 p-6 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all">
              {parsing ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
              ) : (
                <svg className="h-8 w-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-surface-700">
                  Clique para selecionar o arquivo
                </p>
                <p className="text-xs text-surface-400 mt-1">XLSX ou CSV</p>
              </div>
            </div>
          </label>

          <button
            onClick={() => exportarModeloXlsx()}
            className="btn-secondary whitespace-nowrap self-start"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Baixar modelo em branco
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="card overflow-hidden">
          {/* Header data preview */}
          {(preview.header.nome_unidade || preview.header.gestor) && (
            <div className="p-4 bg-surface-50 border-b border-surface-200">
              <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                Dados do cabeçalho
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {preview.header.nome_unidade && (
                  <div>
                    <span className="text-surface-400">Escola:</span>{' '}
                    <span className="font-medium">{preview.header.nome_unidade}</span>
                  </div>
                )}
                {preview.header.cidade && (
                  <div>
                    <span className="text-surface-400">Cidade:</span>{' '}
                    <span className="font-medium">{preview.header.cidade}</span>
                  </div>
                )}
                {preview.header.gestor && (
                  <div>
                    <span className="text-surface-400">Gestor:</span>{' '}
                    <span className="font-medium">{preview.header.gestor}</span>
                  </div>
                )}
                {preview.header.ponto_focal_nome && (
                  <div>
                    <span className="text-surface-400">Ponto focal:</span>{' '}
                    <span className="font-medium">{preview.header.ponto_focal_nome}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 flex items-center gap-4 border-b border-surface-200 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-accent-500" />
              <span className="text-sm text-surface-700">
                <strong>{preview.totalValidos}</strong> válido{preview.totalValidos !== 1 ? 's' : ''}
              </span>
            </div>
            {totalComObs > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-sm text-amber-700">
                  <strong>{totalComObs}</strong> com observação de situação
                </span>
              </div>
            )}
            {preview.totalErros > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm text-red-700">
                  <strong>{preview.totalErros}</strong> com erro{preview.totalErros !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            <span className="text-xs text-surface-400 ml-auto">
              Total: {preview.rows.length} registro{preview.rows.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto scrollbar-thin max-h-96 overflow-y-auto">
            <table className="w-full min-w-[600px]">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-surface-200">
                  <th className="table-header px-3 py-2">Linha</th>
                  <th className="table-header px-3 py-2">Matrícula</th>
                  <th className="table-header px-3 py-2">CPF</th>
                  <th className="table-header px-3 py-2">Nome</th>
                  <th className="table-header px-3 py-2">Sit. 2025</th>
                  <th className="table-header px-3 py-2">Sit. 2026</th>
                  <th className="table-header px-3 py-2">Validação / Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {preview.rows.map((row, i) => {
                  const sit2025Valida = row.situacao_2025
                    ? statusMap.has(row.situacao_2025.toLowerCase().trim())
                    : true;
                  const sit2026Valida = row.situacao_2026
                    ? statusMap.has(row.situacao_2026.toLowerCase().trim())
                    : true;

                  return (
                    <tr
                      key={i}
                      className={row.erros.length > 0 ? 'bg-red-50' : 'hover:bg-surface-50/50'}
                    >
                      <td className="px-3 py-2 text-xs text-surface-400">{row.linha}</td>
                      <td className="px-3 py-2 text-xs font-mono">{row.id_sge_matricula}</td>
                      <td className="px-3 py-2 text-xs font-mono">{row.cpf}</td>
                      <td className="px-3 py-2 text-xs">{row.nome}</td>
                      <td className="px-3 py-2 text-xs">
                        {row.situacao_2025 ? (
                          sit2025Valida ? (
                            <span className="text-surface-700">{row.situacao_2025}</span>
                          ) : (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800"
                              title="Não corresponde a uma opção cadastrada e será inserido como observação do aluno"
                            >
                              {row.situacao_2025} (Obs)
                            </span>
                          )
                        ) : (
                          <span className="text-surface-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {row.situacao_2026 ? (
                          sit2026Valida ? (
                            <span className="text-surface-700">{row.situacao_2026}</span>
                          ) : (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800"
                              title="Não corresponde a uma opção cadastrada e será inserido como observação do aluno"
                            >
                              {row.situacao_2026} (Obs)
                            </span>
                          )
                        ) : (
                          <span className="text-surface-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {row.erros.length > 0 && (
                          <ul className="list-disc list-inside text-red-600 space-y-0.5">
                            {row.erros.map((e, j) => (
                              <li key={j}>{e}</li>
                            ))}
                          </ul>
                        )}
                        {row.observacoes && row.observacoes.length > 0 && (
                          <ul className="list-none text-amber-700 space-y-0.5">
                            {row.observacoes.map((obs, j) => (
                              <li key={j} className="flex items-center gap-1 font-medium">
                                <span className="text-amber-600">📝 Obs:</span> {obs}
                              </li>
                            ))}
                          </ul>
                        )}
                        {row.erros.length === 0 && (!row.observacoes || row.observacoes.length === 0) && (
                          <span className="text-accent-600">✓ Válido</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action */}
          <div className="p-4 border-t border-surface-200 flex justify-end gap-3">
            <button
              onClick={() => {
                setPreview(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={preview.totalValidos === 0 || importar.isPending}
              className="btn-primary"
            >
              {importar.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                `Importar ${preview.totalValidos} registro${preview.totalValidos !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
