import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format, addDays } from "date-fns";

export async function GET() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const an = new Date().getFullYear();
  const anStr = String(an);

  const notificari: { title: string; body: string }[] = [];

  const [concediiRes, angajatiRes] = await Promise.all([
    supabase.from("concedii").select("*, angajati(*)"),
    supabase.from("angajati").select("*").eq("activ", true),
  ]);

  const concedii = concediiRes.data || [];
  const angajati = angajatiRes.data || [];

  // Concediu incepe maine
  for (const c of concedii) {
    if (c.data_start === tomorrow && c.angajati?.activ) {
      notificari.push({
        title: "Concediu incepe maine",
        body: `${c.angajati.prenume} ${c.angajati.nume} - ${c.tip} (${c.zile_lucratoare} zile)`,
      });
    }
    // Revine din concediu
    if (c.data_sfarsit === today && c.angajati?.activ) {
      notificari.push({
        title: "Revine din concediu",
        body: `${c.angajati.prenume} ${c.angajati.nume} revine maine la lucru`,
      });
    }
  }

  // Sold CO scazut
  for (const a of angajati) {
    const co = concedii
      .filter((c) => c.angajat_id === a.id && c.tip === "CO" && c.data_start?.startsWith(anStr))
      .reduce((sum: number, c: { zile_lucratoare: number }) => sum + c.zile_lucratoare, 0);
    const ramas = a.zile_co_an - co;
    if (ramas > 0 && ramas <= 3) {
      notificari.push({
        title: "Sold CO scazut",
        body: `${a.prenume} ${a.nume} mai are doar ${ramas} zile CO`,
      });
    }
  }

  return NextResponse.json(notificari);
}
