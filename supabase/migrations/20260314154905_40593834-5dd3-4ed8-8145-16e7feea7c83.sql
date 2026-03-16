
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('buyer', 'seller', 'inspector', 'admin');
CREATE TYPE public.inspection_status AS ENUM ('none', 'pending', 'in_progress', 'passed', 'passed_with_issues', 'failed');
CREATE TYPE public.subscription_plan AS ENUM ('individual', 'garage', 'dealer');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');
CREATE TYPE public.listing_status AS ENUM ('draft', 'active', 'sold', 'removed');

-- UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SUBSCRIPTIONS TABLE
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'individual',
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  max_listings INT NOT NULL DEFAULT 2,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LISTINGS TABLE
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  mileage INT NOT NULL,
  location TEXT NOT NULL,
  body_type TEXT NOT NULL,
  transmission TEXT NOT NULL DEFAULT 'Automatic',
  fuel_type TEXT NOT NULL DEFAULT 'Gasoline',
  vin TEXT,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  status listing_status NOT NULL DEFAULT 'active',
  inspection_status inspection_status NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active listings viewable by everyone" ON public.listings FOR SELECT USING (status = 'active' OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers can insert their own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their own listings" ON public.listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete their own listings" ON public.listings FOR DELETE USING (auth.uid() = seller_id);
CREATE POLICY "Admins can manage all listings" ON public.listings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_listings_seller ON public.listings(seller_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_make_model ON public.listings(make, model);
CREATE INDEX idx_listings_price ON public.listings(price);

-- INSPECTION REQUESTS TABLE
CREATE TABLE public.inspection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending_payment',
  result inspection_status DEFAULT 'none',
  stripe_payment_id TEXT,
  payment_amount NUMERIC(10,2),
  notes TEXT,
  scheduled_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inspection_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view their own requests" ON public.inspection_requests FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers can create requests" ON public.inspection_requests FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Inspectors can view assigned inspections" ON public.inspection_requests FOR SELECT USING (auth.uid() = inspector_id);
CREATE POLICY "Inspectors can update assigned inspections" ON public.inspection_requests FOR UPDATE USING (auth.uid() = inspector_id);
CREATE POLICY "Admins can manage all inspections" ON public.inspection_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sellers can view inspections on their listings" ON public.inspection_requests FOR SELECT USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND seller_id = auth.uid()));
CREATE TRIGGER update_inspection_requests_updated_at BEFORE UPDATE ON public.inspection_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INSPECTION REPORTS TABLE
CREATE TABLE public.inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_request_id UUID NOT NULL REFERENCES public.inspection_requests(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL REFERENCES auth.users(id),
  exterior_condition TEXT,
  interior_condition TEXT,
  engine_condition TEXT,
  transmission_condition TEXT,
  brakes_condition TEXT,
  tires_condition TEXT,
  overall_notes TEXT,
  media_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports viewable by involved parties" ON public.inspection_reports FOR SELECT USING (auth.uid() = inspector_id OR EXISTS (SELECT 1 FROM public.inspection_requests ir WHERE ir.id = inspection_request_id AND ir.buyer_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Inspectors can create reports" ON public.inspection_reports FOR INSERT WITH CHECK (auth.uid() = inspector_id);
CREATE POLICY "Inspectors can update their reports" ON public.inspection_reports FOR UPDATE USING (auth.uid() = inspector_id);

-- CHAT CONVERSATIONS TABLE
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view their conversations" ON public.chat_conversations FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers can create conversations" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Admins can manage all conversations" ON public.chat_conversations FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHAT MESSAGES TABLE (admin-moderated)
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view approved messages" ON public.chat_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())) AND (is_approved = TRUE OR sender_id = auth.uid()));
CREATE POLICY "Participants can send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())));
CREATE POLICY "Admins can manage all messages" ON public.chat_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SAVED CARS TABLE
CREATE TABLE public.saved_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);
ALTER TABLE public.saved_cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their saved cars" ON public.saved_cars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save cars" ON public.saved_cars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave cars" ON public.saved_cars FOR DELETE USING (auth.uid() = user_id);

-- NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('car-images', 'car-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-media', 'inspection-media', false);

CREATE POLICY "Car images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'car-images');
CREATE POLICY "Authenticated users can upload car images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'car-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own car images" ON storage.objects FOR UPDATE USING (bucket_id = 'car-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own car images" ON storage.objects FOR DELETE USING (bucket_id = 'car-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Inspection media viewable by all authenticated" ON storage.objects FOR SELECT USING (bucket_id = 'inspection-media');
CREATE POLICY "Inspectors can upload inspection media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inspection-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Inspectors can update their media" ON storage.objects FOR UPDATE USING (bucket_id = 'inspection-media' AND auth.uid()::text = (storage.foldername(name))[1]);
