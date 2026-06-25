import { BusinessHour } from '@/types';

// Nombres de los días por índice de Date.getDay() (0=domingo ... 6=sábado).
export const WEEKDAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

// Etiquetas cortas por índice de Date.getDay() (para chips compactos).
export const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

// Orden de visualización en el panel: lunes primero, domingo al final.
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

// "HH:MM" -> minutos desde medianoche. Devuelve null si el formato es inválido.
function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// minutos desde medianoche -> "HH:MM".
function toHHMM(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Genera los horarios reservables (paso de 1 hora) dentro del rango [open, close],
// ambos extremos incluidos. Ej: ('09:00', '12:00') -> ['09:00','10:00','11:00','12:00'].
// Si el rango es inválido o está al revés, devuelve [].
export function generateHourlySlots(open: string, close: string): string[] {
  const start = toMinutes(open);
  const end = toMinutes(close);
  if (start === null || end === null || end < start) return [];

  const slots: string[] = [];
  for (let m = start; m <= end; m += 60) {
    slots.push(toHHMM(m));
  }
  return slots;
}

// Config del día correspondiente a una fecha, según business_hours.
export function getDayConfig(hours: BusinessHour[], date: Date): BusinessHour | undefined {
  return hours.find((h) => h.weekday === date.getDay());
}

// ¿Se puede reservar ese día? Abierto si la config lo marca como is_open.
// Fallback si todavía no hay config cargada/migrada: cerrado solo el domingo
// (replica el comportamiento previo para no romper la home).
export function isDayOpen(hours: BusinessHour[], date: Date): boolean {
  const config = getDayConfig(hours, date);
  if (!config) return date.getDay() !== 0;
  return config.is_open;
}

// Horarios reservables para una fecha concreta según su config de día.
export function slotsForDate(hours: BusinessHour[], date: Date): string[] {
  const config = getDayConfig(hours, date);
  if (!config || !config.is_open) return [];
  return generateHourlySlots(config.open_time, config.close_time);
}
