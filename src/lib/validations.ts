import { z } from "zod";
import { toast } from "sonner";

export const loginSchema = z.object({
  email: z.string().email("Adresa de email invalida"),
  password: z.string().min(8, "Parola trebuie sa aiba minim 8 caractere"),
});

export const angajatSchema = z.object({
  nume: z.string().min(2, "Numele trebuie sa aiba minim 2 caractere").max(100, "Numele nu poate depasi 100 caractere"),
  prenume: z.string().min(2, "Prenumele trebuie sa aiba minim 2 caractere").max(100, "Prenumele nu poate depasi 100 caractere"),
  departament: z.string().max(100, "Departamentul nu poate depasi 100 caractere").optional().or(z.literal("")),
  zile_co_an: z.number().min(1, "Minim 1 zi").max(50, "Maxim 50 zile"),
  data_angajare: z.string().optional().or(z.literal("")),
  activ: z.boolean(),
});

export const concediuSchema = z.object({
  angajat_id: z.string().min(1, "Selecteaza un angajat"),
  tip: z.enum(["CO", "MEDICAL", "FARA_PLATA", "EVENIMENT"]),
  data_start: z.string().min(1, "Data start este obligatorie"),
  data_sfarsit: z.string().min(1, "Data sfarsit este obligatorie"),
  observatii: z.string().max(500, "Observatiile nu pot depasi 500 caractere").optional().or(z.literal("")),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message || "Date invalide";
    toast.error(firstError);
    return { success: false };
  }
  return { success: true, data: result.data };
}
