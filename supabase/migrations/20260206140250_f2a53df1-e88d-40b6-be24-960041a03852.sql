
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  numeric_login TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  document_type TEXT,
  document_number TEXT,
  street TEXT,
  number TEXT,
  district TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  pix_key TEXT,
  photo_selfie_path TEXT,
  photo_document_path TEXT,
  guarantor_id UUID REFERENCES public.clients(id),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators see own clients" ON public.clients FOR SELECT USING (operator_id = auth.uid());
CREATE POLICY "Operators insert own clients" ON public.clients FOR INSERT WITH CHECK (operator_id = auth.uid());
CREATE POLICY "Operators update own clients" ON public.clients FOR UPDATE USING (operator_id = auth.uid());
CREATE POLICY "Operators delete own clients" ON public.clients FOR DELETE USING (operator_id = auth.uid());

-- Loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  guarantor_client_id UUID REFERENCES public.clients(id),
  principal_initial NUMERIC(12,2) NOT NULL,
  principal_open NUMERIC(12,2) NOT NULL,
  monthly_rate_pct NUMERIC(5,2) NOT NULL,
  transfer_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL,
  cycle_interest_amount NUMERIC(12,2) NOT NULL,
  transfer_receipt_path TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators see own loans" ON public.loans FOR SELECT USING (operator_id = auth.uid());
CREATE POLICY "Operators insert own loans" ON public.loans FOR INSERT WITH CHECK (operator_id = auth.uid());
CREATE POLICY "Operators update own loans" ON public.loans FOR UPDATE USING (operator_id = auth.uid());
CREATE POLICY "Operators delete own loans" ON public.loans FOR DELETE USING (operator_id = auth.uid());

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL,
  late_fee_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  cycle_interest_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  principal_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  receipt_path TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators see own payments" ON public.payments FOR SELECT USING (operator_id = auth.uid());
CREATE POLICY "Operators insert own payments" ON public.payments FOR INSERT WITH CHECK (operator_id = auth.uid());
CREATE POLICY "Operators update own payments" ON public.payments FOR UPDATE USING (operator_id = auth.uid());

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Storage policies
CREATE POLICY "Operators upload own photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Operators view own photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Operators delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Operators upload own receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Operators view own receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Operators delete own receipts" ON storage.objects FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
