import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Escola, EscolaResumo, Estudante, StatusSituacao, ImportPreview, ImportRow } from '@/types';

function validarDigitosCpf(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(nums.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(nums.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums.charAt(10))) return false;

  return true;
}

// ========================
// Export XLSX (same layout as the template)
// ========================

export async function exportarEscolaXlsx(
  escola: Escola,
  sreNome: string,
  estudantes: Estudante[],
  statusList: StatusSituacao[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Plan1');

  const statusMap = new Map(statusList.map((s) => [s.id, s.rotulo]));

  // Header - Row 1 (C1)
  ws.getCell('C1').value =
    'ESSA PLANILHA DEVE SER PREENCHIDA A PARTIR DO DIA 26/08/2026 ATÉ 23/11/2026';
  ws.getCell('C1').font = { bold: true, size: 11, color: { argb: 'FFFF0000' } };

  // Header - school info (B2:B6)
  ws.getCell('B2').value = `NOME DA UNIDADE ESCOLAR: ${escola.nome}                                                                                                                                 CIDADE: ${escola.cidade ?? ''}`;
  ws.getCell('B3').value = `GESTOR (A): ${escola.gestor_nome ?? ''}                                                                                                                                                             CONTATO: ${escola.gestor_contato ?? ''}`;
  ws.getCell('B4').value = `EQUIPE MULTIPROFISSIONAL: ${escola.equipe_multiprofissional ?? ''}`;
  ws.getCell('B5').value = `PONTO FOCAL DO PROGRAMA PÉ DE MEIA: ${escola.ponto_focal_pdm_nome ?? ''}                                                                                                          CONTATO: ${escola.ponto_focal_pdm_contato ?? ''}`;
  ws.getCell('B6').value = `SUPERINTENDÊNCIA: ${sreNome}`;

  for (let row = 2; row <= 6; row++) {
    ws.getCell(`B${row}`).font = { bold: true, size: 10 };
  }

  // Table header - Row 8
  const headers = ['ID-SGE-MATRICULA', 'CPF ESTUDANTE', 'NOME DO ESTUDANTE', 'SITUAÇÃO 2025', 'SITUAÇÃO 2026'];
  headers.forEach((h, i) => {
    const col = String.fromCharCode(66 + i); // B, C, D, E, F
    ws.getCell(`${col}8`).value = h;
    ws.getCell(`${col}8`).font = { bold: true, size: 10 };
    ws.getCell(`${col}8`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    ws.getCell(`${col}8`).border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Data rows starting from row 9
  estudantes.forEach((est, index) => {
    const row = 9 + index;
    ws.getCell(`B${row}`).value = est.id_sge_matricula;
    ws.getCell(`C${row}`).value = est.cpf;
    ws.getCell(`D${row}`).value = est.nome;
    ws.getCell(`E${row}`).value = est.situacao_2025_id
      ? statusMap.get(est.situacao_2025_id) ?? ''
      : '';
    ws.getCell(`F${row}`).value = est.situacao_2026_id
      ? statusMap.get(est.situacao_2026_id) ?? ''
      : '';

    // Add borders
    for (let col = 66; col <= 70; col++) {
      ws.getCell(`${String.fromCharCode(col)}${row}`).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  });

  // Column widths
  ws.getColumn('B').width = 25;
  ws.getColumn('C').width = 18;
  ws.getColumn('D').width = 45;
  ws.getColumn('E').width = 22;
  ws.getColumn('F').width = 22;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `${escola.nome.replace(/[/\\?%*:|"<>]/g, '_')}_PDM.xlsx`);
}

// ========================
// Export model (blank template)
// ========================

export async function exportarModeloXlsx(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Plan1');

  ws.getCell('C1').value =
    'ESSA PLANILHA DEVE SER PREENCHIDA A PARTIR DO DIA 26/08/2026 ATÉ 23/11/2026';
  ws.getCell('C1').font = { bold: true, size: 11, color: { argb: 'FFFF0000' } };

  ws.getCell('B2').value = 'NOME DA UNIDADE ESCOLAR:                                                                                                                                 CIDADE:';
  ws.getCell('B3').value = 'GESTOR (A):                                                                                                                                                             CONTATO:';
  ws.getCell('B4').value = 'EQUIPE MULTIPROFISSIONAL:';
  ws.getCell('B5').value = 'PONTO FOCAL DO PROGRAMA PÉ DE MEIA:                                                                                                          CONTATO:';
  ws.getCell('B6').value = 'SUPERINTENDÊNCIA:';

  for (let row = 2; row <= 6; row++) {
    ws.getCell(`B${row}`).font = { bold: true, size: 10 };
  }

  const headers = ['ID-SGE-MATRICULA', 'CPF ESTUDANTE', 'NOME DO ESTUDANTE', 'SITUAÇÃO 2025', 'SITUAÇÃO 2026'];
  headers.forEach((h, i) => {
    const col = String.fromCharCode(66 + i);
    ws.getCell(`${col}8`).value = h;
    ws.getCell(`${col}8`).font = { bold: true, size: 10 };
    ws.getCell(`${col}8`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    ws.getCell(`${col}8`).border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  ws.getColumn('B').width = 25;
  ws.getColumn('C').width = 18;
  ws.getColumn('D').width = 45;
  ws.getColumn('E').width = 22;
  ws.getColumn('F').width = 22;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, 'MODELO_LEVANTAMENTO_PDM_2025_2026.xlsx');
}

// ========================
// Export SRE consolidated
// ========================

export async function exportarSreXlsx(
  sreNome: string,
  escolas: Array<{
    escola: Escola | EscolaResumo;
    estudantes: Estudante[];
  }>,
  statusList: StatusSituacao[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const statusMap = new Map(statusList.map((s) => [s.id, s.rotulo]));
  const usedNames = new Set<string>();

  function getUniqueSheetName(name: string, inep: string): string {
    let cleanName = (name || inep || 'Escola')
      .replace(/[*?:/\\[\]']/g, '')
      .trim();

    if (!cleanName) cleanName = inep || 'Escola';

    let sheetName = cleanName.substring(0, 31).trim();

    let counter = 1;
    while (usedNames.has(sheetName.toUpperCase())) {
      const suffix = ` (${counter})`;
      const maxBaseLen = 31 - suffix.length;
      sheetName = `${cleanName.substring(0, maxBaseLen).trim()}${suffix}`;
      counter++;
    }

    usedNames.add(sheetName.toUpperCase());
    return sheetName;
  }

  // 1. Resumo SRE tab
  const wsResumo = wb.addWorksheet('Resumo SRE');
  usedNames.add('RESUMO SRE');

  wsResumo.getCell('B2').value = `SUPERINTENDÊNCIA: ${sreNome.toUpperCase()}`;
  wsResumo.getCell('B2').font = { bold: true, size: 13, color: { argb: 'FF1E3A8A' } };

  wsResumo.getCell('B3').value = `Total de Escolas: ${escolas.length} | Levantamento Pé-de-Meia (2025/2026)`;
  wsResumo.getCell('B3').font = { size: 10, italic: true, color: { argb: 'FF64748B' } };

  const resumoHeaders = [
    'INEP',
    'NOME DA ESCOLA',
    'CIDADE',
    'GESTOR (A)',
    'CONTATO GESTOR',
    'PONTO FOCAL PDM',
    'CONTATO PONTO FOCAL',
    'TOTAL ESTUDANTES',
    'STATUS',
  ];

  resumoHeaders.forEach((h, i) => {
    const col = String.fromCharCode(66 + i); // B to J
    wsResumo.getCell(`${col}5`).value = h;
    wsResumo.getCell(`${col}5`).font = { bold: true, size: 10 };
    wsResumo.getCell(`${col}5`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    wsResumo.getCell(`${col}5`).border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  escolas.forEach(({ escola, estudantes }, idx) => {
    const row = 6 + idx;
    wsResumo.getCell(`B${row}`).value = escola.codigo_inep;
    wsResumo.getCell(`C${row}`).value = escola.nome;
    wsResumo.getCell(`D${row}`).value = escola.cidade ?? '';
    wsResumo.getCell(`E${row}`).value = escola.gestor_nome ?? '';
    wsResumo.getCell(`F${row}`).value = escola.gestor_contato ?? '';
    wsResumo.getCell(`G${row}`).value = escola.ponto_focal_pdm_nome ?? '';
    wsResumo.getCell(`H${row}`).value = escola.ponto_focal_pdm_contato ?? '';
    wsResumo.getCell(`I${row}`).value = estudantes.length;

    const statusPreenchimento =
      'status_preenchimento' in escola
        ? (escola as EscolaResumo).status_preenchimento
        : estudantes.length > 0
        ? 'completo'
        : 'vazio';

    wsResumo.getCell(`J${row}`).value =
      statusPreenchimento === 'completo'
        ? 'Completo'
        : statusPreenchimento === 'parcial'
        ? 'Parcial'
        : 'Vazio';

    for (let c = 66; c <= 74; c++) {
      wsResumo.getCell(`${String.fromCharCode(c)}${row}`).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    }
  });

  wsResumo.getColumn('B').width = 16;
  wsResumo.getColumn('C').width = 45;
  wsResumo.getColumn('D').width = 20;
  wsResumo.getColumn('E').width = 30;
  wsResumo.getColumn('F').width = 18;
  wsResumo.getColumn('G').width = 30;
  wsResumo.getColumn('H').width = 18;
  wsResumo.getColumn('I').width = 18;
  wsResumo.getColumn('J').width = 16;

  // 2. Individual school tabs
  for (const { escola, estudantes } of escolas) {
    const sheetName = getUniqueSheetName(escola.nome, escola.codigo_inep);
    const ws = wb.addWorksheet(sheetName);

    ws.getCell('C1').value =
      'ESSA PLANILHA DEVE SER PREENCHIDA A PARTIR DO DIA 26/08/2026 ATÉ 23/11/2026';
    ws.getCell('C1').font = { bold: true, size: 11, color: { argb: 'FFFF0000' } };

    ws.getCell('B2').value = `NOME DA UNIDADE ESCOLAR: ${escola.nome}                                                                                                                                 CIDADE: ${escola.cidade ?? ''}`;
    ws.getCell('B3').value = `GESTOR (A): ${escola.gestor_nome ?? ''}                                                                                                                                                             CONTATO: ${escola.gestor_contato ?? ''}`;
    ws.getCell('B4').value = `EQUIPE MULTIPROFISSIONAL: ${escola.equipe_multiprofissional ?? ''}`;
    ws.getCell('B5').value = `PONTO FOCAL DO PROGRAMA PÉ DE MEIA: ${escola.ponto_focal_pdm_nome ?? ''}                                                                                                          CONTATO: ${escola.ponto_focal_pdm_contato ?? ''}`;
    ws.getCell('B6').value = `SUPERINTENDÊNCIA: ${sreNome}`;

    for (let row = 2; row <= 6; row++) {
      ws.getCell(`B${row}`).font = { bold: true, size: 10 };
    }

    const headers = ['ID-SGE-MATRICULA', 'CPF ESTUDANTE', 'NOME DO ESTUDANTE', 'SITUAÇÃO 2025', 'SITUAÇÃO 2026'];
    headers.forEach((h, i) => {
      const col = String.fromCharCode(66 + i);
      ws.getCell(`${col}8`).value = h;
      ws.getCell(`${col}8`).font = { bold: true, size: 10 };
      ws.getCell(`${col}8`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      ws.getCell(`${col}8`).border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    estudantes.forEach((est, index) => {
      const row = 9 + index;
      ws.getCell(`B${row}`).value = est.id_sge_matricula;
      ws.getCell(`C${row}`).value = est.cpf;
      ws.getCell(`D${row}`).value = est.nome;
      ws.getCell(`E${row}`).value = est.situacao_2025_id
        ? statusMap.get(est.situacao_2025_id) ?? ''
        : '';
      ws.getCell(`F${row}`).value = est.situacao_2026_id
        ? statusMap.get(est.situacao_2026_id) ?? ''
        : '';

      for (let col = 66; col <= 70; col++) {
        ws.getCell(`${String.fromCharCode(col)}${row}`).border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    });

    ws.getColumn('B').width = 25;
    ws.getColumn('C').width = 18;
    ws.getColumn('D').width = 45;
    ws.getColumn('E').width = 22;
    ws.getColumn('F').width = 22;
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `${sreNome.replace(/[/\\?%*:|"<>]/g, '_')}_PDM_consolidado.xlsx`);
}

// ========================
// Parse uploaded XLSX
// ========================

function extractField(value: unknown, prefix: string): string {
  if (typeof value !== 'string') return '';
  const idx = value.indexOf(prefix);
  if (idx === -1) return '';
  let after = value.substring(idx + prefix.length).trim();
  // If there's another field on the same line (like "CIDADE:"), extract only up to the next colon-prefixed section
  const nextKeywords = ['CIDADE:', 'CONTATO:', 'SUPERINTENDÊNCIA:'];
  for (const kw of nextKeywords) {
    if (kw === prefix) continue;
    const kwIdx = after.indexOf(kw);
    if (kwIdx > 0) {
      after = after.substring(0, kwIdx).trim();
    }
  }
  return after.trim();
}

function extractAfterLastColon(value: unknown, keyword: string): string {
  if (typeof value !== 'string') return '';
  const idx = value.lastIndexOf(keyword);
  if (idx === -1) return '';
  return value.substring(idx + keyword.length).trim();
}

function getCellString(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val).trim();
  if (typeof val === 'object') {
    const obj = val as unknown as Record<string, unknown>;
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>).map((t) => t.text ?? '').join('').trim();
    }
    if ('result' in obj) {
      return String(obj.result ?? '').trim();
    }
    if ('text' in obj) {
      return String(obj.text ?? '').trim();
    }
  }
  return String(val).trim();
}

export async function parseUploadedFile(
  file: File,
  statusList: StatusSituacao[]
): Promise<ImportPreview> {
  const statusMap = new Map(
    statusList.map((s) => [s.rotulo.toLowerCase().trim(), s.id])
  );

  const header: ImportPreview['header'] = {};
  const rows: ImportRow[] = [];

  if (
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls')
  ) {
    const wb = new ExcelJS.Workbook();
    const buf = await file.arrayBuffer();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet(1);
    if (!ws) throw new Error('Planilha sem dados');

    // Parse header (B2:B6)
    const b2 = ws.getCell('B2').value;
    const b3 = ws.getCell('B3').value;
    const b4 = ws.getCell('B4').value;
    const b5 = ws.getCell('B5').value;
    const b6 = ws.getCell('B6').value;

    header.nome_unidade = extractField(b2, 'NOME DA UNIDADE ESCOLAR:');
    header.cidade = extractAfterLastColon(b2, 'CIDADE:');
    header.gestor = extractField(b3, 'GESTOR (A):');
    header.gestor_contato = extractAfterLastColon(b3, 'CONTATO:');
    header.equipe_multiprofissional = extractField(b4, 'EQUIPE MULTIPROFISSIONAL:');
    header.ponto_focal_nome = extractField(b5, 'PONTO FOCAL DO PROGRAMA PÉ DE MEIA:');
    header.ponto_focal_contato = extractAfterLastColon(b5, 'CONTATO:');
    header.superintendencia = extractField(b6, 'SUPERINTENDÊNCIA:');

    // Parse data rows starting from row 9 (row 8 is header)
    const rowCount = ws.rowCount;
    for (let r = 9; r <= rowCount; r++) {
      const idSge = getCellString(ws.getCell(`B${r}`));
      const cpf = getCellString(ws.getCell(`C${r}`));
      const nome = getCellString(ws.getCell(`D${r}`));
      const sit2025 = getCellString(ws.getCell(`E${r}`));
      const sit2026 = getCellString(ws.getCell(`F${r}`));

      if (!idSge && !cpf && !nome) continue;

      const erros: string[] = [];
      if (!idSge) erros.push('ID-SGE-Matrícula vazio');
      if (!nome) erros.push('Nome vazio');

      const cpfLimpo = cpf.replace(/\D/g, '');
      if (!cpfLimpo) {
        erros.push('CPF vazio');
      } else if (cpfLimpo.length !== 11) {
        erros.push('CPF deve ter 11 dígitos');
      } else if (!validarDigitosCpf(cpfLimpo)) {
        erros.push('CPF inválido (dígito verificador)');
      }

      const observacoes: string[] = [];
      if (sit2025 && !statusMap.has(sit2025.toLowerCase().trim())) {
        observacoes.push(`Situação 2025: ${sit2025}`);
      }
      if (sit2026 && !statusMap.has(sit2026.toLowerCase().trim())) {
        observacoes.push(`Situação 2026: ${sit2026}`);
      }

      rows.push({
        linha: r,
        id_sge_matricula: idSge,
        cpf: cpfLimpo,
        nome,
        situacao_2025: sit2025,
        situacao_2026: sit2026,
        erros,
        observacoes,
      });
    }
  } else if (file.name.endsWith('.csv')) {
    const text = await file.text();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // CSV: skip header line, columns: id_sge_matricula, cpf, nome, situacao_2025, situacao_2026
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));

      const idSge = parts[0] ?? '';
      const cpf = parts[1] ?? '';
      const nome = parts[2] ?? '';
      const sit2025 = parts[3] ?? '';
      const sit2026 = parts[4] ?? '';

      if (!idSge && !cpf && !nome) continue;

      const erros: string[] = [];
      if (!idSge) erros.push('ID-SGE-Matrícula vazio');
      if (!nome) erros.push('Nome vazio');

      const cpfLimpo = cpf.replace(/\D/g, '');
      if (!cpfLimpo) {
        erros.push('CPF vazio');
      } else if (cpfLimpo.length !== 11) {
        erros.push('CPF deve ter 11 dígitos');
      } else if (!validarDigitosCpf(cpfLimpo)) {
        erros.push('CPF inválido');
      }

      const observacoes: string[] = [];
      if (sit2025 && !statusMap.has(sit2025.toLowerCase().trim())) {
        observacoes.push(`Situação 2025: ${sit2025}`);
      }
      if (sit2026 && !statusMap.has(sit2026.toLowerCase().trim())) {
        observacoes.push(`Situação 2026: ${sit2026}`);
      }

      rows.push({
        linha: i + 1,
        id_sge_matricula: idSge,
        cpf: cpfLimpo,
        nome,
        situacao_2025: sit2025,
        situacao_2026: sit2026,
        erros,
        observacoes,
      });
    }
  }

  // Check for duplicate CPFs within the import
  const cpfCounts = new Map<string, number[]>();
  rows.forEach((r, idx) => {
    if (r.cpf) {
      const arr = cpfCounts.get(r.cpf) ?? [];
      arr.push(idx);
      cpfCounts.set(r.cpf, arr);
    }
  });
  for (const [cpf, indices] of cpfCounts) {
    if (indices.length > 1) {
      for (const idx of indices) {
        rows[idx]!.erros.push(`CPF ${cpf} duplicado no arquivo`);
      }
    }
  }

  // Check for duplicate matriculas
  const matCounts = new Map<string, number[]>();
  rows.forEach((r, idx) => {
    if (r.id_sge_matricula) {
      const arr = matCounts.get(r.id_sge_matricula) ?? [];
      arr.push(idx);
      matCounts.set(r.id_sge_matricula, arr);
    }
  });
  for (const [mat, indices] of matCounts) {
    if (indices.length > 1) {
      for (const idx of indices) {
        rows[idx]!.erros.push(`Matrícula ${mat} duplicada no arquivo`);
      }
    }
  }

  const totalErros = rows.filter((r) => r.erros.length > 0).length;
  const totalValidos = rows.filter((r) => r.erros.length === 0).length;

  return { header, rows, totalErros, totalValidos };
}
