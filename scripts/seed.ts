import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

interface CsvRow {
  codigoInep: string;
  escolaId: number;
  escolaNome: string;
  subordinadoraId: number;
  subordinadora: string;
  descricao: string;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    // Handle CSV with quoted fields containing commas
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length >= 6) {
      rows.push({
        codigoInep: parts[0]!,
        escolaId: parseInt(parts[1]!),
        escolaNome: parts[2]!,
        subordinadoraId: parseInt(parts[3]!),
        subordinadora: parts[4]!,
        descricao: parts[5]!,
      });
    }
  }

  return rows;
}

async function seed() {
  console.log('🌱 Iniciando seed do Levantamento PDM 2025/2026...\n');

  // Read CSV
  const csvPath = resolve(process.cwd(), 'escolas_filtradas_ordenado (1).csv');
  let csvContent: string;
  try {
    csvContent = readFileSync(csvPath, 'utf-8');
  } catch {
    console.error(`❌ Arquivo CSV não encontrado: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCsv(csvContent);
  console.log(`📄 CSV lido: ${rows.length} escolas\n`);

  // Extract unique SREs
  const sreMap = new Map<number, string>();
  for (const row of rows) {
    sreMap.set(row.subordinadoraId, row.subordinadora);
  }

  // Upsert SREs
  const sres = Array.from(sreMap.entries()).map(([id, nome]) => ({ id, nome }));
  const { error: sreError } = await supabase
    .from('sres')
    .upsert(sres, { onConflict: 'id' });

  if (sreError) {
    console.error('❌ Erro ao inserir SREs:', sreError.message);
    process.exit(1);
  }
  console.log(`✅ ${sres.length} SREs inseridas/atualizadas`);

  // Upsert Escolas
  const escolas = rows.map((row) => ({
    id: row.escolaId,
    codigo_inep: row.codigoInep,
    nome: row.escolaNome,
    sre_id: row.subordinadoraId,
    series_ofertadas: row.descricao
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  }));

  // Batch insert to avoid hitting limits
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < escolas.length; i += batchSize) {
    const batch = escolas.slice(i, i + batchSize);
    const { error } = await supabase
      .from('escolas')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Erro ao inserir escolas (batch ${i}):`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
  }
  console.log(`✅ ${inserted} escolas inseridas/atualizadas\n`);

  // Report by SRE
  console.log('📊 Distribuição por SRE:');
  console.log('─'.repeat(50));

  const countBySre = new Map<string, number>();
  for (const row of rows) {
    countBySre.set(row.subordinadora, (countBySre.get(row.subordinadora) ?? 0) + 1);
  }

  const sortedSres = Array.from(countBySre.entries()).sort((a, b) => b[1] - a[1]);
  let total = 0;
  for (const [nome, count] of sortedSres) {
    console.log(`  ${nome.padEnd(30)} ${count}`);
    total += count;
  }
  console.log('─'.repeat(50));
  console.log(`  ${'TOTAL'.padEnd(30)} ${total}`);
  console.log(`\n✅ Seed concluído com sucesso!`);
}

seed().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
