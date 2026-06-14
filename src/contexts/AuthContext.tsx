import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isOwner: boolean;
  isEmployee: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Red de seguridad: si por lo que sea una consulta queda colgada,
    // nunca dejamos la app atascada en el spinner para siempre.
    const safety = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    // Carga inicial de la sesión (lectura local, no dispara el lock).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // IMPORTANTE: el callback NO debe ser async ni await-ear consultas a la DB.
    // Supabase serializa las operaciones de auth tras un lock interno; consultar
    // la DB dentro del callback (que ya tiene el lock tomado) lo bloquea para
    // siempre y cuelga toda la app. Por eso diferimos fetchProfile con setTimeout,
    // que lo ejecuta fuera del callback, una vez liberado el lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const userId = session.user.id;
        setTimeout(() => {
          if (mounted) fetchProfile(userId);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    // Cortamos la consulta si tarda demasiado, para no colgar el spinner.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setProfile(null);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Dueño = rol 'owner'. Mantenemos el email principal como bootstrap por si su
  // fila aún no se migró a 'owner', para no quedar sin ningún dueño.
  const isOwner = profile?.role === 'owner' || user?.email === 'nahuelvalquinta2@gmail.com';
  // Empleado = 'admin': accede al panel pero solo a la agenda.
  const isEmployee = profile?.role === 'admin';
  // Cualquiera de los dos tiene acceso al panel de administración.
  const isAdmin = isOwner || isEmployee;

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isOwner, isEmployee, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}