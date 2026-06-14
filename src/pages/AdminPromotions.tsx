import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Promotion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import toast from 'react-hot-toast';

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<Partial<Promotion>>({
    title: '',
    description: '',
    discount: '',
    active: true
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    if (data) setPromotions(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromotion) {
        const { error } = await supabase.from('promotions').update(formData).eq('id', editingPromotion.id);
        if (error) throw error;
        toast.success('Promoción actualizada');
      } else {
        const { error } = await supabase.from('promotions').insert(formData);
        if (error) throw error;
        toast.success('Promoción creada');
      }
      setIsDialogOpen(false);
      fetchPromotions();
    } catch (error) {
      toast.error('Error al guardar la promoción');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta promoción?')) {
      try {
        const { error } = await supabase.from('promotions').delete().eq('id', id);
        if (error) throw error;
        toast.success('Promoción eliminada');
        fetchPromotions();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('promotions').update({ active: !currentStatus }).eq('id', id);
      if (error) throw error;
      toast.success(`Promoción ${!currentStatus ? 'activada' : 'desactivada'}`);
      fetchPromotions();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  return (
    <div className="pt-24 pb-12 bg-water-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-serif text-water-900 mb-2">Promociones</h1>
            <p className="text-stone-600">Gestiona las ofertas especiales y descuentos.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingPromotion(null); setFormData({ title: '', description: '', discount: '', active: true }); }} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Nueva Promo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif text-water-900">
                  {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-water-700">Título de la promo</Label>
                  <Input 
                    id="title" 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required 
                    className="rounded-xl border-water-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount" className="text-water-700">Descuento / Beneficio (ej: 20% OFF)</Label>
                  <Input 
                    id="discount" 
                    value={formData.discount} 
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    placeholder="2x1, 15% OFF, etc."
                    required 
                    className="rounded-xl border-water-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-water-700">Descripción</Label>
                  <Textarea 
                    id="description" 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="rounded-xl min-h-[100px] border-water-100"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-water-50 rounded-2xl border border-water-100">
                  <Label htmlFor="active" className="cursor-pointer text-water-800">Promoción activa</Label>
                  <Switch 
                    id="active" 
                    checked={formData.active} 
                    onCheckedChange={(v) => setFormData({ ...formData, active: v })}
                  />
                </div>
                <Button type="submit" className="w-full btn-primary">
                  {editingPromotion ? 'Actualizar' : 'Crear'} Promoción
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promo) => (
            <div key={promo.id} className={`bg-white p-8 rounded-4xl shadow-sm border transition-all ${promo.active ? 'border-water-100' : 'border-stone-100 opacity-60 grayscale'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${promo.active ? 'bg-water-900 text-white shadow-lg' : 'bg-stone-100 text-stone-400'}`}>
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-water-50"
                    onClick={() => {
                      setEditingPromotion(promo);
                      setFormData(promo);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 text-water-400" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-red-50"
                    onClick={() => handleDelete(promo.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
              
              <div className="mb-6">
                <span className="text-3xl font-serif text-water-900 block mb-2">{promo.discount}</span>
                <h3 className="text-xl font-serif text-water-900 mb-2">{promo.title}</h3>
                <p className="text-stone-500 text-sm">
                  {promo.description || 'Aprovecha esta oportunidad especial en Lumá.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-water-50">
                <span className={`text-xs font-medium uppercase tracking-widest ${promo.active ? 'text-water-600' : 'text-stone-400'}`}>
                  {promo.active ? 'Activa' : 'Inactiva'}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-full text-xs hover:bg-water-50 text-water-700"
                  onClick={() => toggleActive(promo.id, promo.active)}
                >
                  {promo.active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}