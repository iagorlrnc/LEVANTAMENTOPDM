import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Perfil } from '@/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = useCallback(async (userId: string) => {
    // 1. Tenta buscar o perfil diretamente
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setPerfil(data as Perfil);
      return;
    }

    // 2. Se não encontrou, chama a função RPC de autocriação/garantia de perfil
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('garantir_meu_perfil');
      if (rpcData && !rpcError) {
        setPerfil(rpcData as Perfil);
        return;
      }
    } catch {
      // Ignora falha de RPC se a migração ainda não tiver sido aplicada
    }

    setPerfil(null);
  }, []);

  const refreshPerfil = useCallback(async () => {
    if (user) {
      await fetchPerfil(user.id);
    }
  }, [user, fetchPerfil]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchPerfil(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchPerfil(s.user.id);
      } else {
        setPerfil(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPerfil]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setPerfil(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ session, user, perfil, loading, signIn, signOut, resetPassword, refreshPerfil }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
