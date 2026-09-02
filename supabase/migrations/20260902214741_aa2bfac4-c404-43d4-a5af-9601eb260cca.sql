CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can read their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.sizes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

GRANT SELECT ON public.sizes TO anon;
GRANT SELECT ON public.sizes TO authenticated;
GRANT ALL ON public.sizes TO service_role;

ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sizes"
ON public.sizes
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage sizes"
ON public.sizes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.suits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    color text,
    price_per_day numeric(10,2) NOT NULL DEFAULT 0,
    images text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

GRANT SELECT ON public.suits TO anon;
GRANT SELECT ON public.suits TO authenticated;
GRANT ALL ON public.suits TO service_role;

ALTER TABLE public.suits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read suits"
ON public.suits
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage suits"
ON public.suits
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.suit_sizes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    suit_id uuid REFERENCES public.suits(id) ON DELETE CASCADE NOT NULL,
    size_id uuid REFERENCES public.sizes(id) ON DELETE CASCADE NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (suit_id, size_id)
);

GRANT SELECT ON public.suit_sizes TO anon;
GRANT SELECT ON public.suit_sizes TO authenticated;
GRANT ALL ON public.suit_sizes TO service_role;

ALTER TABLE public.suit_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read suit sizes"
ON public.suit_sizes
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage suit sizes"
ON public.suit_sizes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.rentals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    suit_id uuid REFERENCES public.suits(id) ON DELETE SET NULL NOT NULL,
    suit_size_id uuid REFERENCES public.suit_sizes(id) ON DELETE SET NULL,
    size_id uuid REFERENCES public.sizes(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_rental_dates CHECK (end_date >= start_date),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled'))
);

GRANT SELECT, INSERT ON public.rentals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rentals TO authenticated;
GRANT ALL ON public.rentals TO service_role;

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create rentals"
ON public.rentals
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can read rentals by email"
ON public.rentals
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage rentals"
ON public.rentals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suits_updated_at
BEFORE UPDATE ON public.suits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at
BEFORE UPDATE ON public.rentals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
