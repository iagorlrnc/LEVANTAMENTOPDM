import { type ReactNode, useState, useRef, useEffect } from 'react';

// ========================
// Modal
// ========================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`w-full ${sizeClass} bg-white rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

// ========================
// Confirm Dialog
// ========================

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-surface-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary btn-sm">
          Cancelar
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={danger ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ========================
// Empty State
// ========================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 text-surface-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-surface-700 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 text-center max-w-md mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}

// ========================
// Skeleton
// ========================

export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-4">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="skeleton h-2 w-full rounded-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="skeleton h-10 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

// ========================
// Tabs
// ========================

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 border-b border-surface-200 overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
            activeTab === tab.id
              ? 'border-primary-500 text-primary-700 bg-primary-50/50'
              : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ========================
// Progress Bar
// ========================

interface ProgressBarProps {
  value: number;
  className?: string;
  color?: 'primary' | 'accent' | 'amber' | 'red';
}

export function ProgressBar({ value, className = '', color = 'primary' }: ProgressBarProps) {
  const colorClasses = {
    primary: 'bg-primary-500',
    accent: 'bg-accent-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`h-2 w-full rounded-full bg-surface-200 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${colorClasses[color]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ========================
// Status Badge
// ========================

interface StatusBadgeProps {
  status: 'vazio' | 'parcial' | 'completo';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    vazio: { label: 'Vazio', className: 'badge-gray' },
    parcial: { label: 'Parcial', className: 'badge-yellow' },
    completo: { label: 'Completo', className: 'badge-green' },
  };
  const { label, className } = config[status];
  return <span className={className}>{label}</span>;
}

// ========================
// Countdown
// ========================

export function PrazoLevantamento() {
  const [, setTick] = useState(0);
  const inicio = new Date('2026-08-26T00:00:00-03:00');
  const fim = new Date('2026-11-23T23:59:59-03:00');
  const agora = new Date();

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  if (agora < inicio) {
    const dias = Math.ceil((inicio.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    return (
      <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
        <svg className="h-4 w-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-amber-700">
          O levantamento inicia em <strong>{dias} dia{dias !== 1 ? 's' : ''}</strong> (26/08/2026)
        </span>
      </div>
    );
  }

  if (agora > fim) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5">
        <svg className="h-4 w-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-red-700 font-medium">
          Prazo do levantamento encerrado em 23/11/2026
        </span>
      </div>
    );
  }

  const diasRestantes = Math.ceil((fim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
  const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  const pctDecorrido = Math.round(((totalDias - diasRestantes) / totalDias) * 100);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-accent-50 border border-accent-200 px-4 py-2.5">
      <svg className="h-4 w-4 text-accent-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-accent-700 font-medium">
            {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''} restante{diasRestantes !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-accent-500">{pctDecorrido}% do prazo</span>
        </div>
        <ProgressBar value={pctDecorrido} color="accent" />
      </div>
    </div>
  );
}

// ========================
// Pagination
// ========================

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="btn-ghost btn-sm"
      >
        ← Anterior
      </button>
      <span className="px-3 text-sm text-surface-500">
        {page + 1} de {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="btn-ghost btn-sm"
      >
        Próxima →
      </button>
    </div>
  );
}
