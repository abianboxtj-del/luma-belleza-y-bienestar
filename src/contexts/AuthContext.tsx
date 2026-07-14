import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
    let isMounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(false);
      const userId = nextSession.user.id;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);

      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!isMounted) return;
          if (error) {
            console.warn('Error fetching profile:', error.message);
            setProfile(null);
          } else {
            setProfile(data as UserProfile | null);
          }
          setLoading(false);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error('Error in fetchProfile:', error);
          setProfile(null);
          setLoading(false);
        })
        .finally(() => {
          window.clearTimeout(timeout);
        });
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      applySession(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    isOwner,
    isEmployee,
    isAdmin,
    signOut,
  }), [user, profile, session, loading, isOwner, isEmployee, isAdmin]);

  return (
    <AuthContext.Provider value={value}>
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