import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Phone, 
  CheckCircle, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/types';
import { format, isSameDay, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import toast from 'react-hot-toast';

const statusLabels: Record<string, string> = {
  todos: 'Todos los estados',
  pending: 'Pendientes',
  approved: 'Aprobados',
  cancelled: 'Cancelados'
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfToday());
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, services(name), professionals(name)');
    
    if (error) {
      toast.error('Error al cargar turnos');
      return;
    }

    setAppointments(data.map(a => ({
      ...a,
      service_name: (a as any).services?.name,
      professional_name: (a as any).professionals?.name
    })));
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Turno ${status === 'approved' ? 'aprobado' : 'cancelado'}`);
      fetchAppointments();
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  const filteredAppointments = appointments
    .filter(a => {
      const matchesDate = selectedDate ? isSameDay(new Date(a.date + 'T12:00:00'), selectedDate) : true;
      const matchesStatus = statusFilter === 'todos' ? true : a.status === statusFilter;
      return matchesDate && matchesStatus;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="pt-24 pb-12 bg-water-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-serif text-water-900 mb-2">Agenda de Turnos</h1>
            <p className="text-stone-600">Gestiona las reservas diarias de Lumá.</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[220px] bg-white rounded-xl border-water-100 h-12 px-4">
                <SelectValue>{statusLabels[statusFilter]}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" className="rounded-xl shadow-2xl border-water-50">
                <SelectItem value="todos" className="py-2.5">Todos los estados</SelectItem>
                <SelectItem value="pending" className="py-2.5">Pendientes</SelectItem>
                <SelectItem value="approved" className="py-2.5">Aprobados</SelectItem>
                <SelectItem value="cancelled" className="py-2.5">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 sticky top-24">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={es}
                className="rounded-2xl"
              />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {filteredAppointments.length === 0 ? (
              <div className="bg-white/50 p-16 rounded-[2.5rem] text-center border border-dashed border-water-200">
                <p className="text-stone-500 italic text-lg">No hay turnos para este día o filtro.</p>
              </div>
            ) : (
              filteredAppointments.map((app) => (
                <div key={app.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-water-50 flex flex-col md:flex-row md:items-center gap-8 hover:shadow-md transition-all group">
                  <div className="flex flex-col items-center justify-center bg-water-50 p-5 rounded-2xl min-w-[110px] group-hover:bg-water-900 group-hover:text-white transition-colors">
                    <span className="text-2xl font-serif">{app.time}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">Horario</span>
                  </div>

                  <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-2xl font-serif text-water-900">{app.client_name}</h3>
                      <Badge className={
                        app.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                        app.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }>
                        {statusLabels[app.status] || app.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-8 text-sm text-stone-500">
                      <span className="flex items-center gap-2.5"><Sparkles className="w-4 h-4 text-water-400" /> {app.service_name}</span>
                      <span className="flex items-center gap-2.5"><Phone className="w-4 h-4 text-water-400" /> {app.client_phone}</span>
                      {app.professional_name && (
                        <span className="flex items-center gap-2.5"><User className="w-4 h-4 text-water-400" /> {app.professional_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {app.status === 'pending' && (
                      <>
                        <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-red-100 hover:bg-red-50" onClick={() => handleStatusUpdate(app.id, 'cancelled')}>
                          <XCircle className="w-6 h-6 text-red-500" />
                        </Button>
                        <Button size="icon" className="rounded-full w-12 h-12 bg-water-900 hover:bg-water-700 shadow-lg" onClick={() => handleStatusUpdate(app.id, 'approved')}>
                          <CheckCircle className="w-6 h-6 text-white" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}