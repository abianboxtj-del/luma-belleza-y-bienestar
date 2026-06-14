import React, { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, Mail, Shield, User, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'admin' as UserRole
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Traemos todos los perfiles. Si el RLS está bien configurado, 
      // el admin verá todos.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true });
      
      if (error) throw error;
      setUsers(data as UserProfile[] || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error('Error al cargar la lista de usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loadingToast = toast.loading('Creando cuenta...');

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: formData
      });

      if (error) {
        let errorMessage = 'Error al conectar con el servidor';
        try {
          const body = await error.context.json();
          errorMessage = body.error || errorMessage;
        } catch (e) {
          errorMessage = error.message || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (data?.error) throw new Error(data.error);

      toast.success('Usuario creado correctamente', { id: loadingToast });
      setIsDialogOpen(false);
      setFormData({ email: '', password: '', first_name: '', last_name: '', role: 'admin' });
      
      // Esperamos un momento para que el trigger de la DB termine de crear el perfil
      setTimeout(fetchUsers, 2000);
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (email === 'nahuelvalquinta2@gmail.com') {
      toast.error('No se puede eliminar al administrador principal');
      return;
    }

    if (window.confirm('¿Estás seguro de eliminar este acceso?')) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        toast.success('Acceso eliminado');
        fetchUsers();
      } catch (error: any) {
        toast.error(`Error al eliminar: ${error.message}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="pt-24 pb-12 bg-water-50/30 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-water-600" />
          <p className="text-stone-500 font-serif">Cargando equipo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 bg-water-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-serif text-water-900 mb-2">Usuarios</h1>
            <p className="text-stone-600">Gestiona el personal con acceso al panel de administración.</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchUsers} className="rounded-full border-water-200">
              <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary">
                  <UserPlus className="w-4 h-4 mr-2" /> Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif">Nuevo Acceso</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input 
                        value={formData.first_name} 
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido</Label>
                      <Input 
                        value={formData.last_name} 
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} 
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña (mín. 6 carac.)</Label>
                    <Input 
                      type="password" 
                      value={formData.password} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      required 
                      minLength={6} 
                    />
                  </div>
                  <Button type="submit" className="w-full btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {users.map((u) => (
            <div key={u.id} className="bg-white p-6 rounded-3xl border border-water-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.email === 'nahuelvalquinta2@gmail.com' ? 'bg-water-900 text-white' : 'bg-water-50 text-water-600'}`}>
                  <User className="w-5 h-5" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(u.id, u.email || '')} 
                  disabled={u.email === 'nahuelvalquinta2@gmail.com'}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
              <h3 className="font-serif text-lg text-water-900">{u.first_name} {u.last_name}</h3>
              <p className="text-stone-500 text-sm mb-4">{u.email}</p>
              <Badge className={u.email === 'nahuelvalquinta2@gmail.com' ? 'bg-water-900 text-white' : 'bg-water-100 text-water-700 border-none'}>
                {u.email === 'nahuelvalquinta2@gmail.com' ? 'Dueño' : 'Administrador'}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}