-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.books (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  language text NOT NULL DEFAULT 'EN'::text,
  format text NOT NULL CHECK (format = ANY (ARRAY['pdf'::text, 'epub'::text, 'text'::text])),
  file_size_label text,
  r2_url text NOT NULL,
  download_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT books_pkey PRIMARY KEY (id)
);
CREATE TABLE public.dictionary_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  word text NOT NULL,
  language_from text NOT NULL,
  language_to text NOT NULL,
  part_of_speech text,
  definition text NOT NULL,
  example text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dictionary_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.funeral_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  address text,
  lat numeric,
  lng numeric,
  phone text,
  hours text,
  youtube_url text,
  cover_image_url text,
  tags ARRAY DEFAULT '{}'::text[],
  menu_data jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT funeral_applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.funeral_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  address text,
  phone text,
  lat numeric,
  lng numeric,
  cover_image_url text,
  youtube_url text,
  hours jsonb,
  is_open boolean DEFAULT false,
  is_vip boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  status text DEFAULT 'approved'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT funeral_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.funeral_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT funeral_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT funeral_reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.funeral_providers(id)
);
CREATE TABLE public.funeral_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  price integer,
  image_url text,
  is_available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  CONSTRAINT funeral_services_pkey PRIMARY KEY (id),
  CONSTRAINT funeral_services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.funeral_providers(id)
);
CREATE TABLE public.menu_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  CONSTRAINT menu_categories_pkey PRIMARY KEY (id),
  CONSTRAINT menu_categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  category_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  image_url text,
  is_available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id),
  CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id)
);
CREATE TABLE public.merchant_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'Restaurant'::text,
  address text,
  phone text,
  hours text,
  youtube_url text,
  cover_image_url text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  tags ARRAY DEFAULT '{}'::text[],
  lat numeric,
  lng numeric,
  menu_data jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT merchant_applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  items jsonb NOT NULL,
  whatsapp_number text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Restaurant'::text,
  address text,
  phone text,
  lat numeric,
  lng numeric,
  cover_image_url text,
  youtube_url text,
  hours jsonb,
  is_open boolean DEFAULT false,
  is_vip boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT restaurants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);
CREATE TABLE public.saloon_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'Barbershop'::text,
  address text,
  lat numeric,
  lng numeric,
  phone text,
  hours text,
  youtube_url text,
  cover_image_url text,
  tags ARRAY DEFAULT '{}'::text[],
  menu_data jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  staff_data jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT saloon_applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.saloon_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  saloon_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saloon_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT saloon_reviews_saloon_id_fkey FOREIGN KEY (saloon_id) REFERENCES public.saloons(id)
);
CREATE TABLE public.saloon_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  saloon_id uuid NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  duration integer,
  image_url text,
  is_available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  CONSTRAINT saloon_services_pkey PRIMARY KEY (id),
  CONSTRAINT saloon_services_saloon_id_fkey FOREIGN KEY (saloon_id) REFERENCES public.saloons(id)
);
CREATE TABLE public.saloon_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  saloon_id uuid NOT NULL,
  name text NOT NULL,
  role text,
  photo_url text,
  sort_order integer DEFAULT 0,
  CONSTRAINT saloon_staff_pkey PRIMARY KEY (id),
  CONSTRAINT saloon_staff_saloon_id_fkey FOREIGN KEY (saloon_id) REFERENCES public.saloons(id)
);
CREATE TABLE public.saloons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'Barbershop'::text,
  address text,
  phone text,
  lat numeric,
  lng numeric,
  cover_image_url text,
  youtube_url text,
  hours jsonb,
  is_open boolean DEFAULT false,
  is_vip boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saloons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wellness_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'Massage'::text,
  address text,
  lat numeric,
  lng numeric,
  phone text,
  hours text,
  youtube_url text,
  cover_image_url text,
  tags ARRAY DEFAULT '{}'::text[],
  menu_data jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wellness_applications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wellness_centers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'Massage'::text,
  address text,
  phone text,
  lat numeric,
  lng numeric,
  cover_image_url text,
  youtube_url text,
  hours jsonb,
  is_open boolean DEFAULT false,
  is_vip boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wellness_centers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wellness_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wellness_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT wellness_reviews_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.wellness_centers(id)
);
CREATE TABLE public.wellness_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  duration integer,
  image_url text,
  is_available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  CONSTRAINT wellness_services_pkey PRIMARY KEY (id),
  CONSTRAINT wellness_services_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.wellness_centers(id)
);