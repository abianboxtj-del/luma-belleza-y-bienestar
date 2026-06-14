import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ListOrdered, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import toast from 'react-hot-toast';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    order: 0
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('order');
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        const { error } = await supabase.from('categories').update(formData).eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Categoría actualizada');
      } else {
        const { error } = await supabase.from('categories').insert(formData);
        if (error) throw error;
        toast.success('Categoría creada');
      }
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error) {
      toast.error('Error al guardar la categoría');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        toast.success('Categoría eliminada');
        fetchCategories();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  return (
    <div className="pt-24 pb-12 bg-water-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-serif text-water-900 mb-2">Categorías</h1>
            <p className="text-stone-600">Gestiona las categorías de servicios de Lumá.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingCategory(null); setFormData({ name: '', order: categories.length }); }} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif text-water-900">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-water-700">Nombre de la categoría</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required 
                    className="rounded-xl border-water-100"
                    placeholder="Ej: Masajes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order" className="text-water-700">Orden de visualización</Label>
                  <Input 
                    id="order" 
                    type="number"
                    value={formData.order} 
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    required 
                    className="rounded-xl border-water-100"
                  />
                </div>
                <Button type="submit" className="w-full btn-primary">
                  {editingCategory ? 'Actualizar' : 'Crear'} Categoría
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-water-50 rounded-xl flex items-center justify-center text-water-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-water-900">{cat.name}</h3>
                  <div className="flex items-center text-xs text-stone-400">
                    <ListOrdered className="w-3 h-3 mr-1" /> Orden: {cat.order}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-water-50"
                  onClick={() => {
                    setEditingCategory(cat);
                    setFormData(cat);
                    setIsDialogOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 text-water-400" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-red-50"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}