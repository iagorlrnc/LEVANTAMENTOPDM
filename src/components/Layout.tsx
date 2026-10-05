import { type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { perfil, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-white to-primary-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-surface-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-surface-900 leading-tight">
                  Levantamento PDM
                </h1>
                <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">
                  Pé-de-Meia 2025/2026
                </p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  location.pathname === '/'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                }`}
              >
                Painel
              </Link>
              {perfil?.papel === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive('/admin')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                  }`}
                >
                  Administração
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {perfil && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                    <span className="text-xs font-bold uppercase">
                      {perfil.nome.charAt(0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-surface-700 leading-tight">
                      {perfil.nome}
                    </p>
                    <p className="text-[10px] text-surface-400 uppercase tracking-wide">
                      {perfil.papel}
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="btn-ghost btn-sm"
                title="Sair"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
