import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface XlsxEscola {
  row: number;
  inep: string;
  nome: string;
  municipio: string;
  codMunicipio: string;
  localizacao: string;
  seriesOfertadas: string[];
}

function extractSeries(row: ExcelJS.Row): string[] {
  const series: string[] = [];

  // Check Ensino Médio columns (23: 1ª série, 24: 2ª série, 25: 3ª série, 26: 4ª série, 27: Não-seriado)
  const med1 = row.getCell(23).value;
  const med2 = row.getCell(24).value;
  const med3 = row.getCell(25).value;
  const med4 = row.getCell(26).value;

  const isVal = (v: ExcelJS.CellValue) => v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '--';

  if (isVal(med1)) series.push('1ª SÉRIE');
  if (isVal(med2)) series.push('2ª SÉRIE');
  if (isVal(med3)) series.push('3ª SÉRIE');
  if (isVal(med4)) series.push('4ª SÉRIE');

  // If no Ensino Médio, check Fundamental
  if (series.length === 0) {
    const funAi = row.getCell(11).value;
    const funAf = row.getCell(12).value;
    if (isVal(funAi) && isVal(funAf)) {
      series.push('ENSINO FUNDAMENTAL');
    } else if (isVal(funAf)) {
      series.push('ANOS FINAIS');
    } else if (isVal(funAi)) {
      series.push('ANOS INICIAIS');
    } else {
      series.push('1ª SÉRIE', '2ª SÉRIE', '3ª SÉRIE');
    }
  }

  return series;
}

