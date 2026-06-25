import { Promotion, Service, DiscountType } from '@/types';

/**
 * Lógica de descuentos de promociones. Mantiene en un solo lugar el cálculo del
 * monto rebajado y la etiqueta que se muestra, para que el panel (al crear la
 * promo) y la reserva (al aplicarla) usen exactamente la misma fórmula.
 */

// Etiqueta legible de la promo (lo que se muestra en el círculo de la card).
export function formatPromoLabel(type: DiscountType, value: number): string {
  if (!value) return '';
  return type === 'fixed' ? `$${value} OFF` : `${value}% OFF`;
}

// Monto en $ que se descuenta sobre un precio dado. Nunca negativo ni mayor que
// el precio (un descuento no puede dejar el turno por debajo de $0).
export function computeDiscountAmount(
  price: number,
  type: DiscountType,
  value: number
): number {
  const raw = type === 'fixed' ? value : (price * value) / 100;
  const clamped = Math.max(0, Math.min(raw, price));
  return Math.round(clamped);
}

export function promoAppliesToService(promo: Promotion, serviceId: string): boolean {
  return Array.isArray(promo.service_ids) && promo.service_ids.includes(serviceId);
}

// ¿La promo es válida el día de la semana dado? (Date.getDay(): 0=domingo..6=sábado).
// Sin restricción de días (null/undefined o vacío) => vale cualquier día.
export function promoAppliesToWeekday(promo: Promotion, weekday: number): boolean {
  if (!Array.isArray(promo.weekdays) || promo.weekdays.length === 0) return true;
  return promo.weekdays.includes(weekday);
}

export interface PricedPromo {
  promotion: Promotion;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

/**
 * Mejor promo aplicable automáticamente a un servicio (la que más descuenta).
 * Solo considera promos automáticas (`auto_apply`), activas, que cubran el
 * servicio y —si se pasa `weekday`— válidas ese día de la semana. Las promos
 * manuales/informativas nunca se auto-aplican acá. Devuelve `null` si el servicio
 * no tiene precio o ninguna promo aplica, y la reserva sigue sin descuento.
 *
 * @param weekday Día elegido (Date.getDay(): 0=domingo..6=sábado). Si se omite,
 *                no se filtra por día.
 */
export function bestPromoForService(
  promos: Promotion[],
  service: Service | undefined,
  weekday?: number
): PricedPromo | null {
  if (!service || service.price == null) return null;
  const price = service.price;

  let best: PricedPromo | null = null;
  for (const promo of promos) {
    if (!promo.active) continue;
    if (promo.auto_apply === false) continue;
    if (!promoAppliesToService(promo, service.id)) continue;
    if (weekday != null && !promoAppliesToWeekday(promo, weekday)) continue;

    const discountAmount = computeDiscountAmount(price, promo.discount_type, promo.discount_value);
    if (discountAmount <= 0) continue;

    if (!best || discountAmount > best.discountAmount) {
      best = { promotion: promo, originalPrice: price, discountAmount, finalPrice: price - discountAmount };
    }
  }
  return best;
}
