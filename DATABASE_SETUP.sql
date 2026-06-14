-- 1. Categorías
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Servicios
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL,
  price NUMERIC,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Profesionales
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialties TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Turnos (Appointments)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Promociones
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  discount TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Perfiles de Usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('owner', 'admin', 'client')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Habilitar RLS (Seguridad)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Lectura pública categorías" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin total categorías" ON public.categories FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Lectura pública servicios" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admin total servicios" ON public.services FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Lectura pública profesionales" ON public.professionals FOR SELECT USING (true);
CREATE POLICY "Admin total profesionales" ON public.professionals FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Inserción pública turnos" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin total turnos" ON public.appointments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Lectura pública promociones" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Admin total promociones" ON public.promotions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Usuarios ven su propio perfil" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuarios actualizan su propio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Función y Trigger para crear perfil automáticamente al registrarse
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
      -- El email principal siempre es dueño (bootstrap).
      WHEN new.email = 'nahuelvalquinta2@gmail.com' THEN 'owner'
      -- Respetamos el rol que envía la edge function create-user.
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Datos iniciales de ejemplo
INSERT INTO public.categories (name, "order") VALUES ('Masajes', 1), ('Faciales', 2), ('Uñas', 3) ON CONFLICT DO NOTHING;