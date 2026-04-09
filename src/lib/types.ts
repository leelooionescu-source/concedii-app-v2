export interface Angajat {
  id: string;
  nume: string;
  prenume: string;
  departament: string;
  data_angajare: string | null;
  data_nastere: string | null;
  zile_co_an: number;
  activ: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Concediu {
  id: string;
  angajat_id: string;
  tip: "CO" | "MEDICAL" | "FARA_PLATA" | "EVENIMENT";
  data_start: string;
  data_sfarsit: string;
  zile_lucratoare: number;
  observatii: string;
  created_at?: string;
  updated_at?: string;
  angajati?: Angajat;
}

export const TIPURI_CONCEDIU: Record<string, string> = {
  CO: "Concediu de odihna",
  MEDICAL: "Concediu medical",
  FARA_PLATA: "Concediu fara plata",
  EVENIMENT: "Eveniment (casatorie/deces/nastere)",
};

export const TIP_BADGE_COLORS: Record<string, string> = {
  CO: "bg-blue-500 text-white",
  MEDICAL: "bg-yellow-500 text-white",
  FARA_PLATA: "bg-gray-500 text-white",
  EVENIMENT: "bg-cyan-500 text-white",
};
