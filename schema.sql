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
  require_password_change BOOLEAN DEFAULT false,
  password_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  client_id TEXT,
  client_name TEXT,
  product_id TEXT,
  product_name TEXT,
  origin_city TEXT,
  origin_state TEXT,
  destination_city TEXT,
  destination_state TEXT,
  total_volume NUMERIC,
  loaded_volume NUMERIC DEFAULT 0,
  freight_rate NUMERIC,
  status TEXT DEFAULT 'Em Andamento',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Tabela shipments (Embarques)
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  cargo_id TEXT,
  driver_id TEXT,
  driver_name TEXT,
  driver_cpf TEXT,
  driver_contact TEXT,
  vehicle_plate TEXT,
  trailer_plate TEXT,
  volume NUMERIC,
  shipment_tonnage NUMERIC,
  agreed_rate NUMERIC,
  status TEXT DEFAULT 'Pré-cadastro',
  created_at TIMESTAMPTZ DEFAULT now()
);

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

-- Desabilitar RLS em tabelas para uso da API anon do app
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE owners DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE cargos DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE profile_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_locks DISABLE ROW LEVEL SECURITY;

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
