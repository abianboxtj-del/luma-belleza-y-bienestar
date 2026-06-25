import React, { useState, useEffect } from 'react';
import { Clock, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessHour } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { WEEKDAY_NAMES, WEEKDAY_DISPLAY_ORDER, generateHourlySlots } from '@/lib/schedule';
import toast from 'react-hot-toast';

// Config por defecto si la fila de un día no existe todavía en la BD.
function defaultHour(weekday: number): BusinessHour {
  return { weekday, is_open: weekday !== 0, open_time: '09:00', close_time: '19:00' };
}

export default function AdminSchedule() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('business_hours').select('*');
      if (error) throw error;
      // Garantizamos una entrada por cada día (0..6), aunque la BD no la tenga.
      const byWeekday = new Map<number, BusinessHour>();
      (data ?? []).forEach((h) => byWeekday.set(h.weekday, h as BusinessHour));
      const full = WEEKDAY_DISPLAY_ORDER.map((wd) => byWeekday.get(wd) ?? defaultHour(wd));
      setHours(full);
    } catch (error: any) {
      toast.error(`Error al cargar horarios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (weekday: number, patch: Partial<BusinessHour>) => {
    setHours((prev) => prev.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)));
  };

  const handleSave = async () => {
    // Validación: en los días abiertos, el cierre debe ser posterior a la apertura.
    const invalid = hours.find((h) => h.is_open && generateHourlySlots(h.open_time, h.close_time).length === 0);
    if (invalid) {
      toast.error(`Revisá el horario del ${WEEKDAY_NAMES[invalid.weekday]}: la hora de cierre debe ser posterior a la de apertura.`);
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading('Guardando horarios...');
    try {
      const payload = hours.map((h) => ({
        weekday: h.weekday,
        is_open: h.is_open,
        open_time: h.open_time,
        close_time: h.close_time,
      }));
      const { error } = await supabase.from('business_hours').upsert(payload, { onConflict: 'weekday' });
      if (error) throw error;
      toast.success('Horarios actualizados', { id: loadingToast });
    } catch (error: any) {
      toast.error(`Error al guardar: ${error.message}`, { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  // Mostramos los días ya ordenados (lunes -> domingo).
  const ordered = WEEKDAY_DISPLAY_ORDER.map((wd) => hours.find((h) => h.weekday === wd)).filter(
    (h): h is BusinessHour => Boolean(h),
  );

  return (
    <div className="pt-24 pb-12 bg-water-50/30 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-water-600 hover:underline mb-6">
          <ChevronLeft className="w-4 h-4" /> Volver al panel
        </Link>

        <div className="flex items-start gap-4 mb-10">
          <div className="bg-water-100 text-water-700 p-3 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-4xl font-serif text-water-900 mb-2">Horarios de Atención</h1>
            <p className="text-stone-600">
              Definí qué días se trabaja y el rango de horario. Los turnos reservables se generan por hora dentro de cada
              rango. Los días desactivados no se pueden reservar.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white/50 p-12 rounded-3xl text-center border border-dashed border-water-200">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-water-400" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {ordered.map((day) => {
                const slots = day.is_open ? generateHourlySlots(day.open_time, day.close_time) : [];
                return (
                  <div
                    key={day.weekday}
                    className={`bg-white p-6 rounded-3xl shadow-sm border transition-all ${
                      day.is_open ? 'border-water-100' : 'border-water-50 opacity-70'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex items-center gap-3 md:w-48">
                        <Switch
                          checked={day.is_open}
                          onCheckedChange={(checked: boolean) => updateDay(day.weekday, { is_open: checked })}
                        />
                        <span className="font-serif text-xl text-water-900">{WEEKDAY_NAMES[day.weekday]}</span>
                      </div>

                      {day.is_open ? (
                        <div className="flex flex-wrap items-end gap-4 flex-grow">
                          <div className="space-y-1">
                            <label className="text-xs text-stone-500 font-medium ml-1">Apertura</label>
                            <Input
                              type="time"
                              value={day.open_time}
                              onChange={(e) => updateDay(day.weekday, { open_time: e.target.value })}
                              className="rounded-2xl border-water-100 h-12 w-36"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-stone-500 font-medium ml-1">Cierre</label>
                            <Input
                              type="time"
                              value={day.close_time}
                              onChange={(e) => updateDay(day.weekday, { close_time: e.target.value })}
                              className="rounded-2xl border-water-100 h-12 w-36"
                            />
                          </div>
                          <div className="text-xs text-stone-400 pb-3">
                            {slots.length > 0
                              ? `${slots.length} turno${slots.length === 1 ? '' : 's'} · ${slots[0]} a ${slots[slots.length - 1]} hs`
                              : 'Rango inválido'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">Cerrado</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="btn-primary h-14 px-10 text-lg shadow-xl">
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Guardar cambios
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
