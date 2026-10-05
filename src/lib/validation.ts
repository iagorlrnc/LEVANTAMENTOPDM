import { z } from 'zod';

// ========================
// CPF validation
// ========================

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
// Masks
// ========================

export function formatCpf(cpf: string): string {
  const nums = cpf.replace(/\D/g, '');
  return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function maskCpf(cpf: string): string {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return cpf;
  return `***.${nums.slice(3, 6)}.${nums.slice(6, 9)}-**`;
}

export function formatPhone(phone: string): string {
  const nums = phone.replace(/\D/g, '');
  if (nums.length === 11) {
    return nums.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (nums.length === 10) {
    return nums.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// ========================
// Zod schemas
// ========================

export const cpfSchema = z
  .string()
  .min(1, 'CPF é obrigatório')
  .transform((val) => val.replace(/\D/g, ''))
  .refine((val) => val.length === 11, 'CPF deve conter 11 dígitos')
  .refine(validarDigitosCpf, 'CPF inválido');

export const escolaDadosSchema = z.object({
  cidade: z.string().optional(),
  gestor_nome: z.string().min(1, 'Nome do gestor é obrigatório'),
  gestor_contato: z.string().min(1, 'Contato do gestor é obrigatório'),
  equipe_multiprofissional: z.string().optional().default(''),
  ponto_focal_pdm_nome: z.string().min(1, 'Ponto focal é obrigatório'),
  ponto_focal_pdm_contato: z.string().min(1, 'Contato do ponto focal é obrigatório'),
});

export const estudanteSchema = z.object({
  id_sge_matricula: z.string().min(1, 'ID-SGE-Matrícula é obrigatório'),
  cpf: cpfSchema,
  nome: z.string().min(1, 'Nome é obrigatório'),
  situacao_2025_id: z.number().nullable(),
  situacao_2026_id: z.number().nullable(),
});

export const observacaoSchema = z.object({
  texto: z.string().min(1, 'O texto da observação é obrigatório'),
  estudante_id: z.string().nullable().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const recuperarSenhaSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export const criarUsuarioSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  papel: z.enum(['admin', 'sre']),
  sre_id: z.number().nullable().optional(),
  escola_id: z.number().nullable().optional(),
});

export const statusSituacaoSchema = z.object({
  rotulo: z.string().min(1, 'Rótulo é obrigatório'),
  cor: z.string().min(1, 'Cor é obrigatória'),
  ordem: z.number().int().min(0),
  ativo: z.boolean(),
});

export type EscolaDadosForm = z.infer<typeof escolaDadosSchema>;
export type EstudanteForm = z.infer<typeof estudanteSchema>;
export type ObservacaoForm = z.infer<typeof observacaoSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type RecuperarSenhaForm = z.infer<typeof recuperarSenhaSchema>;
export type CriarUsuarioForm = z.infer<typeof criarUsuarioSchema>;
export type StatusSituacaoForm = z.infer<typeof statusSituacaoSchema>;
