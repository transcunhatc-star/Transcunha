-- ============================================================
-- ESQUEMA COMPLETO DE BANCO DE DADOS - TRANSCUNHA (gushnsrqyjziidhylrsn)
-- Execute este script no SQL Editor do Supabase Dashboard:
-- https://supabase.com/dashboard/project/gushnsrqyjziidhylrsn/sql/new
-- ============================================================

-- 1. Tabela app_users (Usuários do Sistema)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  profile TEXT NOT NULL,
  password TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  client_id TEXT,
  branch_id TEXT,
  phone TEXT,
  require_password_change BOOLEAN DEFAULT false,
  password_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que colunas adicionais existam em bancos já criados
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Tabela clients (Clientes)
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  payment_method TEXT,
  payment_term TEXT,
  requires_external_order BOOLEAN DEFAULT false,
  requires_scheduling BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela owners (Proprietários)
CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  pix_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela drivers (Motoristas)
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  cnh TEXT,
  cnh_category TEXT,
  phone TEXT,
  owner_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela vehicles (Veículos)
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate TEXT NOT NULL,
  type TEXT,
  capacity NUMERIC,
  owner_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela products (Produtos)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'TON',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabela cargos (Cargas)
CREATE TABLE IF NOT EXISTS cargos (
  id TEXT PRIMARY KEY,
  sequence_id INT,
  client_id TEXT,
  product_id TEXT,
  origin TEXT,
  origin_location TEXT,
  origin_map_link TEXT,
  destination TEXT,
  destination_location TEXT,
  destination_map_link TEXT,
  total_volume NUMERIC,
  scheduled_volume NUMERIC DEFAULT 0,
  loaded_volume NUMERIC DEFAULT 0,
  company_freight_value_per_ton NUMERIC,
  driver_freight_value_per_ton NUMERIC,
  driver_freight_value_per_ton_pj NUMERIC,
  driver_freight_value_per_ton_pf NUMERIC,
  has_icms BOOLEAN DEFAULT false,
  icms_percentage NUMERIC,
  requires_scheduling BOOLEAN DEFAULT false,
  type TEXT,
  status TEXT DEFAULT 'Em andamento',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by_id TEXT,
  history JSONB DEFAULT '[]'::jsonb,
  loading_start_date TEXT,
  loading_deadline TEXT,
  allowed_vehicle_types JSONB,
  freight_legs JSONB,
  daily_schedule JSONB,
  observations TEXT,
  attachments JSONB,
  origin_coords JSONB,
  destination_coords JSONB,
  salesperson_name TEXT,
  salesperson_commission_per_ton NUMERIC,
  branch_id TEXT,
  destinations JSONB,
  external_order TEXT,
  tms_batch_number TEXT
);

-- Migrações de colunas em cargos para bancos já existentes
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS sequence_id INT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS origin_location TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS origin_map_link TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS destination_location TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS destination_map_link TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS scheduled_volume NUMERIC DEFAULT 0;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS company_freight_value_per_ton NUMERIC;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS driver_freight_value_per_ton NUMERIC;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS driver_freight_value_per_ton_pj NUMERIC;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS driver_freight_value_per_ton_pf NUMERIC;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS has_icms BOOLEAN DEFAULT false;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS icms_percentage NUMERIC;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS requires_scheduling BOOLEAN DEFAULT false;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS created_by_id TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS loading_start_date TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS loading_deadline TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS allowed_vehicle_types JSONB;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS freight_legs JSONB;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS daily_schedule JSONB;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS origin_coords JSONB;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS destination_coords JSONB;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS salesperson_name TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS salesperson_commission_per_ton NUMERIC;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS destinations JSONB;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS external_order TEXT;
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS tms_batch_number TEXT;

-- 8. Tabela shipments (Embarques)
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  cargo_id TEXT,
  driver_name TEXT,
  driver_contact TEXT,
  driver_cpf TEXT,
  embarcador_id TEXT,
  horse_plate TEXT,
  trailer1_plate TEXT,
  trailer2_plate TEXT,
  trailer3_plate TEXT,
  shipment_tonnage NUMERIC,
  driver_freight_value NUMERIC,
  driver_freight_rate_snapshot NUMERIC,
  company_freight_rate_snapshot NUMERIC,
  status TEXT DEFAULT 'Pré-cadastro',
  scheduled_date TEXT,
  scheduled_time TEXT,
  arrival_time TEXT,
  bank_details TEXT,
  documents JSONB,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by_id TEXT,
  driver_references TEXT,
  owner_contact TEXT,
  status_history JSONB,
  vehicle_tag TEXT,
  vehicle_set_type TEXT,
  vehicle_body_type TEXT,
  toll_value NUMERIC,
  balance_to_receive_value NUMERIC,
  discount_value NUMERIC,
  net_balance_value NUMERIC,
  unloaded_tonnage NUMERIC,
  branch_id TEXT,
  cancellation_reason TEXT
);

-- Migrações de colunas em shipments
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS embarcador_id TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS horse_plate TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS trailer1_plate TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS trailer2_plate TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS trailer3_plate TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS driver_freight_value NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS driver_freight_rate_snapshot NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS company_freight_rate_snapshot NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS scheduled_date TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS arrival_time TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bank_details TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS documents JSONB;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by_id TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS driver_references TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS owner_contact TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS status_history JSONB;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vehicle_tag TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vehicle_set_type TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vehicle_body_type TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS toll_value NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS balance_to_receive_value NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS discount_value NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS net_balance_value NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS unloaded_tonnage NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 9. Tabela branches (Filiais)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Tabela tickets (Chamados de Suporte)
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Aberto',
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Tabela app_settings (Configurações Gerais)
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_logo TEXT,
  theme_image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 12. Tabela profile_permissions (Permissões de Perfis)
CREATE TABLE IF NOT EXISTS profile_permissions (
  id INT PRIMARY KEY DEFAULT 1,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT single_row_permissions CHECK (id = 1)
);

-- 13. Tabela shipment_locks (Bloqueios Operacionais)
CREATE TABLE IF NOT EXISTS shipment_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes')
);

-- Desabilitar RLS em todas as tabelas do schema public no Supabase
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY;';
  END LOOP;
END $$;

ALTER TABLE IF EXISTS app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS owners DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cargos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shipment_locks DISABLE ROW LEVEL SECURITY;

-- Inserir / Atualizar Usuários Iniciais (Admin e DL Logística)
INSERT INTO app_users (id, email, name, profile, password, active, require_password_change)
VALUES 
(
  gen_random_uuid(),
  'admin',
  'Administrador do Sistema',
  'Diretor',
  'mauricio15',
  true,
  false
),
(
  gen_random_uuid(),
  'admin@transcunha.com.br',
  'Administrador do Sistema',
  'Diretor',
  'mauricio15',
  true,
  false
),
(
  gen_random_uuid(),
  'dllogtransporte15@gmail.com',
  'DL Logística',
  'Diretor',
  'ANITA2020',
  true,
  false
)
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  profile = EXCLUDED.profile,
  active = true,
  require_password_change = false,
  password_updated_at = NOW();
