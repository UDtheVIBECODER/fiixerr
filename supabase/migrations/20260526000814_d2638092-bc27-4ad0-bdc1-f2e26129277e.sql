
-- Brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Models
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  release_year INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, name)
);
CREATE INDEX ON public.models(brand_id);

-- Services
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  default_labor_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pricing Matrix
CREATE TABLE public.pricing_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  part_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  labor_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_minutes INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(model_id, service_id)
);
CREATE INDEX ON public.pricing_matrix(model_id);
CREATE INDEX ON public.pricing_matrix(service_id);

-- Zip Codes
CREATE TABLE public.zip_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip TEXT NOT NULL UNIQUE,
  city TEXT,
  travel_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.zip_codes(zip);

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  street_address TEXT,
  zip TEXT NOT NULL,
  service_mode TEXT NOT NULL CHECK (service_mode IN ('mobile','dropoff')),
  brand_id UUID REFERENCES public.brands(id),
  model_id UUID REFERENCES public.models(id),
  service_ids UUID[] NOT NULL DEFAULT '{}',
  brand_name_snapshot TEXT NOT NULL,
  model_name_snapshot TEXT NOT NULL,
  services_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  parts_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  labor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  travel_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  appointment_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pre_repair_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  post_repair_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zip_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "public read models" ON public.models FOR SELECT USING (true);
CREATE POLICY "public read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "public read pricing" ON public.pricing_matrix FOR SELECT USING (true);
CREATE POLICY "public read zips" ON public.zip_codes FOR SELECT USING (active = true);

-- Bookings: anyone may insert; nobody may read via anon (sensitive PII).
CREATE POLICY "anyone can create booking" ON public.bookings FOR INSERT WITH CHECK (true);
