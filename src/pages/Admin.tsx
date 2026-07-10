import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  Tag,
  Gift,
  User,
  Users,
  Phone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, Service, Professional } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  cancelled: 'Cancelado'
};

export default function Admin() {
  const { isOwner, isEmployee } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData())
      .subscribe();

    // Auto-recuperación al volver a la pestaña, por si una carga quedó a medias.
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [apps, servs, profs] = await Promise.all([
        supabase.from('appointments').select('*, services(name), promotions(title)').order('time', { ascending: true }),
        supabase.from('services').select('*'),
        supabase.from('professionals').select('*')
      ]);

      if (apps.data) {
        setAppointments(apps.data.map(a => ({
          ...a,
          service_name: (a as any).services?.name,
          promotion_title: (a as any).promotions?.title
        })));
      }
      if (servs.data) setServices(servs.data);
      if (profs.data) setProfessionals(profs.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Error al cargar datos del panel');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'cancelled') => {
    try {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success(`Turno ${statusLabels[status]}`);
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const confirmedToday = appointments.filter(a => a.status === 'approved' && a.date === todayStr);
  const todayCount = appointments.filter(a => a.date === todayStr).length;

  const stats = [
    { name: 'Turnos Pendientes', value: pendingAppointments.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Turnos Hoy', value: todayCount, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    ...(isOwner ? [
      { name: 'Servicios Activos', value: services.length, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
      { name: 'Equipo', value: professionals.length, icon: User, color: 'text-green-600', bg: 'bg-green-50' },
    ] : []),
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-50 text-green-700 border-green-100">Aprobado</Badge>;
      case 'cancelled': return <Badge className="bg-red-50 text-red-700 border-red-100">Cancelado</Badge>;
      default: return <Badge className="bg-amber-50 text-amber-700 border-amber-100">Pendiente</Badge>;
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-water-50/30">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-water-200 mb-4 shadow-inner"></div>
        <div className="h-4 w-24 bg-water-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="pt-24 pb-12 bg-water-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-sm border border-water-100">
              <img src="/logo-luma.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-4xl font-serif text-water-900 mb-2">Panel de Administración</h1>
              <p className="text-stone-600">
                {isOwner ? 'Gestión total de Lumá.' : 'Gestión de turnos y agenda.'}
              </p>
            </div>
          </div>
          <Link to="/admin/appointments" className="btn-primary flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Ver Calendario
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 hover:shadow-md transition-all">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl w-fit mb-4`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-stone-500 text-sm font-medium">{stat.name}</p>
              <p className="text-3xl font-serif text-water-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-12">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif text-water-900">Turnos Pendientes</h2>
                <Link to="/admin/appointments" className="text-sm text-water-600 flex items-center gap-1 hover:underline">
                  Ver todos <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {pendingAppointments.length === 0 ? (
                <div className="bg-white/50 p-8 rounded-3xl text-center border border-dashed border-water-200">
                  <p className="text-stone-500 italic">No hay turnos pendientes.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingAppointments.map((app) => (
                    <div key={app.id} className="bg-white p-6 rounded-3xl shadow-sm border border-water-50 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-serif text-lg text-water-900">{app.client_name}</h3>
                          {getStatusBadge(app.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-stone-500">
                          <span className="flex items-center gap-1"><Sparkles className="w-4 h-4 text-water-400" /> {app.service_name}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-water-400" /> {format(new Date(app.date + 'T12:00:00'), "d 'de' MMMM", { locale: es })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-water-400" /> {app.time} hs</span>
                          {app.final_price != null && (
                            <span className="flex items-center gap-1 font-medium text-water-700">
                              ${app.final_price}
                              {app.discount_amount ? <span className="text-stone-400 line-through ml-1">${app.original_price}</span> : null}
                            </span>
                          )}
                          <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-water-400" /> {app.phone}</span>
                        </div>
                        {app.promotion_title && (
                          <div className="mt-2">
                            <Badge className="bg-water-50 text-water-700 border-water-100 gap-1">
                              <Gift className="w-3 h-3" /> {app.promotion_title}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-full text-red-600 border-red-100 hover:bg-red-50" onClick={() => handleStatusUpdate(app.id, 'cancelled')}>Rechazar</Button>
                        <Button size="sm" className="rounded-full bg-water-900 text-white hover:bg-water-700" onClick={() => handleStatusUpdate(app.id, 'approved')}>Aprobar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-serif text-water-900 mb-6">Turnos Confirmados para Hoy</h2>
              {confirmedToday.length === 0 ? (
                <div className="bg-white/50 p-8 rounded-3xl text-center border border-dashed border-water-200">
                  <p className="text-stone-500 italic">No hay turnos confirmados para hoy.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {confirmedToday.map((app) => (
                    <div key={app.id} className="bg-white p-6 rounded-3xl shadow-sm border border-green-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all">
                      <div className="flex items-center gap-6">
                        <div className="bg-green-50 text-green-700 p-3 rounded-2xl font-serif text-xl min-w-[80px] text-center">
                          {app.time}
                        </div>
                        <div>
                          <h3 className="font-serif text-lg text-water-900">{app.client_name}</h3>
                          <p className="text-sm text-stone-500">{app.service_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <CheckCircle className="w-5 h-5" /> Confirmado
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-water-900">Accesos Rápidos</h2>
            <div className="grid grid-cols-1 gap-4">
              {isOwner && (
                <>
                  <Link to="/admin/users" className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 hover:border-water-300 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-water-50 p-3 rounded-2xl group-hover:bg-water-900 group-hover:text-white transition-colors"><Users className="w-5 h-5" /></div>
                      <span className="font-medium text-water-900">Usuarios / Equipo</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-water-200" />
                  </Link>
                  <Link to="/admin/services" className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 hover:border-water-300 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-water-50 p-3 rounded-2xl group-hover:bg-water-900 group-hover:text-white transition-colors"><Sparkles className="w-5 h-5" /></div>
                      <span className="font-medium text-water-900">Servicios</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-water-200" />
                  </Link>
                  <Link to="/admin/professionals" className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 hover:border-water-300 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-water-50 p-3 rounded-2xl group-hover:bg-water-900 group-hover:text-white transition-colors"><User className="w-5 h-5" /></div>
                      <span className="font-medium text-water-900">Profesionales</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-water-200" />
                  </Link>
                  <Link to="/admin/categories" className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 hover:border-water-300 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-water-50 p-3 rounded-2xl group-hover:bg-water-900 group-hover:text-white transition-colors"><Tag className="w-5 h-5" /></div>
                      <span className="font-medium text-water-900">Categorías</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-water-200" />
                  </Link>
                  <Link to="/admin/promotions" className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 hover:border-water-300 transition-all group flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-water-50 p-3 rounded-2xl group-hover:bg-water-900 group-hover:text-white transition-colors"><Gift className="w-5 h-5" /></div>
                      <span className="font-medium text-water-900">Promociones</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-water-200" />
                  </Link>
                </>
              )}
              <Link to="/admin/schedule" className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 hover:border-water-300 transition-all group flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-water-50 p-3 rounded-2xl group-hover:bg-water-900 group-hover:text-white transition-colors"><Clock className="w-5 h-5" /></div>
                  <span className="font-medium text-water-900">Horarios de Atención</span>
                </div>
                <ChevronRight className="w-5 h-5 text-water-200" />
              </Link>
              <Link to="/admin/appointments" className="bg-white p-6 rounded-3xl shadow-sm border border-water-100 hover:border-water-300 transition-all group flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-water-50 p-3 rounded-2xl group-hover:bg-water-900 group-hover:text-white transition-colors"><Calendar className="w-5 h-5" /></div>
                  <span className="font-medium text-water-900">Agenda Completa</span>
                </div>
                <ChevronRight className="w-5 h-5 text-water-200" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}