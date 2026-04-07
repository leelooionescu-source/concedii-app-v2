-- Drop existing policies (authenticated only)
DROP POLICY IF EXISTS "angajati_select" ON angajati;
DROP POLICY IF EXISTS "angajati_insert" ON angajati;
DROP POLICY IF EXISTS "angajati_update" ON angajati;
DROP POLICY IF EXISTS "angajati_delete" ON angajati;

DROP POLICY IF EXISTS "concedii_select" ON concedii;
DROP POLICY IF EXISTS "concedii_insert" ON concedii;
DROP POLICY IF EXISTS "concedii_update" ON concedii;
DROP POLICY IF EXISTS "concedii_delete" ON concedii;

-- Create new policies for anon + authenticated
CREATE POLICY "angajati_select" ON angajati FOR SELECT USING (true);
CREATE POLICY "angajati_insert" ON angajati FOR INSERT WITH CHECK (true);
CREATE POLICY "angajati_update" ON angajati FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "angajati_delete" ON angajati FOR DELETE USING (true);

CREATE POLICY "concedii_select" ON concedii FOR SELECT USING (true);
CREATE POLICY "concedii_insert" ON concedii FOR INSERT WITH CHECK (true);
CREATE POLICY "concedii_update" ON concedii FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "concedii_delete" ON concedii FOR DELETE USING (true);
