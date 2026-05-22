-- ============================================================
-- MANSGROUP FINTECH — Schema v4 (Clean)
-- Jalankan di Supabase SQL Editor
-- DROP semua tabel lama lalu rebuild bersih
-- ============================================================

-- ─── DROP SEMUA TABEL & FUNCTION ─────────────────────────────
DROP TABLE IF EXISTS public.audit_logs          CASCADE;
DROP TABLE IF EXISTS public.notifications       CASCADE;
DROP TABLE IF EXISTS public.blacklists          CASCADE;
DROP TABLE IF EXISTS public.documents           CASCADE;
DROP TABLE IF EXISTS public.payments            CASCADE;
DROP TABLE IF EXISTS public.collateral_items    CASCADE;
DROP TABLE IF EXISTS public.pickup_schedules    CASCADE;
DROP TABLE IF EXISTS public.loan_schedules      CASCADE;
DROP TABLE IF EXISTS public.gadai_applications  CASCADE;
DROP TABLE IF EXISTS public.loans               CASCADE;
DROP TABLE IF EXISTS public.kyc_documents       CASCADE;
DROP TABLE IF EXISTS public.profiles            CASCADE;

DROP FUNCTION IF EXISTS public.get_user_role()     CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()   CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  phone           TEXT,
  address         TEXT,
  nik             TEXT,
  birth_place     TEXT,
  birth_date      DATE,
  occupation      TEXT,
  income          BIGINT,
  role            TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user','staff','admin','founder')),
  kyc_status      TEXT NOT NULL DEFAULT 'unverified'
                  CHECK (kyc_status IN ('unverified','pending','verified','rejected')),
  reward_eligible BOOLEAN DEFAULT FALSE,
  is_blacklisted  BOOLEAN DEFAULT FALSE,
  suspended       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- KYC DOCUMENTS
-- ============================================================
CREATE TABLE public.kyc_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ktp_photo_url   TEXT,
  selfie_ktp_url  TEXT,
  selfie_url      TEXT,
  kk_url          TEXT,
  ktm_url         TEXT,
  pddikti_url     TEXT,
  nim             TEXT,
  campus_name     TEXT,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','verified','rejected')),
  review_notes    TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- LOANS
-- ============================================================
CREATE TABLE public.loans (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_number           TEXT UNIQUE NOT NULL,
  user_id              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount               BIGINT NOT NULL,
  approved_amount      BIGINT,
  tenor                INTEGER NOT NULL CHECK (tenor IN (1,3,6,9)),
  interest_rate        DECIMAL(5,4) DEFAULT 0.05,
  total_interest       BIGINT,
  platform_fee         BIGINT,
  net_disbursement     BIGINT,
  total_repayment      BIGINT,
  monthly_installment  BIGINT,
  remaining_amount     BIGINT,
  bank_code            TEXT,
  account_number       TEXT,
  account_name         TEXT,
  disbursement_ref     TEXT,
  user_type            TEXT DEFAULT 'worker',
  full_name            TEXT,
  nik                  TEXT,
  birth_place          TEXT,
  birth_date           DATE,
  address              TEXT,
  occupation           TEXT,
  income               BIGINT,
  phone                TEXT,
  emergency_name       TEXT,
  emergency_phone      TEXT,
  emergency_relation   TEXT,
  nim                  TEXT,
  campus_name          TEXT,
  ktp_photo_url        TEXT,
  selfie_ktp_url       TEXT,
  selfie_url           TEXT,
  kk_url               TEXT,
  ktm_url              TEXT,
  pddikti_url          TEXT,
  status               TEXT DEFAULT 'pending'
                       CHECK (status IN ('pending','review','revision','approved','rejected',
                                         'disbursed','overdue','completed','blacklisted')),
  staff_notes          TEXT,
  admin_notes          TEXT,
  revision_note        TEXT,
  suggested_amount     BIGINT,
  reviewed_by          UUID REFERENCES public.profiles(id),
  approved_by          UUID REFERENCES public.profiles(id),
  approved_at          TIMESTAMPTZ,
  disbursed_at         TIMESTAMPTZ,
  due_date             DATE,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOAN SCHEDULES
-- ============================================================
CREATE TABLE public.loan_schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id     UUID REFERENCES public.loans(id) ON DELETE CASCADE,
  month       INTEGER NOT NULL,
  due_date    DATE NOT NULL,
  principal   BIGINT,
  interest    BIGINT,
  total       BIGINT,
  paid_amount BIGINT DEFAULT 0,
  status      TEXT DEFAULT 'pending'
              CHECK (status IN ('pending','paid','overdue')),
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GADAI APPLICATIONS
-- ============================================================
CREATE TABLE public.gadai_applications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_number       TEXT UNIQUE NOT NULL,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  item_name        TEXT,
  item_category    TEXT,
  item_description TEXT,
  item_photo_url   TEXT,
  loan_amount      BIGINT NOT NULL,
  approved_amount  BIGINT,
  interest         BIGINT,
  platform_fee     BIGINT,
  net_disbursement BIGINT,
  total_repayment  BIGINT,
  extension_fee    BIGINT,
  bank_code        TEXT,
  account_number   TEXT,
  account_name     TEXT,
  pickup_address   TEXT,
  pickup_schedule  TIMESTAMPTZ,
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending','review','revision','approved','rejected',
                                     'waiting_pickup','picked_up','received','active',
                                     'due','extended','overdue','completed','forfeited')),
  staff_notes      TEXT,
  admin_notes      TEXT,
  revision_note    TEXT,
  suggested_amount BIGINT,
  reviewed_by      UUID REFERENCES public.profiles(id),
  approved_by      UUID REFERENCES public.profiles(id),
  due_date         DATE,
  extended_until   DATE,
  extension_count  INTEGER DEFAULT 0,
  disbursed_at     TIMESTAMPTZ,
  disbursement_ref TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PICKUP SCHEDULES
