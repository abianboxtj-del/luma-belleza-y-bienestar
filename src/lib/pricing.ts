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

export interface PricedPromo {
  promotion: Promotion;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

/**
 * Mejor promo activa aplicable a un servicio (la que más descuenta). Devuelve
 * `null` si el servicio no tiene precio cargado o ninguna promo aplica, en cuyo
 * caso la reserva sigue su curso normal sin descuento.
 */
export function bestPromoForService(
  promos: Promotion[],
  service: Service | undefined
): PricedPromo | null {
  if (!service || service.price == null) return null;
  const price = service.price;

  let best: PricedPromo | null = null;
  for (const promo of promos) {
    if (!promo.active) continue;
    if (!promoAppliesToService(promo, service.id)) continue;

    const discountAmount = computeDiscountAmount(price, promo.discount_type, promo.discount_value);
    if (discountAmount <= 0) continue;

    if (!best || discountAmount > best.discountAmount) {
      best = { promotion: promo, originalPrice: price, discountAmount, finalPrice: price - discountAmount };
    }
  }
  return best;
}
