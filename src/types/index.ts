// ========================
// Database types
// ========================

export type Papel = 'admin' | 'sre';

export interface Sre {
  id: number;
  nome: string;
}

export interface Escola {
  id: number;
  codigo_inep: string;
  nome: string;
  sre_id: number;
  series_ofertadas: string[];
  cidade: string | null;
  gestor_nome: string | null;
  gestor_contato: string | null;
  equipe_multiprofissional: string | null;
  ponto_focal_pdm_nome: string | null;
  ponto_focal_pdm_contato: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface EscolaComSre extends Escola {
  sre: Sre;
}

export interface StatusSituacao {
  id: number;
  rotulo: string;
  cor: string;
  ordem: number;
  ativo: boolean;
}

export interface Estudante {
  id: string;
  escola_id: number;
  id_sge_matricula: string;
  cpf: string;
  nome: string;
  situacao_2025_id: number | null;
  situacao_2026_id: number | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface EstudanteComSituacao extends Estudante {
  situacao_2025: StatusSituacao | null;
  situacao_2026: StatusSituacao | null;
}

export interface Observacao {
  id: string;
  escola_id: number;
  estudante_id: string | null;
  texto: string;
  autor_id: string;
  created_at: string;
  autor?: Perfil;
}

export interface Perfil {
  id: string;
  nome: string;
  papel: Papel;
  sre_id: number | null;
  escola_id: number | null;
  email?: string;
}

export interface Auditoria {
  id: string;
  tabela: string;
  registro_id: string;
  acao: string;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  usuario_id: string | null;
  created_at: string;
  usuario?: Perfil;
}

// ========================
// Dashboard / aggregation types
// ========================

export interface SreDashboard extends Sre {
  total_escolas: number;
  escolas_com_estudantes: number;
  escolas_com_2025: number;
  escolas_com_2026: number;
  total_estudantes: number;
  pct_situacao_2025: number;
  pct_situacao_2026: number;
}

export interface EscolaResumo extends Escola {
  total_estudantes: number;
  status_preenchimento: 'vazio' | 'parcial' | 'completo';
}

// ========================
// Import preview types
// ========================

export interface ImportRow {
  linha: number;
  id_sge_matricula: string;
  cpf: string;
  nome: string;
  situacao_2025: string;
  situacao_2026: string;
  erros: string[];
  observacoes?: string[];
}

export interface ImportHeader {
  nome_unidade?: string;
  cidade?: string;
  gestor?: string;
  gestor_contato?: string;
  equipe_multiprofissional?: string;
  ponto_focal_nome?: string;
  ponto_focal_contato?: string;
  superintendencia?: string;
}

export interface ImportPreview {
  header: ImportHeader;
  rows: ImportRow[];
  totalErros: number;
  totalValidos: number;
}
