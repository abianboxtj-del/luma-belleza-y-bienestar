-- =============================================================
-- MIGRACIÓN: añadir el rol 'owner' (Dueño) como rol real y creable.
-- Antes "Dueño" era solo una etiqueta atada a un email fijo; ahora es
-- un rol de verdad: 'owner' = gestión total, 'admin' = empleado (agenda).
-- Ejecutar TODO este bloque en: Supabase -> SQL Editor.
-- Es idempotente: se puede correr más de una vez sin romper nada.
-- =============================================================

-- 1. Permitir 'owner' en el CHECK de la columna role.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'admin', 'client'));

-- 2. Promover la cuenta principal (bootstrap) a dueño.
UPDATE public.profiles
  SET role = 'owner'
  WHERE email = 'nahuelvalquinta2@gmail.com';

-- 3. El trigger de alta ahora respeta el rol que envía create-user
--    y rellena nombre/apellido desde los metadatos.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    CASE
      WHEN new.email = 'nahuelvalquinta2@gmail.com' THEN 'owner'
      WHEN new.raw_user_meta_data->>'role' IN ('owner', 'admin', 'client')
        THEN new.raw_user_meta_data->>'role'
      ELSE 'client'
    END,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  RETURN new;
END;
$$;

-- 4. is_admin() (usada por las políticas RLS) incluye a los dueños.
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
