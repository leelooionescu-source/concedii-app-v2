import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;
  if (request.nextUrl.searchParams.get("secret") === expected) return true;
  return false;
}

function todayInRomania(): { iso: string; mmdd: string } {
  const fmt = new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return { iso: `${y}-${m}-${d}`, mmdd: `${m}-${d}` };
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { iso: today, mmdd } = todayInRomania();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const [concediiRes, angajatiRes, subsRes] = await Promise.all([
    supabase
      .from("concedii")
      .select("*, angajati(prenume, nume)")
      .lte("data_start", today)
      .gte("data_sfarsit", today),
    supabase.from("angajati").select("prenume, nume, data_nastere").eq("activ", true),
    supabase.from("push_subscriptions").select("*"),
  ]);

  const concedii = concediiRes.data || [];
  const angajati = angajatiRes.data || [];
  const subs = subsRes.data || [];

  const inConcediu = concedii
    .map((c) => c.angajati && `${c.angajati.prenume} ${c.angajati.nume}`)
    .filter(Boolean) as string[];

  const aniversari = angajati
    .filter((a) => a.data_nastere && a.data_nastere.slice(5) === mmdd)
    .map((a) => `${a.prenume} ${a.nume}`);

  if (inConcediu.length === 0 && aniversari.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "Niciun eveniment azi" });
  }

  const lines: string[] = [];
  if (inConcediu.length > 0) lines.push(`In concediu: ${inConcediu.join(", ")}`);
  if (aniversari.length > 0) lines.push(`La multi ani: ${aniversari.join(", ")}!`);

  const title = aniversari.length > 0 && inConcediu.length === 0
    ? "🎂 Zi de nastere"
    : inConcediu.length > 0 && aniversari.length === 0
      ? "🏖️ Concediu azi"
      : "📅 Echipa PA - azi";

  const body = lines.join("\n");

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, tag: `daily-${today}`, url: "/" })
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const e = err as { statusCode?: number };
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          expiredEndpoints.push(s.endpoint);
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    cleaned: expiredEndpoints.length,
    title,
    body,
  });
}