async function run() {
  console.log('🚀 Iniciando importação de escolas estaduais do arquivo XLSX...\n');

  // Find XLSX path
  const candidatePaths = [
    resolve(process.cwd(), 'Taxa de rendimento_escolas_2025 (1).xlsx'),
    'C:/Users/iagoor/Downloads/Taxa de rendimento_escolas_2025 (1).xlsx',
    'C:/Users/iagoor/Downloads/Taxa de rendimento_escolas_2025.xlsx',
  ];

  let xlsxPath = '';
  for (const p of candidatePaths) {
    if (existsSync(p)) {
      xlsxPath = p;
      break;
    }
  }

  if (!xlsxPath) {
    console.error('❌ Arquivo "Taxa de rendimento_escolas_2025 (1).xlsx" não encontrado.');
    process.exit(1);
  }

  console.log(`📖 Lendo arquivo: ${xlsxPath}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.worksheets[0];
  if (!ws) {
    console.error('❌ Nenhuma planilha encontrada no arquivo.');
    process.exit(1);
  }

  // 1. Fetch SREs from database
  const { data: sres, error: sreError } = await supabase.from('sres').select('*');
  if (sreError || !sres) {
    console.error('❌ Erro ao buscar SREs:', sreError?.message);
    process.exit(1);
  }
  const sreById = new Map<number, string>(sres.map((s) => [s.id, s.nome]));
  const sreByName = new Map<string, number>(sres.map((s) => [s.nome.toUpperCase().trim(), s.id]));

  // 2. Fetch existing schools from database
  const { data: dbEscolas, error: dbError } = await supabase.from('escolas').select('id, codigo_inep, nome, sre_id, cidade');
  if (dbError || !dbEscolas) {
    console.error('❌ Erro ao buscar escolas do banco:', dbError?.message);
    process.exit(1);
  }

  const existingByInep = new Map<string, (typeof dbEscolas)[0]>();
  let maxId = 0;
  for (const e of dbEscolas) {
    existingByInep.set(String(e.codigo_inep).trim(), e);
    if (e.id > maxId) maxId = e.id;
  }
  console.log(`📊 Escolas existentes no banco de dados: ${dbEscolas.length} (Maior ID: ${maxId})\n`);

  // 3. Read CSV to get established SRE per INEP and municipality
  const csvPath = resolve(process.cwd(), 'escolas_filtradas_ordenado (1).csv');
  let csvLines: string[] = [];
  if (existsSync(csvPath)) {
    csvLines = readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
  }

  const csvInepToSre = new Map<string, { sreId: number; sreNome: string }>();
  for (let i = 1; i < csvLines.length; i++) {
    const parts = csvLines[i]!.split(',');
    if (parts.length >= 5) {
      csvInepToSre.set(parts[0]!.trim(), {
        sreId: parseInt(parts[3]!.trim()),
        sreNome: parts[4]!.trim(),
      });
    }
  }

  // 4. Extract all state schools from XLSX
  const xlsxEscolas: XlsxEscola[] = [];
  for (let r = 10; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const dep = String(row.getCell(9).value ?? '').trim();
    if (dep === 'Estadual') {
      const inep = String(row.getCell(6).value ?? '').trim();
      const nome = String(row.getCell(7).value ?? '').trim();
      const municipio = String(row.getCell(5).value ?? '').trim();
      const codMunicipio = String(row.getCell(4).value ?? '').trim();
      const localizacao = String(row.getCell(8).value ?? '').trim();
      const seriesOfertadas = extractSeries(row);

      xlsxEscolas.push({
        row: r,
        inep,
        nome,
        municipio,
        codMunicipio,
        localizacao,
        seriesOfertadas,
      });
    }
  }

  console.log(`📋 Total de escolas estaduais encontradas no XLSX: ${xlsxEscolas.length}`);

  // Build municipality -> SRE mapping from matched schools
  const munToSre = new Map<string, { sreId: number; sreNome: string }>();
  for (const esc of xlsxEscolas) {
    if (csvInepToSre.has(esc.inep)) {
      const sre = csvInepToSre.get(esc.inep)!;
      if (esc.municipio === 'Porto Nacional') {
        munToSre.set(esc.municipio, { sreId: 4, sreNome: 'PORTO NACIONAL' });
      } else if (esc.municipio === 'Lagoa da Confusão') {
        munToSre.set(esc.municipio, { sreId: 289, sreNome: 'PARAÍSO' });
      } else if (!munToSre.has(esc.municipio)) {
        munToSre.set(esc.municipio, sre);
      }
    }
  }

  // Fallback map for any known SEDUC-TO municipality associations
  if (!munToSre.has('Porto Nacional')) munToSre.set('Porto Nacional', { sreId: 4, sreNome: 'PORTO NACIONAL' });
  if (!munToSre.has('Lagoa da Confusão')) munToSre.set('Lagoa da Confusão', { sreId: 289, sreNome: 'PARAÍSO' });

  // 5. Separate already existing schools vs new schools to add
  const jaCadastradas: XlsxEscola[] = [];
  const novasParaAdicionar: Array<{
    id: number;
    codigo_inep: string;
    nome: string;
    sre_id: number;
    sre_nome: string;
    cidade: string;
    series_ofertadas: string[];
  }> = [];

  let nextId = Math.max(maxId, 3000) + 1;

  for (const esc of xlsxEscolas) {
    if (existingByInep.has(esc.inep)) {
      jaCadastradas.push(esc);
      // If cidade in DB was null, update it
      const existing = existingByInep.get(esc.inep)!;
      if (!existing.cidade && esc.municipio) {
        await supabase
          .from('escolas')
          .update({ cidade: esc.municipio })
          .eq('codigo_inep', esc.inep);
      }
    } else {
      const targetSre = munToSre.get(esc.municipio);
      if (!targetSre) {
        console.warn(`⚠️ Não foi possível determinar SRE para município: ${esc.municipio} (Escola: ${esc.nome})`);
        continue;
      }

      novasParaAdicionar.push({
        id: nextId++,
        codigo_inep: esc.inep,
        nome: esc.nome,
        sre_id: targetSre.sreId,
        sre_nome: targetSre.sreNome,
        cidade: esc.municipio,
        series_ofertadas: esc.seriesOfertadas,
      });
    }
  }

  console.log(`\n🔍 Verificação por Código INEP:`);
  console.log(`   - Já existentes no banco (não duplicadas): ${jaCadastradas.length}`);
  console.log(`   - Novas escolas estaduais a cadastrar: ${novasParaAdicionar.length}`);

  // 6. Insert new schools into database in batches
  if (novasParaAdicionar.length > 0) {
    console.log('\n💾 Inserindo novas escolas no banco de dados...');
    const batchSize = 50;
    for (let i = 0; i < novasParaAdicionar.length; i += batchSize) {
      const batch = novasParaAdicionar.slice(i, i + batchSize).map((item) => ({
        id: item.id,
        codigo_inep: item.codigo_inep,
        nome: item.nome,
        sre_id: item.sre_id,
        cidade: item.cidade,
        series_ofertadas: item.series_ofertadas,
      }));

      const { error: insertError } = await supabase.from('escolas').insert(batch);
      if (insertError) {
        console.error(`❌ Erro no lote ${i} a ${i + batch.length}:`, insertError.message);
        process.exit(1);
      }
    }
    console.log(`✅ ${novasParaAdicionar.length} novas escolas inseridas no banco com sucesso!`);
  }

  // 7. Update CSV file so project stays consistent
  if (novasParaAdicionar.length > 0 && existsSync(csvPath)) {
    console.log('\n📄 Atualizando arquivo escolas_filtradas_ordenado (1).csv...');
    const newLines = novasParaAdicionar.map((item) => {
      const seriesDesc = `"${item.series_ofertadas.join(', ')}"`;
      return `${item.codigo_inep},${item.id},${item.nome},${item.sre_id},${item.sre_nome},${seriesDesc}`;
    });

    const updatedCsv = csvLines.concat(newLines).join('\n') + '\n';
    writeFileSync(csvPath, updatedCsv, 'utf-8');
    console.log(`✅ CSV atualizado com ${novasParaAdicionar.length} novas linhas!`);
  }

  // 8. Breakdown by SRE
  console.log('\n📊 Distribuição das NOVAS escolas adicionadas por Superintendência:');
  console.log('─'.repeat(60));
  const countsBySre = new Map<string, number>();
  for (const item of novasParaAdicionar) {
    countsBySre.set(item.sre_nome, (countsBySre.get(item.sre_nome) || 0) + 1);
  }
  const sortedCounts = Array.from(countsBySre.entries()).sort((a, b) => b[1] - a[1]);
  for (const [nome, count] of sortedCounts) {
    console.log(`  ${nome.padEnd(35)} +${count} escolas`);
  }
  console.log('─'.repeat(60));
  console.log(`  ${'TOTAL NOVAS'.padEnd(35)} +${novasParaAdicionar.length} escolas`);

  // Final check
  const { count: finalCount } = await supabase.from('escolas').select('*', { count: 'exact', head: true });
  console.log(`\n🎉 Total final de escolas cadastradas no sistema: ${finalCount}`);
}

run().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
