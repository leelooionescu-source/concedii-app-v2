import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Endpoint de migrare date din JSON (Supabase Storage) in PostgreSQL.
 * Ruleaza o singura data, apoi poate fi sters.
 * GET /api/migrate
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_KEY nu este setat in .env.local" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Fetch JSON files from Storage bucket
    const angajatiUrl = `${supabaseUrl}/storage/v1/object/public/concedii/angajati.json`;
    const concediiUrl = `${supabaseUrl}/storage/v1/object/public/concedii/concedii.json`;

    const [angajatiResp, concediiResp] = await Promise.all([
      fetch(angajatiUrl),
      fetch(concediiUrl),
    ]);

    if (!angajatiResp.ok) {
      return NextResponse.json({ error: "Nu s-a putut descarca angajati.json", status: angajatiResp.status }, { status: 500 });
    }
    if (!concediiResp.ok) {
      return NextResponse.json({ error: "Nu s-a putut descarca concedii.json", status: concediiResp.status }, { status: 500 });
    }

    const angajatiJson = await angajatiResp.json();
    const concediiJson = await concediiResp.json();

    // Map old integer IDs to new UUIDs
    const idMap = new Map<number, string>();

    // Insert angajati
    let angajatiCount = 0;
    for (const a of angajatiJson) {
      const { data, error } = await supabase.from("angajati").insert({
        nume: a.nume || "",
        prenume: a.prenume || "",
        zile_co_an: a.zile_co_an || 21,
        activ: a.activ !== false,
      }).select("id").single();

      if (error) {
        console.error("Eroare insert angajat:", error);
        continue;
      }
      if (data) {
        idMap.set(a.id, data.id);
        angajatiCount++;
      }
    }

    // Insert concedii
    let concediiCount = 0;
    for (const c of concediiJson) {
      const newAngajatId = idMap.get(c.angajat_id);
      if (!newAngajatId) {
        console.error("ID angajat negasit pentru concediu:", c.angajat_id);
        continue;
      }

      const { error } = await supabase.from("concedii").insert({
        angajat_id: newAngajatId,
        tip: c.tip || "CO",
        data_start: c.data_start,
        data_sfarsit: c.data_sfarsit,
        zile_lucratoare: c.zile_lucratoare || 0,
        observatii: c.observatii || "",
      });

      if (error) {
        console.error("Eroare insert concediu:", error);
        continue;
      }
      concediiCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Migrare completa: ${angajatiCount} angajati, ${concediiCount} concedii`,
      angajati: angajatiCount,
      concedii: concediiCount,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
