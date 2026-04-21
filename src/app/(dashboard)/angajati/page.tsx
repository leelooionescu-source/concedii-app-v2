"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, Search, Upload, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { validate, angajatSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity-log";
import type { Angajat } from "@/lib/types";

const emptyForm = {
  nume: "",
  prenume: "",
  zile_co_an: 21,
  data_nastere: "",
  activ: true,
};

const LUNI_RO: Record<string, string> = {
  ianuarie: "01", februarie: "02", martie: "03", aprilie: "04",
  mai: "05", iunie: "06", iulie: "07", august: "08",
  septembrie: "09", octombrie: "10", noiembrie: "11", decembrie: "12",
};

const AVATAR_COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
  "#ec4899", "#06b6d4", "#ef4444", "#14b8a6",
  "#f97316", "#6366f1", "#84cc16", "#a855f7",
];

function getInitials(prenume: string, nume: string) {
  return `${prenume.charAt(0)}${nume.charAt(0)}`.toUpperCase();
}

function getAvatarColor(prenume: string, nume: string) {
  const s = `${prenume}${nume}`;
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function daysUntilBirthday(dataNastere: string | null): number | null {
  if (!dataNastere) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bday = new Date(dataNastere);
  let next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export default function AngajatiPage() {
  const supabase = createClient();
  const [angajati, setAngajati] = useState<Angajat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("angajati").select("*").order("activ", { ascending: false }).order("nume");
    setAngajati(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = angajati.filter((a) => {
    const q = search.toLowerCase();
    return `${a.prenume} ${a.nume}`.toLowerCase().includes(q);
  });

  const stats = useMemo(() => {
    const activi = angajati.filter((a) => a.activ).length;
    const inactivi = angajati.length - activi;
    const aniversari = angajati.filter((a) => {
      const d = daysUntilBirthday(a.data_nastere);
      return d !== null && d <= 7;
    }).length;
    return { activi, inactivi, aniversari };
  }, [angajati]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(a: Angajat) {
    setEditId(a.id);
    setForm({
      nume: a.nume,
      prenume: a.prenume,
      zile_co_an: a.zile_co_an,
      data_nastere: a.data_nastere || "",
      activ: a.activ,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const v = validate(angajatSchema, form);
    if (!v.success) return;

    if (editId) {
      const { error } = await supabase.from("angajati").update(v.data).eq("id", editId);
      if (error) { toast.error("Eroare la actualizare"); return; }
      logActivity("update", "angajati", editId, `${form.prenume} ${form.nume}`);
      toast.success("Angajat actualizat");
    } else {
      const { error } = await supabase.from("angajati").insert(v.data);
      if (error) { toast.error("Eroare la adaugare"); return; }
      logActivity("create", "angajati", null, `${form.prenume} ${form.nume}`);
      toast.success("Angajat adaugat");
    }
    setDialogOpen(false);
    fetchData();
  }

  const importRef = useRef<HTMLInputElement>(null);

  async function handleImportBirthdays(file: File) {
    const XLSX = (await import("xlsx")).default;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const persoana = String(rows[i][0] || "").trim();
      const lunaRaw = String(rows[i][1] || "").trim().toLowerCase();
      if (!persoana || !lunaRaw) continue;

      const m = lunaRaw.match(/^(\d{1,2})\s+(\w+)/);
      if (!m) { errors.push(`Rand ${i + 1}: format invalid "${lunaRaw}"`); continue; }
      const day = m[1].padStart(2, "0");
      const monthStr = LUNI_RO[m[2]];
      if (!monthStr) { errors.push(`Rand ${i + 1}: luna necunoscuta "${m[2]}"`); continue; }
      const dateStr = `2000-${monthStr}-${day}`;

      const parts = persoana.toUpperCase().split(/\s+/);
      const match = angajati.find((a) => {
        const numeUp = a.nume.toUpperCase();
        const prenumeUp = a.prenume.toUpperCase();
        return parts.some((p) => p === numeUp) && parts.some((p) => p === prenumeUp);
      });

      if (!match) {
        notFound++;
        errors.push(`Rand ${i + 1}: "${persoana}" negasit`);
        continue;
      }

      const { error } = await supabase.from("angajati").update({ data_nastere: dateStr }).eq("id", match.id);
      if (error) { errors.push(`Rand ${i + 1}: eroare DB pentru "${persoana}"`); continue; }
      updated++;
    }

    fetchData();
    toast.success(`Import finalizat: ${updated} actualizati, ${notFound} negasiti`);
    if (errors.length > 0) {
      console.log("Import errors:", errors);
    }
  }

  async function handleDelete(a: Angajat) {
    if (!confirm(`Stergi angajatul ${a.prenume} ${a.nume}? Toate concediile asociate vor fi sterse.`)) return;
    const { error } = await supabase.from("angajati").delete().eq("id", a.id);
    if (error) { toast.error("Eroare la stergere"); return; }
    logActivity("delete", "angajati", a.id, `${a.prenume} ${a.nume}`);
    toast.success("Angajat sters");
    fetchData();
  }

  return (
    <>
      <div className="page-header">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="page-title"><Users className="h-5 w-5" /> Echipa PA</h1>
          <div className="flex gap-2 flex-wrap">
            <span className="stat-pill activ"><span className="dot" /> {stats.activi} activi</span>
            {stats.inactivi > 0 && (
              <span className="stat-pill inactiv"><span className="dot" /> {stats.inactivi} inactivi</span>
            )}
            {stats.aniversari > 0 && (
              <span className="stat-pill bday">
                <Cake className="h-3.5 w-3.5" /> {stats.aniversari} {stats.aniversari === 1 ? "aniversare" : "aniversari"} saptamana asta
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-add" onClick={() => importRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import zile nastere
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportBirthdays(f); e.target.value = ""; }} />
          <button className="btn-add" onClick={openCreate}><Plus className="h-4 w-4" /> Adauga</button>
        </div>
      </div>

      <div className="search-bar">
        <Input
          placeholder="Cauta angajat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-search"><Search className="h-4 w-4" /> Cauta</button>
      </div>

      <div className="content-card">
        <table className="app-table">
          <thead>
            <tr>
              <th className="col-nr th-uppercase">#</th>
              <th className="th-uppercase">Angajat</th>
              <th className="th-uppercase">Data nastere</th>
              <th className="th-uppercase" style={{ textAlign: "center" }}>Zile CO/an</th>
              <th className="th-uppercase" style={{ textAlign: "center" }}>Status</th>
              <th className="th-uppercase" style={{ textAlign: "center" }}>Actiuni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Se incarca...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Niciun angajat gasit</td></tr>
            ) : filtered.map((a, i) => {
              const days = daysUntilBirthday(a.data_nastere);
              const bdaySoon = days !== null && days <= 7;
              return (
                <tr key={a.id} className={bdaySoon ? "bday-soon" : ""}>
                  <td className="col-nr">{i + 1}</td>
                  <td>
                    <div className="person">
                      <div className="avatar" style={{ background: getAvatarColor(a.prenume, a.nume) }}>
                        {getInitials(a.prenume, a.nume)}
                      </div>
                      <span className="col-bold">{a.prenume} {a.nume}</span>
                    </div>
                  </td>
                  <td>
                    {a.data_nastere ? (
                      <span className={bdaySoon ? "bday-cell soon" : "bday-cell"}>
                        {bdaySoon && <Cake className="h-4 w-4" />}
                        {new Date(a.data_nastere).toLocaleDateString("ro-RO", { day: "2-digit", month: "long" })}
                        {bdaySoon && (
                          <small style={{ fontWeight: 500 }}>
                            {days === 0 ? "(azi!)" : days === 1 ? "(maine)" : `(peste ${days} zile)`}
                          </small>
                        )}
                      </span>
                    ) : "-"}
                  </td>
                  <td style={{ textAlign: "center" }}><span className="co-pill">{a.zile_co_an}</span></td>
                  <td style={{ textAlign: "center" }}>
                    <span className={a.activ ? "badge-activ-new" : "badge-inactiv-new"}>
                      {a.activ ? "Activ" : "Inactiv"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div className="flex items-center justify-center gap-1">
                      <button className="btn-action btn-action-edit" onClick={() => openEdit(a)} title="Editeaza">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button className="btn-action btn-action-delete" onClick={() => handleDelete(a)} title="Sterge">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dialog adauga/editeaza */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editeaza angajat" : "Adauga angajat"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prenume</Label>
                <Input value={form.prenume} onChange={(e) => setForm({ ...form, prenume: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nume</Label>
                <Input value={form.nume} onChange={(e) => setForm({ ...form, nume: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Zile CO/an</Label>
                <Input type="number" min={1} max={50} value={form.zile_co_an} onChange={(e) => setForm({ ...form, zile_co_an: parseInt(e.target.value) || 21 })} />
              </div>
              <div className="space-y-2">
                <Label>Data nastere</Label>
                <Input type="date" value={form.data_nastere} onChange={(e) => setForm({ ...form, data_nastere: e.target.value })} />
              </div>
            </div>
            {editId && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activ"
                  checked={form.activ}
                  onChange={(e) => setForm({ ...form, activ: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="activ">Activ</Label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Anuleaza</Button>
              <Button onClick={handleSave}>{editId ? "Salveaza" : "Adauga"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
