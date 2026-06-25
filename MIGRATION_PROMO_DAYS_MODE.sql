-- ============================================================================
-- Migración: promos por día + modo de aplicación
-- ----------------------------------------------------------------------------
-- Agrega dos capacidades genéricas a las promociones (sirven para cualquier
-- promo, sin lógica especial por caso):
--
--   1) weekdays   -> días de la semana en los que la promo vale.
--                    Convención JS Date.getDay(): 0=domingo ... 6=sábado.
--                    NULL o vacío = válida todos los días.
--
--   2) auto_apply -> cómo se aplica:
--                    true  = automática: se descuenta sola al reservar (lo de hoy).
--                    false = manual/informativa: se publica como promo pero NO se
--                            auto-aplica a todos (ej. "Jubilados y pensionados 15%").
--                            El ajuste lo coordina el staff.
--
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- ============================================================================

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS weekdays   SMALLINT[],
  ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN NOT NULL DEFAULT true;

-- Las promos existentes siguen comportándose igual: todos los días (weekdays NULL)
-- y automáticas (auto_apply = true por defecto). No hace falta backfill.
