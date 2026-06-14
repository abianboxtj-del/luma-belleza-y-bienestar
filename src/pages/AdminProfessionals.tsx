import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, User, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Professional, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import toast from 'react-hot-toast';

export default function AdminProfessionals() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [formData, setFormData] = useState<Partial<Professional>>({
    name: '',
    specialties: [],
    avatar_url: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profs, cats] = await Promise.all([
        supabase.from('professionals').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('order')
      ]);
      if (profs.data) setProfessionals(profs.data);
      if (cats.data) setCategories(cats.data);
    } catch (error) {
      console.error("Error fetching professionals:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, sube una imagen válida');
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Imagen subida correctamente');
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Error al subir: ${error.message || 'Verifica las políticas de storage'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Guardando profesional...');
    try {
      if (editingProfessional) {
        const { error } = await supabase.from('professionals').update(formData).eq('id', editingProfessional.id);
        if (error) throw error;
        toast.success('Profesional actualizado', { id: loadingToast });
      } else {
        const { error } = await supabase.from('professionals').insert(formData);
        if (error) throw error;
        toast.success('Profesional creado', { id: loadingToast });
      }
      setIsDialogOpen(false);
      await fetchData(); // Forzar recarga de datos
    } catch (error: any) {
      toast.error(`Error al guardar: ${error.message}`, { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar a este profesional?')) {
      try {
        const { error } = await supabase.from('professionals').delete().eq('id', id);
        if (error) throw error;
        toast.success('Profesional eliminado');
        await fetchData();
      } catch (error: any) {
        toast.error(`Error al eliminar: ${error.message}`);
      }
    }
  };

  const toggleSpecialty = (categoryName: string) => {
    const current = formData.specialties || [];
    if (current.includes(categoryName)) {
      setFormData({ ...formData, specialties: current.filter(s => s !== categoryName) });
    } else {
      setFormData({ ...formData, specialties: [...current, categoryName] });
    }
  };

  return (
    <div className="pt-24 pb-12 bg-water-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-serif text-water-900 mb-2">Profesionales</h1>
            <p className="text-stone-600">Gestiona el equipo de trabajo de Lumá.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { 
                setEditingProfessional(null); 
                setFormData({ name: '', specialties: [], avatar_url: '' }); 
              }} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Profesional
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
              <DialogHeader><DialogTitle className="text-2xl font-serif">Profesional</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label>Nombre completo</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    required 
                    placeholder="Ej: Ana García"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Foto de perfil</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-water-50 border-2 border-dashed border-water-200 flex items-center justify-center overflow-hidden">
                      {formData.avatar_url ? (
                        <img src={formData.avatar_url} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <User className="w-8 h-8 text-water-200" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        id="avatar-upload"
                        disabled={isUploading}
                      />
                      <Label 
                        htmlFor="avatar-upload" 
                        className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-water-200 rounded-xl cursor-pointer hover:bg-water-50 transition-colors"
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploading ? 'Subiendo...' : 'Subir foto'}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Especialidades</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleSpecialty(cat.name)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          formData.specialties?.includes(cat.name) 
                            ? 'bg-water-900 text-white border-water-900' 
                            : 'bg-white text-water-600 border-water-100 hover:border-water-300'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full btn-primary" disabled={isUploading}>
                  {editingProfessional ? 'Actualizar' : 'Crear'} Profesional
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map((prof) => (
            <div key={prof.id} className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-water-50 flex items-center justify-center border border-water-50">
                  {prof.avatar_url ? (
                    <img src={prof.avatar_url} alt={prof.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-water-200" />
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-water-50"
                    onClick={() => { 
                      setEditingProfessional(prof); 
                      setFormData(prof); 
                      setIsDialogOpen(true); 
                    }}
                  >
                    <Pencil className="w-4 h-4 text-water-400" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-red-50"
                    onClick={() => handleDelete(prof.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
              <h3 className="text-xl font-serif text-water-900 mb-3">{prof.name}</h3>
              <div className="flex flex-wrap gap-2">
                {prof.specialties?.map(s => (
                  <Badge key={s} variant="secondary" className="bg-water-50 text-water-700 border-none">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}