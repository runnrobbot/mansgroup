-- Fix gadai_applications status CHECK constraint: add 'disbursed'
-- The disbursement flow sets status to 'disbursed' after warehouse receives item,
-- but 'disbursed' was missing from the allowed statuses list.

ALTER TABLE public.gadai_applications
  DROP CONSTRAINT IF EXISTS gadai_applications_status_check;

ALTER TABLE public.gadai_applications
  ADD CONSTRAINT gadai_applications_status_check
  CHECK (status IN (
    'pending','review','revision','approved','rejected',
    'waiting_pickup','picked_up','received','disbursed',
    'active','due','extended','overdue','completed','forfeited'
  ));
