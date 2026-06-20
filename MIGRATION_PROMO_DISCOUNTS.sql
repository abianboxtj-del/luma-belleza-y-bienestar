-- ============================================================================
-- Migración: descuentos reales de promociones
-- ----------------------------------------------------------------------------
-- Convierte las promociones de "solo vitrina" a descuentos que se aplican al
-- reservar. Una promo ahora tiene tipo (% o monto fijo) + valor, y se vincula a
-- servicios específicos. Al reservar, el precio rebajado queda guardado en el
-- turno.
--
-- Idempotente: se puede correr varias veces sin romper datos existentes.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================================

-- 1. Estructura del descuento en la promo --------------------------------------
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC NOT NULL DEFAULT 0;

-- 2. Qué servicios cubre cada promo (relación N:N) -----------------------------
CREATE TABLE IF NOT EXISTS public.promotion_services (
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  service_id   UUID NOT NULL REFERENCES public.services(id)   ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, service_id)
);

-- 3. Snapshot del precio aplicado en el turno ----------------------------------
-- Se guardan los montos calculados (no solo el promotion_id) para que el turno
-- conserve lo cobrado aunque la promo se edite o elimine luego.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS promotion_id    UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_price  NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS final_price     NUMERIC;

-- 4. RLS de la tabla de relación (mismo criterio que promotions) ---------------
ALTER TABLE public.promotion_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública promo-servicios" ON public.promotion_services;
CREATE POLICY "Lectura pública promo-servicios"
  ON public.promotion_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin total promo-servicios" ON public.promotion_services;
CREATE POLICY "Admin total promo-servicios"
  ON public.promotion_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- 5. Backfill de promos existentes ---------------------------------------------
-- Intenta deducir tipo/valor desde la etiqueta de texto vieja (ej: "20% OFF",
-- "$5000"). Lo que no se pueda parsear queda en 0 (sin efecto) hasta editarlo.
UPDATE public.promotions
SET
  discount_type = CASE WHEN discount ILIKE '%\%%' THEN 'percent' ELSE 'fixed' END,
  discount_value = COALESCE(NULLIF(regexp_replace(discount, '[^0-9.]', '', 'g'), '')::NUMERIC, 0)
WHERE discount_value = 0;
