import React, { createContext, useContext, useMemo, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
  const [user] = useState<User | null>(null);
  const [profile] = useState<UserProfile | null>(null);
  const [session] = useState<Session | null>(null);
  const [loading] = useState(false);

  const signOut = async () => {
    // Se mantiene como no-op para no romper la navegación mientras no haya auth activa.
    return;
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