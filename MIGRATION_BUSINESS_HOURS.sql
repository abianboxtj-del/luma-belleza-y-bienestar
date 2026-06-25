-- =============================================================================
-- MIGRACIÓN: Horarios de atención configurables (business_hours)
-- =============================================================================
-- Reemplaza los horarios hardcodeados del front (timeSlots fijos + domingo
-- bloqueado a mano) por una configuración por día de la semana que owner/admin
-- pueden editar desde /admin/schedule.
--
-- weekday usa la convención de JS Date.getDay():
--   0 = domingo, 1 = lunes, 2 = martes, 3 = miércoles,
--   4 = jueves,  5 = viernes, 6 = sábado
--
-- Cada día define si está abierto (is_open) y, si lo está, el rango de atención
-- (open_time / close_time). El front genera los turnos reservables por hora
-- dentro de ese rango.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_hours (
  weekday    SMALLINT PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  is_open    BOOLEAN NOT NULL DEFAULT true,
  open_time  TEXT NOT NULL DEFAULT '09:00',
  close_time TEXT NOT NULL DEFAULT '19:00',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seguridad (RLS): cualquiera puede leer (la home necesita los horarios para
-- mostrar el calendario), pero solo owner/admin pueden modificarlos.
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública horarios" ON public.business_hours;
CREATE POLICY "Lectura pública horarios" ON public.business_hours
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin total horarios" ON public.business_hours;
CREATE POLICY "Admin total horarios" ON public.business_hours
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Valores iniciales: lunes a sábado de 09:00 a 19:00, domingo cerrado.
-- (Replica el comportamiento anterior, ahora editable.)
INSERT INTO public.business_hours (weekday, is_open, open_time, close_time) VALUES
  (0, false, '09:00', '19:00'),  -- domingo (cerrado)
  (1, true,  '09:00', '19:00'),  -- lunes
  (2, true,  '09:00', '19:00'),  -- martes
  (3, true,  '09:00', '19:00'),  -- miércoles
  (4, true,  '09:00', '19:00'),  -- jueves
  (5, true,  '09:00', '19:00'),  -- viernes
  (6, true,  '09:00', '19:00')   -- sábado
ON CONFLICT (weekday) DO NOTHING;
