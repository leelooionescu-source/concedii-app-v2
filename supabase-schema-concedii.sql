-- =============================================
-- Schema Concedii App - PostgreSQL (Supabase)
-- Rulează în același proiect Supabase ca management-hg
-- =============================================

-- Tabel angajati
CREATE TABLE IF NOT EXISTS angajati (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nume TEXT NOT NULL,
  prenume TEXT NOT NULL,
  departament TEXT DEFAULT '',
  data_angajare DATE,
  zile_co_an INTEGER DEFAULT 21,
  activ BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel concedii
CREATE TABLE IF NOT EXISTS concedii (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  angajat_id UUID NOT NULL REFERENCES angajati(id) ON DELETE CASCADE,
  tip TEXT NOT NULL DEFAULT 'CO' CHECK (tip IN ('CO', 'MEDICAL', 'FARA_PLATA', 'EVENIMENT')),
  data_start DATE NOT NULL,
  data_sfarsit DATE NOT NULL,
  zile_lucratoare INTEGER NOT NULL,
  observatii TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexuri
CREATE INDEX IF NOT EXISTS idx_concedii_angajat ON concedii(angajat_id);
CREATE INDEX IF NOT EXISTS idx_concedii_data_start ON concedii(data_start);
CREATE INDEX IF NOT EXISTS idx_concedii_tip ON concedii(tip);
CREATE INDEX IF NOT EXISTS idx_angajati_activ ON angajati(activ);

-- Trigger updated_at (reutilizeaza functia existenta din management-hg)
-- Daca functia nu exista, o cream:
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_angajati_updated
  BEFORE UPDATE ON angajati
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_concedii_updated
  BEFORE UPDATE ON concedii
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security)
ALTER TABLE angajati ENABLE ROW LEVEL SECURITY;
ALTER TABLE concedii ENABLE ROW LEVEL SECURITY;

CREATE POLICY "angajati_select" ON angajati FOR SELECT TO authenticated USING (true);
CREATE POLICY "angajati_insert" ON angajati FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "angajati_update" ON angajati FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "angajati_delete" ON angajati FOR DELETE TO authenticated USING (true);

CREATE POLICY "concedii_select" ON concedii FOR SELECT TO authenticated USING (true);
CREATE POLICY "concedii_insert" ON concedii FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "concedii_update" ON concedii FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "concedii_delete" ON concedii FOR DELETE TO authenticated USING (true);
