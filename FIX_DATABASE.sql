-- 1. Cria o Bucket de Anexos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shipment_attachments', 'shipment_attachments', true) 
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage') THEN CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'shipment_attachments'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert' AND tablename = 'objects' AND schemaname = 'storage') THEN CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shipment_attachments'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Update' AND tablename = 'objects' AND schemaname = 'storage') THEN CREATE POLICY "Public Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'shipment_attachments'); END IF;
END $$;

-- 2. Adiciona as colunas faltando nos Proprietários e Motoristas
ALTER TABLE owners ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS bank_details TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS restriction_reason TEXT;

-- 3. Adiciona as colunas faltando nos Veículos
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS set_type TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS body_type TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_id TEXT;

-- 4. Adiciona as colunas faltando nos Embarques
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS antt_owner_identifier TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS advance_percentage NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS advance_value NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS route TEXT;
