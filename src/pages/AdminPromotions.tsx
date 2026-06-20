import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Promotion, Service, DiscountType } from '@/types';
import { formatPromoLabel } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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

interface PromoForm {
  title: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  active: boolean;
  service_ids: string[];
}

const EMPTY_FORM: PromoForm = {
  title: '',
  description: '',
  discount_type: 'percent',
  discount_value: 0,
  active: true,
  service_ids: []
};

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<PromoForm>(EMPTY_FORM);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [promos, servs] = await Promise.all([
      supabase
        .from('promotions')
        .select('*, promotion_services(service_id)')
        .order('created_at', { ascending: false }),
      supabase.from('services').select('*')
    ]);

    if (promos.data) {
      setPromotions(promos.data.map(p => ({
        ...p,
        service_ids: ((p as any).promotion_services ?? []).map((r: any) => r.service_id)
      })));
    }
    if (servs.data) setServices(servs.data);
  };

  // Sincroniza la relación promo↔servicios: borra las viejas e inserta las
  // elegidas. Sencillo y suficiente para el volumen de este panel.
  const syncServices = async (promotionId: string, serviceIds: string[]) => {
    await supabase.from('promotion_services').delete().eq('promotion_id', promotionId);
    if (serviceIds.length > 0) {
      await supabase.from('promotion_services').insert(
        serviceIds.map(service_id => ({ promotion_id: promotionId, service_id }))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.discount_value <= 0) {
      toast.error('El descuento debe ser mayor a 0');
      return;
    }
    if (formData.service_ids.length === 0) {
      toast.error('Elegí al menos un servicio para la promo');
      return;
    }

    const row = {
      title: formData.title,
      description: formData.description,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      discount: formatPromoLabel(formData.discount_type, formData.discount_value),
      active: formData.active
    };

    try {
      if (editingPromotion) {
        const { error } = await supabase.from('promotions').update(row).eq('id', editingPromotion.id);
        if (error) throw error;
        await syncServices(editingPromotion.id, formData.service_ids);
        toast.success('Promoción actualizada');
      } else {
        const { data, error } = await supabase.from('promotions').insert(row).select('id').single();
        if (error) throw error;
        await syncServices(data.id, formData.service_ids);
        toast.success('Promoción creada');
      }
      setIsDialogOpen(false);
      fetchData();
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
        fetchData();
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
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const openNew = () => {
    setEditingPromotion(null);
    setFormData(EMPTY_FORM);
  };

  const openEdit = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormData({
      title: promo.title,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      active: promo.active,
      service_ids: promo.service_ids ?? []
    });
    setIsDialogOpen(true);
  };

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
  };

  const serviceName = (id: string) => services.find(s => s.id === id)?.name ?? '—';

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
              <Button onClick={openNew} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" /> Nueva Promo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] rounded-3xl max-h-[90vh] overflow-y-auto">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-water-700">Tipo de descuento</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(v) => setFormData({ ...formData, discount_type: v as DiscountType })}
                    >
                      <SelectTrigger className="rounded-xl border-water-100 h-11">
                        <SelectValue>
                          {formData.discount_type === 'percent' ? 'Porcentaje (%)' : 'Monto fijo ($)'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="percent">Porcentaje (%)</SelectItem>
                        <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_value" className="text-water-700">
                      {formData.discount_type === 'percent' ? '% de descuento' : '$ a descontar'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      min={0}
                      step={formData.discount_type === 'percent' ? 1 : 100}
                      value={formData.discount_value || ''}
                      onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                      required
                      className="rounded-xl border-water-100"
                    />
                  </div>
                </div>

                {formData.discount_value > 0 && (
                  <p className="text-sm text-water-600 -mt-2">
                    Se mostrará como <span className="font-bold">{formatPromoLabel(formData.discount_type, formData.discount_value)}</span>
                  </p>
                )}

                <div className="space-y-2">
                  <Label className="text-water-700">Servicios incluidos</Label>
                  <p className="text-xs text-stone-400">El descuento se aplica solo a los servicios marcados.</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {services.length === 0 && (
                      <span className="text-sm text-stone-400 italic">No hay servicios cargados.</span>
                    )}
                    {services.map(s => {
                      const selected = formData.service_ids.includes(s.id);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleService(s.id)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                            selected
                              ? 'bg-water-900 text-white border-water-900 shadow-sm'
                              : 'bg-white text-water-700 border-water-100 hover:bg-water-50'
                          }`}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
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
                    onClick={() => openEdit(promo)}
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
                <p className="text-stone-500 text-sm mb-4">
                  {promo.description || 'Aprovecha esta oportunidad especial en Lumá.'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(promo.service_ids ?? []).length === 0 ? (
                    <span className="text-xs text-amber-600 italic">Sin servicios asignados — no aplica al reservar.</span>
                  ) : (
                    (promo.service_ids ?? []).map(id => (
                      <span key={id} className="text-xs bg-water-50 text-water-700 px-2.5 py-1 rounded-full">
                        {serviceName(id)}
                      </span>
                    ))
                  )}
                </div>
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
