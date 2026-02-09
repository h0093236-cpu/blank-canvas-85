
-- Add nearby contacts to clients
ALTER TABLE public.clients ADD COLUMN contact1_name text;
ALTER TABLE public.clients ADD COLUMN contact1_phone text;
ALTER TABLE public.clients ADD COLUMN contact2_name text;
ALTER TABLE public.clients ADD COLUMN contact2_phone text;

-- Add configurable cycle days to loans (default 30 for backward compat)
ALTER TABLE public.loans ADD COLUMN cycle_days integer NOT NULL DEFAULT 30;

-- Add payment recipient bank details to loans
ALTER TABLE public.loans ADD COLUMN recipient_pix_key text;
ALTER TABLE public.loans ADD COLUMN recipient_full_name text;
ALTER TABLE public.loans ADD COLUMN recipient_bank text;
ALTER TABLE public.loans ADD COLUMN recipient_cpf text;
ALTER TABLE public.loans ADD COLUMN recipient_account_number text;
