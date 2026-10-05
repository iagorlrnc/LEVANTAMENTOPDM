import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { Papel } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Papel[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, perfil, loading, refreshPerfil, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          <p className="text-sm text-surface-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!perfil) {
    const handleRetry = async () => {
      setRetrying(true);
      try {
        await refreshPerfil();
      } finally {
        setRetrying(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-surface-50">
        <div className="card p-8 text-center max-w-md w-full shadow-lg border border-surface-200">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-2">
            Perfil não encontrado
          </h2>
          <p className="text-sm text-surface-600 mb-4 leading-relaxed">
            O usuário <strong className="text-surface-800">{user.email}</strong> está autenticado, mas seu registro na tabela de perfis ainda não foi localizado.
          </p>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 text-left mb-6 leading-relaxed">
            <strong>Dica:</strong> Se você acabou de criar o usuário ou aplicar a migração no Supabase, clique no botão abaixo para gerar ou sincronizar seu perfil automaticamente.
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="btn-primary w-full sm:w-auto justify-center"
            >
              {retrying ? 'Sincronizando...' : 'Sincronizar Perfil'}
            </button>
            <button
              onClick={() => signOut()}
              className="btn-secondary w-full sm:w-auto justify-center"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(perfil.papel)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
