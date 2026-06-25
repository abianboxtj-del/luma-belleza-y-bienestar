export interface Category {
  id: string;
  name: string;
  order?: number;
}

export interface Service {
  id: string;
  name: string;
  category_id: string;
  duration: number;
  price?: number;
  description?: string;
  category_name?: string;
}

export interface Professional {
  id: string;
  name: string;
  specialties: string[];
  avatar_url?: string;
}

// Horario de atención por día de la semana. weekday sigue la convención de
// JS Date.getDay(): 0=domingo, 1=lunes, ... 6=sábado. Si is_open es false, ese
// día no se puede reservar; si es true, los turnos van de open_time a close_time
// (formato "HH:MM").
export interface BusinessHour {
  weekday: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export type AppointmentStatus = "pending" | "approved" | "cancelled";

export interface Appointment {
  id: string;
  service_id: string;
  professional_id?: string;
  date: string;
  time: string;
  client_name: string;
  client_email?: string;
  client_phone: string;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  // Promo aplicada al reservar (si hubo). Los precios quedan "congelados" en el
  // turno para que el admin vea exactamente qué se cobró, aunque la promo cambie
  // o se borre después.
  promotion_id?: string | null;
  original_price?: number | null;
  discount_amount?: number | null;
  final_price?: number | null;
  service_name?: string;
  professional_name?: string;
  promotion_title?: string;
}

// Cómo se calcula el descuento de una promo: porcentaje del precio o monto fijo.
export type DiscountType = "percent" | "fixed";

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: string; // etiqueta legible derivada (ej: "20% OFF"), para mostrar.
  discount_type: DiscountType;
  discount_value: number;
  active: boolean;
  // IDs de servicios a los que aplica (hidratado desde promotion_services).
  service_ids?: string[];
}

// Roles que acepta la DB. 'owner' (dueño) = gestión total; 'admin' = empleado
// con acceso a la agenda; 'client' = cliente final.
export type UserRole = "owner" | "admin" | "client";

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  updated_at?: string;
}