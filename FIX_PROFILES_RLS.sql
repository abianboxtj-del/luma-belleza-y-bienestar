-- =============================================================
-- FIX: "infinite recursion detected in policy for relation profiles" (42P17)
-- Causa: una política sobre `profiles` consultaba la propia tabla
-- `profiles` para comprobar el rol admin -> recursión infinita.
-- Solución: comprobar el rol con una función SECURITY DEFINER que
-- omite RLS (es dueña de la tabla), por lo que la política deja de
-- auto-referenciarse.
-- Ejecutar TODO este bloque en: Supabase -> SQL Editor.
-- =============================================================

-- 1. Función helper: ¿el usuario actual es admin?
--    SECURITY DEFINER + search_path vacío = se ejecuta como dueña y
--    NO dispara las políticas RLS de `profiles` (no hay recursión).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;

-- 2. Quitar CUALQUIER política previa de profiles para empezar limpio.
--    (Incluye la política recursiva que provocaba el error, tenga el
--     nombre que tenga en tu proyecto.)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles;', pol.policyname);
  END LOOP;
END $$;

-- 3. Recrear las políticas de `profiles` SIN recursión.
--    Cada usuario ve/edita su propio perfil; el admin ve y gestiona todos
--    a través de is_admin() (que ya omite RLS).
CREATE POLICY "Usuarios ven su propio perfil"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuarios actualizan su propio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin ve todos los perfiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admin gestiona todos los perfiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. (Recomendado) Reescribir las políticas de admin del resto de tablas
--    para usar is_admin() en vez del EXISTS(... profiles ...). Es más
--    limpio y evita evaluar la RLS de profiles en cada consulta.
DROP POLICY IF EXISTS "Admin total categorías" ON public.categories;
CREATE POLICY "Admin total categorías" ON public.categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin total servicios" ON public.services;
CREATE POLICY "Admin total servicios" ON public.services
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin total profesionales" ON public.professionals;
CREATE POLICY "Admin total profesionales" ON public.professionals
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin total turnos" ON public.appointments;
CREATE POLICY "Admin total turnos" ON public.appointments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin total promociones" ON public.promotions;
CREATE POLICY "Admin total promociones" ON public.promotions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
