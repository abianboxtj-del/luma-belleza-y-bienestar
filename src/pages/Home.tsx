import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2,
  ChevronRight,
  User,
  DollarSign
} from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Service, Appointment, Promotion, Category, Professional, BusinessHour } from '@/types';
import { bestPromoForService, formatPromoLabel } from '@/lib/pricing';
import { isDayOpen, slotsForDate, WEEKDAY_SHORT, WEEKDAY_DISPLAY_ORDER } from '@/lib/schedule';
import toast from 'react-hot-toast';

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(startOfToday());
  const [bookingStep, setBookingStep] = useState(1);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [descriptionOverflow, setDescriptionOverflow] = useState<Record<string, boolean>>({});
  const descriptionRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const [bookingData, setBookingData] = useState({
    category_id: '',
    service_id: '',
    professional_id: 'any',
    time: '',
    client_name: '',
    client_phone: '',
    notes: ''
  });

  const LOGO_URL = "/logo-luma.png";
  const HERO_IMAGE = "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=2000";

  const heroBubbles = useMemo(
    () => Array.from({ length: 20 }, () => ({
      size: Math.random() * 40 + 10,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 12 + 8}s`,
      animationDelay: `${Math.random() * 5}s`
    })),
    []
  );

  const serviceBubbles = useMemo(
    () => Array.from({ length: 15 }, () => ({
      size: Math.random() * 40 + 20,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 8 + 6}s`,
      animationDelay: `${Math.random() * 4}s`
    })),
    []
  );

  const fetchData = useCallback(async () => {
    try {
      const [cats, servs, promos, profs, apps, hours] = await Promise.all([
        supabase.from('categories').select('*').order('order'),
        supabase.from('services').select('*'),
        supabase.from('promotions').select('*, promotion_services(service_id)').eq('active', true),
        supabase.from('professionals').select('*'),
        supabase.from('appointments').select('*').eq('status', 'approved'),
        supabase.from('business_hours').select('*')
      ]);

      if (cats.data) {
        setCategories((current) => {
          if (current.length === cats.data!.length && current.every((item, index) => item.id === cats.data![index].id)) {
            return current;
          }
          return cats.data!;
        });
        setSelectedCategory((current) => current || cats.data![0]?.id || '');
      }
      if (servs.data) setServices(servs.data);
      if (promos.data) setPromotions(promos.data.map(p => ({
        ...p,
        service_ids: ((p as any).promotion_services ?? []).map((r: any) => r.service_id)
      })));
      if (profs.data) setProfessionals(profs.data);
      if (apps.data) setAppointments(apps.data);
      if (hours.data) setBusinessHours(hours.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-recuperación: al volver a la pestaña, recargamos los datos por si
    // una consulta anterior falló o quedó vacía (en vez de tener que recargar
    // la página a mano).
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [fetchData]);

  // Si cambia el día (o su configuración) y el horario elegido ya no está
  // disponible en ese día, lo limpiamos para no enviar un turno fuera de rango.
  useEffect(() => {
    if (!bookingData.time) return;
    const available = date ? slotsForDate(businessHours, date) : [];
    if (!available.includes(bookingData.time)) {
      setBookingData(prev => ({ ...prev, time: '' }));
    }
  }, [date, businessHours]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !bookingData.service_id || !bookingData.time || !bookingData.client_name || !bookingData.client_phone) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    const loadingToast = toast.loading('Procesando reserva...');

    // Congelamos el precio aplicado al momento de reservar. Si hay promo, se
    // guardan los tres montos; si no, original = final = precio del servicio.
    const service = services.find(s => s.id === bookingData.service_id);
    const promo = bestPromoForService(promotions, service, date.getDay());
    const basePrice = service?.price ?? null;

    try {
      const { error } = await supabase.from('appointments').insert({
        service_id: bookingData.service_id,
        professional_id: bookingData.professional_id === 'any' ? null : bookingData.professional_id,
        date: format(date, 'yyyy-MM-dd'),
        time: bookingData.time,
        client_name: bookingData.client_name,
        client_phone: bookingData.client_phone,
        notes: bookingData.notes,
        status: 'pending',
        promotion_id: promo?.promotion.id ?? null,
        original_price: promo?.originalPrice ?? basePrice,
        discount_amount: promo?.discountAmount ?? null,
        final_price: promo?.finalPrice ?? basePrice
      });

      if (error) throw error;
      toast.dismiss(loadingToast);
      toast.success('¡Turno solicitado con éxito!');
      setBookingStep(3);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Error al solicitar el turno. Intenta de nuevo.');
    }
  };

  const filteredServices = services.filter(s => s.category_id === selectedCategory);
  const bookingServices = services.filter(s => s.category_id === bookingData.category_id);
  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name;

  const updateDescriptionOverflow = () => {
    const overflowMap: Record<string, boolean> = {};
    Object.entries(descriptionRefs.current).forEach(([id, element]) => {
      if (!element) return;
      const computed = window.getComputedStyle(element);
      const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.5;
      overflowMap[id] = element.scrollHeight > lineHeight * 3 + 1;
    });
    setDescriptionOverflow(overflowMap);
  };

  useEffect(() => {
    updateDescriptionOverflow();
    window.addEventListener('resize', updateDescriptionOverflow);
    return () => window.removeEventListener('resize', updateDescriptionOverflow);
  }, [filteredServices.length, services.length, selectedCategory]);

  const toggleServiceDescription = (serviceId: string) => {
    setExpandedServiceId((current) => (current === serviceId ? null : serviceId));
  };
  
  const professionalsOfCategory = professionals.filter(p =>
    p.specialties.includes(selectedCategoryName || '')
  );

  // Promo que se aplica al servicio elegido en la reserva (la de mayor descuento).
  const selectedBookingService = services.find(s => s.id === bookingData.service_id);
  // El día elegido importa: una promo limitada a ciertos días solo se aplica si la
  // fecha cae en uno de ellos.
  const appliedPromo = bestPromoForService(promotions, selectedBookingService, date ? date.getDay() : undefined);

  // "Quiero esta promo": baja al formulario y precarga el servicio. Si la promo
  // cubre uno solo, lo deja elegido; si cubre varios, deja la categoría lista.
  const applyPromo = (promo: Promotion) => {
    const ids = promo.service_ids ?? [];
    const firstService = ids.length > 0 ? services.find(s => s.id === ids[0]) : undefined;
    if (firstService) {
      setBookingData(prev => ({
        ...prev,
        category_id: firstService.category_id,
        service_id: ids.length === 1 ? firstService.id : ''
      }));
    }
    setBookingStep(1);
    document.getElementById('turnos')?.scrollIntoView({ behavior: 'smooth' });
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || "Selecciona categoría";
  const getServiceName = (id: string) => services.find(s => s.id === id)?.name || "Selecciona servicio";
  const getProfessionalName = (id: string) => {
    if (id === 'any') return "Cualquier profesional";
    return professionals.find(p => p.id === id)?.name || "Cualquier profesional";
  };

  const isTimeOccupied = (time: string) => {
    if (!date) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.some(app => app.date === dateStr && app.time === time);
  };

  // Horarios reservables según la configuración del día elegido (business_hours).
  const timeSlots = date ? slotsForDate(businessHours, date) : [];

  return (
    <div className="overflow-x-hidden relative">
      {/* Decoración de burbujas flotantes (Global) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {heroBubbles.map((bubble, i) => (
          <div
            key={i}
            className="bubble bg-water-200/40"
            style={{
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              left: bubble.left,
              top: bubble.top,
              animationDuration: bubble.animationDuration,
              animationDelay: bubble.animationDelay
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section id="inicio" className="relative h-screen flex items-center justify-center bg-water-50 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={HERO_IMAGE} 
            alt="Water wellness" 
            className="w-full h-full object-cover opacity-20 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-water-100/40 via-transparent to-water-50"></div>
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-water-200/30 rounded-full blur-3xl animate-pulse"></div>
              <div className="w-64 h-64 relative rounded-full overflow-hidden shadow-2xl border-8 border-white/80 bg-white">
                <img 
                  src={LOGO_URL} 
                  alt="Lumá Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <h1 className="text-7xl md:text-9xl font-serif mb-6 tracking-tighter text-water-900 drop-shadow-sm">Lumá</h1>
            <p className="text-xl md:text-3xl font-serif italic text-water-700 mb-12 max-w-2xl">
              “Un espacio pensado para que te regales un momento para vos”
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/#turnos" className="btn-primary w-full sm:w-auto text-lg px-10 py-4">Reservar Turno</Link>
              <Link to="/#servicios" className="btn-secondary w-full sm:w-auto text-lg px-10 py-4">Ver Servicios</Link>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-[120px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C58.47,105.1,123.61,105.54,182.21,95.83,240.81,86.12,287.09,71.05,321.39,56.44Z" fill="#f0f9fa"></path>
          </svg>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-32 bg-water-50/50 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {serviceBubbles.map((bubble, i) => (
            <div
              key={`service-bubble-${i}`}
              className="bubble bg-water-500/40"
              style={{
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
                left: bubble.left,
                top: bubble.top,
                animationDuration: bubble.animationDuration,
                animationDelay: bubble.animationDelay
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <motion.span 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-water-600 uppercase tracking-[0.4em] text-xs font-bold mb-4 block"
            >
              Experiencia Lumá
            </motion.span>
            <h2 className="text-5xl md:text-6xl font-serif mb-6 text-water-900">Nuestros Servicios</h2>
            <div className="w-32 h-1.5 bg-water-200 mx-auto rounded-full"></div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-8 py-3 rounded-full text-sm font-semibold transition-all duration-500 ${
                  selectedCategory === cat.id 
                    ? 'bg-water-900 text-white shadow-xl scale-110' 
                    : 'bg-white/80 backdrop-blur-sm text-water-700 hover:bg-water-100 border border-water-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-24">
            {filteredServices.map((service, idx) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full border-none shadow-lg hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden group glass-card">
                  <CardContent className="p-10">
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-14 h-14 bg-water-100 rounded-2xl flex items-center justify-center group-hover:bg-water-900 group-hover:text-white transition-all duration-500 transform group-hover:rotate-12">
                        <Sparkles className="w-7 h-7" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center text-water-500 bg-water-50 px-3 py-1 rounded-full text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          <span>{service.duration} min</span>
                        </div>
                        {service.price && (
                          <div className="flex items-center text-water-900 bg-water-100 px-3 py-1 rounded-full text-sm font-bold">
                            <DollarSign className="w-3.5 h-3.5 mr-0.5" />
                            <span>{service.price}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="text-2xl font-serif text-water-900 mb-4 group-hover:text-water-600 transition-colors">{service.name}</h3>
                    <div
                      className={`text-stone-500 text-sm leading-relaxed overflow-hidden transition-[max-height,opacity] duration-300 ${
                        expandedServiceId === service.id ? 'max-h-48 opacity-100' : 'max-h-16 opacity-90'
                      }`}
                    >
                      <p
                        ref={(node) => {
                          if (node) descriptionRefs.current[service.id] = node;
                        }}
                        className={expandedServiceId === service.id ? '' : 'line-clamp-3'}
                      >
                        {service.description || 'Un tratamiento diseñado exclusivamente para tu bienestar y relajación total.'}
                      </p>
                    </div>
                    {service.description && descriptionOverflow[service.id] && (
                      <button
                        type="button"
                        onClick={() => toggleServiceDescription(service.id)}
                        className="mt-3 text-water-700 font-semibold text-sm hover:text-water-900 transition-colors"
                      >
                        {expandedServiceId === service.id ? 'Leer menos.' : 'Leer más.'}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setBookingData({ ...bookingData, category_id: service.category_id, service_id: service.id });
                        setBookingStep(1);
                        document.getElementById('turnos')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="mt-8 text-water-900 font-bold text-sm flex items-center gap-2 hover:gap-4 transition-all group/btn"
                    >
                      Reservar ahora <ChevronRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {professionalsOfCategory.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="text-center bg-white/40 backdrop-blur-md p-16 rounded-[3rem] border border-white/60 shadow-inner"
            >
              <h3 className="text-3xl font-serif text-water-900 mb-12">Expertos en {selectedCategoryName}</h3>
              <div className="flex flex-wrap justify-center gap-16">
                {professionalsOfCategory.map((prof) => (
                  <div key={prof.id} className="flex flex-col items-center group">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-water-400/20 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
                      <div className="w-32 h-32 relative rounded-full overflow-hidden border-4 border-white shadow-xl bg-water-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        {prof.avatar_url ? (
                          <img src={prof.avatar_url} alt={prof.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-14 h-14 text-water-300" />
                        )}
                      </div>
                    </div>
                    <span className="font-serif text-xl text-water-900 group-hover:text-water-600 transition-colors">{prof.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Booking Section */}
      <section id="turnos" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-water-50 rounded-[3.5rem] overflow-hidden shadow-2xl border border-water-100">
            <div className="grid grid-cols-1 lg:grid-cols-5">
              <div className="lg:col-span-2 bg-water-900 p-16 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-5xl font-serif mb-8 leading-tight">Tu momento de relax comienza aquí</h2>
                  <p className="text-water-200 text-lg mb-12 leading-relaxed">Selecciona el servicio y el horario que mejor se adapte a tu ritmo de vida.</p>
                </div>
              </div>

              <div className="lg:col-span-3 p-16 bg-white">
                {bookingStep === 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-3xl font-serif mb-10 text-water-900">Paso 1: Elige fecha y servicio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-4">
                        <div className="rounded-3xl border border-water-100 shadow-sm p-4 bg-white">
                          <Label className="text-water-700 font-semibold ml-1">Fecha</Label>
                          <Input
                            type="date"
                            min={format(startOfToday(), 'yyyy-MM-dd')}
                            value={date ? format(date, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const nextDate = e.target.value ? new Date(`${e.target.value}T12:00:00`) : undefined;
                              if (nextDate && isDayOpen(businessHours, nextDate)) {
                                setDate(nextDate);
                              } else if (!nextDate) {
                                setDate(undefined);
                              }
                            }}
                            className="rounded-2xl border-water-100 h-14 px-6 mt-3"
                          />
                          <p className="text-sm text-stone-500 mt-3">
                            Solo se muestran días con horario habilitado.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <Label className="text-water-700 font-semibold ml-1">Categoría</Label>
                          <Select 
                            value={bookingData.category_id} 
                            onValueChange={(v) => setBookingData({ ...bookingData, category_id: v, service_id: '', professional_id: 'any' })}
                          >
                            <SelectTrigger className="rounded-2xl border-water-100 h-14 px-6">
                              <SelectValue>{getCategoryName(bookingData.category_id)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent position="popper" side="bottom" sideOffset={25} className="rounded-2xl shadow-2xl border-water-50 bg-white/95 backdrop-blur-md z-[100]">
                              {categories.map(c => (
                                <SelectItem key={c.id} value={c.id} className="py-3 px-6 focus:bg-water-50 rounded-xl">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {bookingData.category_id && (
                          <div className="space-y-3">
                            <Label className="text-water-700 font-semibold ml-1">Servicio</Label>
                            <Select 
                              value={bookingData.service_id} 
                              onValueChange={(v) => setBookingData({ ...bookingData, service_id: v })}
                            >
                              <SelectTrigger className="rounded-2xl border-water-100 h-14 px-6">
                                <SelectValue>{getServiceName(bookingData.service_id)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent position="popper" side="bottom" sideOffset={25} className="rounded-2xl shadow-2xl border-water-50 bg-white/95 backdrop-blur-md z-[100]">
                                {bookingServices.map(s => (
                                  <SelectItem key={s.id} value={s.id} className="py-3 px-6 focus:bg-water-50 rounded-xl">{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {bookingData.service_id && (
                          <div className="space-y-3">
                            <Label className="text-water-700 font-semibold ml-1">Profesional (opcional)</Label>
                            <Select 
                              value={bookingData.professional_id} 
                              onValueChange={(v) => setBookingData({ ...bookingData, professional_id: v })}
                            >
                              <SelectTrigger className="rounded-2xl border-water-100 h-14 px-6">
                                <SelectValue>{getProfessionalName(bookingData.professional_id)}</SelectValue>
                              </SelectTrigger>
                              <SelectContent position="popper" side="bottom" sideOffset={25} className="rounded-2xl shadow-2xl border-water-50 bg-white/95 backdrop-blur-md z-[100]">
                                <SelectItem value="any" className="py-3 px-6 focus:bg-water-50 rounded-xl">Cualquier profesional</SelectItem>
                                {professionals.map(p => (
                                  <SelectItem key={p.id} value={p.id} className="py-3 px-6 focus:bg-water-50 rounded-xl">{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-3">
                          <Label className="text-water-700 font-semibold ml-1">Horario</Label>
                          <Select 
                            value={bookingData.time} 
                            onValueChange={(v) => setBookingData({ ...bookingData, time: v })}
                          >
                            <SelectTrigger className="rounded-2xl border-water-100 h-14 px-6">
                              <SelectValue placeholder="Selecciona horario" />
                            </SelectTrigger>
                            <SelectContent position="popper" side="bottom" sideOffset={25} className="rounded-2xl shadow-2xl border-water-50 bg-white/95 backdrop-blur-md z-[100]">
                              {timeSlots.length === 0 ? (
                                <div className="py-3 px-6 text-sm text-stone-400 italic">
                                  No hay horarios disponibles este día
                                </div>
                              ) : (
                                timeSlots.map(t => {
                                  const occupied = isTimeOccupied(t);
                                  return (
                                    <SelectItem
                                      key={t}
                                      value={t}
                                      disabled={occupied}
                                      className={`py-3 px-6 focus:bg-water-50 rounded-xl ${occupied ? 'opacity-50 line-through' : ''}`}
                                    >
                                      {t} hs {occupied ? '(Ocupado)' : ''}
                                    </SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedBookingService?.price != null && (
                          <div className="rounded-2xl border border-water-100 bg-water-50/60 p-5 space-y-2">
                            {appliedPromo ? (
                              <>
                                <div className="flex items-center justify-between text-sm text-stone-500">
                                  <span>Precio</span>
                                  <span className="line-through">${appliedPromo.originalPrice}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-water-700 font-medium">
                                  <span className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-water-500" />
                                    {appliedPromo.promotion.title} ({formatPromoLabel(appliedPromo.promotion.discount_type, appliedPromo.promotion.discount_value)})
                                  </span>
                                  <span>− ${appliedPromo.discountAmount}</span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-water-100">
                                  <span className="font-serif text-water-900">Total con promo</span>
                                  <span className="font-serif text-2xl text-water-900">${appliedPromo.finalPrice}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="font-serif text-water-900">Total</span>
                                <span className="font-serif text-2xl text-water-900">${selectedBookingService.price}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <Button
                          onClick={() => setBookingStep(2)}
                          className="w-full btn-primary h-14 text-lg shadow-xl"
                          disabled={!date || !bookingData.service_id || !bookingData.time}
                        >
                          Siguiente paso
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {bookingStep === 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h3 className="text-3xl font-serif mb-10 text-water-900">Paso 2: Tus datos de contacto</h3>
                    <form onSubmit={handleBooking} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label htmlFor="name" className="text-water-700 font-semibold ml-1">Nombre completo</Label>
                          <Input 
                            id="name" 
                            value={bookingData.client_name}
                            onChange={(e) => setBookingData({ ...bookingData, client_name: e.target.value })}
                            required
                            className="rounded-2xl border-water-100 h-14 px-6"
                            placeholder="Ej: María García"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="phone" className="text-water-700 font-semibold ml-1">WhatsApp</Label>
                          <Input 
                            id="phone" 
                            placeholder="+54 9 294..."
                            value={bookingData.client_phone}
                            onChange={(e) => setBookingData({ ...bookingData, client_phone: e.target.value })}
                            required
                            className="rounded-2xl border-water-100 h-14 px-6"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="notes" className="text-water-700 font-semibold ml-1">Notas adicionales (opcional)</Label>
                        <Textarea 
                          id="notes" 
                          value={bookingData.notes}
                          onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                          className="rounded-2xl border-water-100 min-h-[120px] p-6"
                          placeholder="¿Alguna preferencia o detalle que debamos saber?"
                        />
                      </div>
                      <div className="flex gap-6 pt-4">
                        <Button variant="outline" onClick={() => setBookingStep(1)} className="flex-1 h-14 rounded-full border-water-200 text-water-700">Volver</Button>
                        <Button type="submit" className="flex-1 btn-primary h-14 shadow-xl">Confirmar Reserva</Button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {bookingStep === 3 && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-20"
                  >
                    <div className="w-24 h-24 bg-water-100 rounded-full flex items-center justify-center mx-auto mb-8">
                      <CheckCircle2 className="w-12 h-12 text-water-600" />
                    </div>
                    <h3 className="text-4xl font-serif mb-6 text-water-900">¡Solicitud Enviada!</h3>
                    <p className="text-stone-600 text-lg mb-12 max-w-md mx-auto">Hemos recibido tu pedido. Nos pondremos en contacto contigo vía WhatsApp para confirmar los detalles finales.</p>
                    <Button onClick={() => setBookingStep(1)} className="btn-primary px-12 h-14 shadow-xl">Hacer otra reserva</Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotions Section */}
      <section id="promociones" className="py-32 bg-water-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-serif mb-6">Promociones Lumá</h2>
            <div className="w-32 h-1.5 bg-water-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {promotions.map((promo) => (
              <div key={promo.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-10 rounded-[3rem] relative group hover:bg-white/20 transition-all duration-500">
                <div className="absolute -top-6 -right-6 bg-white text-water-900 w-24 h-24 rounded-full flex items-center justify-center font-bold shadow-2xl text-center p-3 leading-tight group-hover:scale-110 transition-transform duration-500">
                  <span className="text-lg">{promo.discount}</span>
                </div>
                <h3 className="text-3xl font-serif mb-6">{promo.title}</h3>
                <p className="text-water-100 text-lg mb-6 leading-relaxed">{promo.description}</p>
                {(promo.weekdays?.length ?? 0) > 0 && (
                  <p className="text-xs uppercase tracking-widest text-water-300 mb-6 -mt-2">
                    Válida: {WEEKDAY_DISPLAY_ORDER.filter(wd => promo.weekdays!.includes(wd)).map(wd => WEEKDAY_SHORT[wd]).join(' · ')}
                  </p>
                )}
                {(promo.service_ids ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {(promo.service_ids ?? []).map(id => {
                      const svc = services.find(s => s.id === id);
                      if (!svc) return null;
                      return (
                        <span key={id} className="text-xs bg-white/15 border border-white/20 px-3 py-1 rounded-full">
                          {svc.name}
                        </span>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => applyPromo(promo)}
                  className="text-white font-bold text-sm flex items-center gap-3 hover:gap-5 transition-all"
                >
                  Quiero esta promo <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,50 Q25,30 50,50 T100,50 V100 H0 Z" fill="white"></path>
          </svg>
        </div>
      </section>
    </div>
  );
}