-- ============================================================
CREATE TABLE public.pickup_schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gadai_id        UUID REFERENCES public.gadai_applications(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ,
  address         TEXT,
  assigned_staff  UUID REFERENCES public.profiles(id),
  status          TEXT DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','in_transit','completed','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COLLATERAL ITEMS (Warehouse)
-- ============================================================
CREATE TABLE public.collateral_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gadai_id         UUID REFERENCES public.gadai_applications(id) ON DELETE SET NULL,
  inventory_code   TEXT UNIQUE,
  item_name        TEXT,
  category         TEXT,
  condition        TEXT,
  description      TEXT,
  photo_url        TEXT,
  estimated_value  BIGINT,
  storage_location TEXT,
  status           TEXT DEFAULT 'stored'
                   CHECK (status IN ('stored','active','returned','forfeited','damaged')),
  received_at      TIMESTAMPTZ DEFAULT NOW(),
  returned_at      TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  loan_id                 UUID REFERENCES public.loans(id) ON DELETE SET NULL,
  gadai_id                UUID REFERENCES public.gadai_applications(id) ON DELETE SET NULL,
  schedule_id             UUID REFERENCES public.loan_schedules(id) ON DELETE SET NULL,
  amount                  BIGINT NOT NULL,
  payment_type            TEXT DEFAULT 'repayment'
                          CHECK (payment_type IN ('repayment','extension','late_fee','refund','disbursement')),
  payment_method          TEXT DEFAULT 'midtrans',
  midtrans_order_id       TEXT UNIQUE,
  midtrans_transaction_id TEXT,
  midtrans_status         TEXT,
  midtrans_payment_type   TEXT,
  transfer_ref            TEXT,
  proof_url               TEXT,
  notes                   TEXT,
  status                  TEXT DEFAULT 'pending'
                          CHECK (status IN ('pending','settlement','capture','verification',
                                            'confirmed','failed','refunded','cancel','expire')),
  verified_by             UUID REFERENCES public.profiles(id),
  verification_notes      TEXT,
  verified_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE public.documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  doc_type      TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_name     TEXT,
  file_size     INTEGER,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLACKLISTS
-- ============================================================
CREATE TABLE public.blacklists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  type        TEXT DEFAULT 'overdue'
              CHECK (type IN ('overdue','fraud','default','other')),
  is_active   BOOLEAN DEFAULT TRUE,
  added_by    UUID REFERENCES public.profiles(id),
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  removed_by  UUID REFERENCES public.profiles(id),
  removed_at  TIMESTAMPTZ
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  metadata    JSONB DEFAULT '{}',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  old_value    JSONB DEFAULT '{}',
  new_value    JSONB DEFAULT '{}',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_loans_user_id      ON public.loans(user_id);
CREATE INDEX idx_loans_status       ON public.loans(status);
CREATE INDEX idx_loans_ref          ON public.loans(ref_number);
CREATE INDEX idx_gadai_user_id      ON public.gadai_applications(user_id);
CREATE INDEX idx_gadai_status       ON public.gadai_applications(status);
CREATE INDEX idx_payments_user_id   ON public.payments(user_id);
CREATE INDEX idx_payments_loan_id   ON public.payments(loan_id);
CREATE INDEX idx_payments_midtrans  ON public.payments(midtrans_order_id);
CREATE INDEX idx_notif_user         ON public.notifications(user_id);
CREATE INDEX idx_notif_read         ON public.notifications(is_read);
CREATE INDEX idx_audit_actor        ON public.audit_logs(actor_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gadai_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collateral_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_schedules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_schedules    ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- PROFILES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR get_user_role() IN ('staff','admin','founder'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL
  USING (get_user_role() IN ('admin','founder'));

-- LOANS
CREATE POLICY "loans_select" ON public.loans FOR SELECT
  USING (auth.uid() = user_id OR get_user_role() IN ('staff','admin','founder'));
CREATE POLICY "loans_insert" ON public.loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loans_update" ON public.loans FOR UPDATE
  USING (get_user_role() IN ('staff','admin','founder'));

-- GADAI
CREATE POLICY "gadai_select" ON public.gadai_applications FOR SELECT
  USING (auth.uid() = user_id OR get_user_role() IN ('staff','admin','founder'));
CREATE POLICY "gadai_insert" ON public.gadai_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gadai_update" ON public.gadai_applications FOR UPDATE
  USING (get_user_role() IN ('staff','admin','founder'));

-- PAYMENTS
CREATE POLICY "payments_select" ON public.payments FOR SELECT
  USING (auth.uid() = user_id OR get_user_role() IN ('staff','admin','founder'));
CREATE POLICY "payments_insert" ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id OR get_user_role() IN ('admin','founder'));
CREATE POLICY "payments_update" ON public.payments FOR UPDATE
  USING (get_user_role() IN ('staff','admin','founder') OR auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "notifs_select" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR get_user_role() IN ('admin','founder'));
CREATE POLICY "notifs_update" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "notifs_insert" ON public.notifications FOR INSERT
  WITH CHECK (get_user_role() IN ('staff','admin','founder') OR auth.uid() = user_id);

-- KYC
CREATE POLICY "kyc_select" ON public.kyc_documents FOR SELECT
  USING (auth.uid() = user_id OR get_user_role() IN ('staff','admin','founder'));
CREATE POLICY "kyc_insert" ON public.kyc_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kyc_update" ON public.kyc_documents FOR UPDATE
  USING (auth.uid() = user_id OR get_user_role() IN ('staff','admin','founder'));

-- DOCUMENTS
CREATE POLICY "docs_select" ON public.documents FOR SELECT
  USING (auth.uid() = user_id OR get_user_role() IN ('staff','admin','founder'));
CREATE POLICY "docs_insert" ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- BLACKLIST
CREATE POLICY "blacklist_select" ON public.blacklists FOR SELECT
  USING (get_user_role() IN ('staff','admin','founder'));
CREATE POLICY "blacklist_manage" ON public.blacklists FOR ALL
  USING (get_user_role() IN ('admin','founder'));

-- AUDIT LOGS
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT
  USING (get_user_role() IN ('admin','founder'));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- COLLATERAL
CREATE POLICY "collateral_manage" ON public.collateral_items FOR ALL
  USING (get_user_role() IN ('staff','admin','founder'));

-- PICKUP
CREATE POLICY "pickup_manage" ON public.pickup_schedules FOR ALL
  USING (get_user_role() IN ('staff','admin','founder'));

-- LOAN SCHEDULES
CREATE POLICY "schedules_select" ON public.loan_schedules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.loans
    WHERE id = loan_schedules.loan_id
    AND (user_id = auth.uid() OR get_user_role() IN ('staff','admin','founder'))
  ));
CREATE POLICY "schedules_manage" ON public.loan_schedules FOR ALL
  USING (get_user_role() IN ('staff','admin','founder'));

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gadai_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
