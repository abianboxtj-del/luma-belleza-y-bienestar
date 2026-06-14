import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Service, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    category_id: '',
    duration: 60,
    price: 0,
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servs, cats] = await Promise.all([
        supabase.from('services').select('*, categories(name)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('order')
      ]);

      if (servs.data) {
        setServices(servs.data.map(s => ({
          ...s,
          category_name: (s as any).categories?.name
        })));
      }
      if (cats.data) setCategories(cats.data);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Guardando servicio...');
    try {
      if (editingService) {
        const { error } = await supabase.from('services').update(formData).eq('id', editingService.id);
        if (error) throw error;
        toast.success('Servicio actualizado', { id: loadingToast });
      } else {
        const { error } = await supabase.from('services').insert(formData);
        if (error) throw error;
        toast.success('Servicio creado', { id: loadingToast });
      }
      setIsDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(`Error al guardar: ${error.message}`, { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar servicio?')) {
      try {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        toast.success('Eliminado');
        await fetchData();
      } catch (error: any) {
        toast.error(`Error al eliminar: ${error.message}`);
      }
    }
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || "Selecciona categoría";

  return (
    <div className="pt-24 pb-12 bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-serif text-stone-900 mb-2">Servicios</h1>
            <p className="text-stone-600">Administra el catálogo de tratamientos.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { 
                setEditingService(null); 
                setFormData({ name: '', category_id: categories[0]?.id || '', duration: 60, price: 0, description: '' }); 
              }} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
              <DialogHeader><DialogTitle className="text-2xl font-serif">Servicio</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                      <SelectTrigger>
                        <SelectValue>{getCategoryName(formData.category_id || '')}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duración (min)</Label>
                    <Input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Precio</Label>
                  <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <Button type="submit" className="w-full btn-primary">Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <Sparkles className="w-5 h-5 text-water-600" />
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingService(service); setFormData(service); setIsDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
              <h3 className="text-xl font-serif text-stone-900 mb-2">{service.name}</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                <Badge variant="secondary" className="bg-water-50 text-water-700 border-none">{service.category_name}</Badge>
                <Badge variant="secondary" className="bg-stone-50 text-stone-600 border-none">{service.duration} min</Badge>
              </div>
              <p className="text-stone-500 text-sm line-clamp-3">{service.description || 'Sin descripción.'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}