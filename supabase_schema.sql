-- CUIDADO: Este script reinicia as tabelas da aplicação.
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS simulations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 1. Tabela Companies
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT
);

-- 2. Tabela Profiles (Estende os usuários autenticados)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'member')),
    name TEXT,
    email TEXT,
    company_name TEXT,
    company_logo TEXT,
    subscription_status TEXT,
    plan_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela Units (Unidades de Medida)
CREATE TABLE units (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    conversion_factor NUMERIC NOT NULL DEFAULT 1,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE
);

-- 4. Tabela Suppliers (Fornecedores)
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rating NUMERIC DEFAULT 0,
    contact_email TEXT,
    salesperson TEXT,
    salesperson_phone TEXT,
    notes TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE
);

-- 5. Tabela Materials
CREATE TABLE materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Geral',
    base_unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
    ipi NUMERIC DEFAULT 0,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE
);

-- 6. Tabela Quotes (Cotações)
CREATE TABLE quotes (
    id TEXT PRIMARY KEY,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
    material_id TEXT REFERENCES materials(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
    price_unit NUMERIC NOT NULL,
    price_total NUMERIC NOT NULL,
    normalized_price_per_base_unit NUMERIC NOT NULL,
    freight TEXT CHECK (freight IN ('CIF', 'FOB')),
    delivery_days INTEGER NOT NULL,
    icms NUMERIC DEFAULT 0,
    ipi NUMERIC DEFAULT 0,
    status TEXT NOT NULL,
    payment_terms TEXT,
    attachments JSONB,
    notes TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela Simulations 
CREATE TABLE simulations (
    id TEXT PRIMARY KEY,
    material_id TEXT REFERENCES materials(id) ON DELETE CASCADE,
    target_margin NUMERIC DEFAULT 0,
    rows JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;

-- Políticas Compartilhadas (O usuário só vê dados da sua própria empresa)
CREATE POLICY "View same company units" ON units FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Edit same company units" ON units FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "View same company suppliers" ON suppliers FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Edit same company suppliers" ON suppliers FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "View same company materials" ON materials FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Edit same company materials" ON materials FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "View same company quotes" ON quotes FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Edit same company quotes" ON quotes FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "View same company simulations" ON simulations FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Edit same company simulations" ON simulations FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their own company" ON companies FOR SELECT USING ( id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) );
CREATE POLICY "Admins can update their company" ON companies FOR UPDATE USING ( id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'admin') );

CREATE POLICY "Users can view profiles in their company" ON profiles FOR SELECT USING ( company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()) OR id = auth.uid() );
CREATE POLICY "Admins can update profiles in their company" ON profiles FOR UPDATE USING ( company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'admin') OR id = auth.uid() );

-- ==========================================
-- RPC FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION remove_team_member(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles auth_user
    JOIN profiles target_user ON auth_user.company_id = target_user.company_id
    WHERE auth_user.id = auth.uid() 
      AND auth_user.role = 'admin'
      AND target_user.id = target_user_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Somente administradores da mesma empresa podem remover membros.';
  END IF;

  UPDATE profiles 
  SET company_id = NULL, role = 'member' 
  WHERE id = target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;