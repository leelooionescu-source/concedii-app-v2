import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format, addDays, differenceInDays, setYear } from "date-fns";

export async function GET() {
  const supabase = await createClient();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
  const an = now.getFullYear();
  const anStr = String(an);

  const notificari: { title: string; body: string; type: string }[] = [];

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
        type: "concediu",
      });
    }
    // Revine din concediu
    if (c.data_sfarsit === today && c.angajati?.activ) {
      notificari.push({
        title: "Revine din concediu",
        body: `${c.angajati.prenume} ${c.angajati.nume} revine maine la lucru`,
        type: "concediu",
      });
    }
  }

  // In concediu azi
  for (const c of concedii) {
    if (c.data_start <= today && c.data_sfarsit >= today && c.angajati?.activ) {
      notificari.push({
        title: "In concediu azi",
        body: `${c.angajati.prenume} ${c.angajati.nume} - ${c.tip}`,
        type: "concediu",
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
        type: "sold",
      });
    }
  }

  // Zile de nastere
  for (const a of angajati) {
    if (!a.data_nastere) continue;
    const bday = new Date(a.data_nastere);
    let nextBday = setYear(bday, an);
    if (nextBday < now && differenceInDays(now, nextBday) > 0) {
      nextBday = setYear(bday, an + 1);
    }
    const daysUntil = differenceInDays(nextBday, now);
    if (daysUntil === 0) {
      notificari.push({
        title: "Zi de nastere AZI!",
        body: `${a.prenume} ${a.nume} implineste ani azi!`,
        type: "birthday",
      });
    } else if (daysUntil === 1) {
      notificari.push({
        title: "Zi de nastere maine",
        body: `${a.prenume} ${a.nume} implineste ani maine`,
        type: "birthday",
      });
    } else if (daysUntil <= 7) {
      notificari.push({
        title: "Zi de nastere in curand",
        body: `${a.prenume} ${a.nume} — ${format(nextBday, "dd.MM")} (peste ${daysUntil} zile)`,
        type: "birthday",
      });
    }
  }

  return NextResponse.json(notificari);
}
