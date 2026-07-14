import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session && !loading) {
      navigate('/admin', { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-water-50/30">
        <div className="animate-pulse text-water-600 font-serif">Cargando...</div>
      </div>
    );
  }
  
  if (session) {
    return <Navigate to="/admin" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.session) {
        toast.success('¡Bienvenido de nuevo!');
        window.location.replace('/admin');
        return;
      }
      toast.error('No se pudo iniciar la sesión. Intenta de nuevo.');
    } catch (error: any) {
      toast.error('Credenciales inválidas o acceso no autorizado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-water-50/30 p-4 pt-24">
      <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-4xl shadow-xl border border-water-100">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden border-2 border-water-100 shadow-sm bg-white">
            <img
              src="/logo-luma.png"
              alt="Lumá Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-serif text-water-900 mb-2">Panel de Control</h1>
          <p className="text-stone-500 text-sm">Ingresa tus credenciales para gestionar Lumá</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-water-400" />
              <Input 
                id="email" 
                type="email" 
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 rounded-xl border-water-100 focus:border-water-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-water-400" />
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 rounded-xl border-water-100 focus:border-water-500"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full btn-primary py-6 text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            <LogIn className="ml-2 w-5 h-5" />
          </Button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-water-50 text-center">
          <p className="text-[10px] text-stone-400 italic">
            Acceso restringido solo para personal autorizado de Lumá.
          </p>
        </div>
      </div>
    </div>
  );
}