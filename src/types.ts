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
  service_name?: string;
  professional_name?: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: string;
  active: boolean;
}

// Ajustamos a los roles que acepta la DB por defecto
export type UserRole = "admin" | "client";

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  updated_at?: string;
}