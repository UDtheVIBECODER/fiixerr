
-- Enum
CREATE TYPE public.app_role AS ENUM ('ULTIMATE_ADMIN', 'ADMIN', 'EMPLOYEE');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'EMPLOYEE',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Registration codes
CREATE TABLE public.registration_codes (
  code text PRIMARY KEY,
  role public.app_role NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE')),
  is_used boolean NOT NULL DEFAULT false,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_codes TO authenticated;
GRANT ALL ON public.registration_codes TO service_role;

ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Brand icon column
ALTER TABLE public.brands ADD COLUMN icon_url text;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id)
$$;

-- Auto-create ULTIMATE_ADMIN profile when owner signs in via Google
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'dahaluts@gmail.com' THEN
    INSERT INTO public.profiles (id, username, role)
    VALUES (NEW.id, 'owner', 'ULTIMATE_ADMIN')
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Consume registration code (called from server fn during staff signup)
CREATE OR REPLACE FUNCTION public.consume_registration_code(
  _code text,
  _user_id uuid,
  _username text
) RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  SELECT role INTO _role FROM public.registration_codes
  WHERE code = _code AND is_used = false
  FOR UPDATE;

  IF _role IS NULL THEN
    RAISE EXCEPTION 'Invalid or already used code';
  END IF;

  UPDATE public.registration_codes
  SET is_used = true, used_by = _user_id
  WHERE code = _code;

  INSERT INTO public.profiles (id, username, role)
  VALUES (_user_id, _username, _role);

  RETURN _role;
END;
$$;

-- ===== RLS POLICIES =====

-- profiles
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "ultimate admin reads all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

CREATE POLICY "admin reads all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "ultimate admin deletes profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

-- registration_codes (ULTIMATE_ADMIN only via direct access)
CREATE POLICY "ultimate admin reads codes" ON public.registration_codes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

CREATE POLICY "ultimate admin inserts codes" ON public.registration_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

CREATE POLICY "ultimate admin deletes codes" ON public.registration_codes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

-- Catalog mgmt: brands/models/services/pricing_matrix/zip_codes - admin+ write
GRANT INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.models TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing_matrix TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.zip_codes TO authenticated;

CREATE POLICY "admins write brands" ON public.brands
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

CREATE POLICY "admins write models" ON public.models
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

CREATE POLICY "admins write services" ON public.services
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

CREATE POLICY "admins write pricing" ON public.pricing_matrix
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

CREATE POLICY "admins write zips" ON public.zip_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));

-- bookings: staff (any role) can read/update; ultimate admin can delete
GRANT SELECT, UPDATE, DELETE ON public.bookings TO authenticated;

CREATE POLICY "staff read bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "staff update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "ultimate admin deletes bookings" ON public.bookings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'ULTIMATE_ADMIN'));
