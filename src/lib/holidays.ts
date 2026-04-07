import { addDays, eachDayOfInterval, isWeekend, format } from "date-fns";

/**
 * Calculeaza data Pastelui Ortodox pentru un an dat (algoritm Meeus).
 * Convertire din calendar iulian la gregorian (+13 zile pt sec. 20-21).
 */
export function pasteOrtodox(an: number): Date {
  const a = an % 4;
  const b = an % 7;
  const c = an % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const luna = Math.floor((d + e + 114) / 31);
  const zi = ((d + e + 114) % 31) + 1;
  // Data in calendar iulian
  const julian = new Date(an, luna - 1, zi);
  // Convertire la gregorian (+13 zile)
  return addDays(julian, 13);
}

export interface Sarbatoare {
  data: Date;
  denumire: string;
}

/**
 * Returneaza lista de sarbatori legale Romania pentru un an dat.
 * Conform Codului Muncii Art. 139.
 */
export function sarbatoriLegale(an: number): Sarbatoare[] {
  const paste = pasteOrtodox(an);
  const vinereamare = addDays(paste, -2);
  const rusaliiD = addDays(paste, 49);
  const rusaliiL = addDays(paste, 50);

  return [
    { data: new Date(an, 0, 1), denumire: "Anul Nou" },
    { data: new Date(an, 0, 2), denumire: "Anul Nou (ziua 2)" },
    { data: new Date(an, 0, 24), denumire: "Ziua Unirii Principatelor Romane" },
    { data: vinereamare, denumire: "Vinerea Mare" },
    { data: paste, denumire: "Pastele Ortodox (Duminica)" },
    { data: addDays(paste, 1), denumire: "Pastele Ortodox (Luni)" },
    { data: new Date(an, 4, 1), denumire: "Ziua Muncii" },
    { data: new Date(an, 5, 1), denumire: "Ziua Copilului" },
    { data: rusaliiD, denumire: "Rusalii (Duminica)" },
    { data: rusaliiL, denumire: "Rusalii (Luni)" },
    { data: new Date(an, 7, 15), denumire: "Adormirea Maicii Domnului" },
    { data: new Date(an, 10, 30), denumire: "Sfantul Andrei" },
    { data: new Date(an, 11, 1), denumire: "Ziua Nationala a Romaniei" },
    { data: new Date(an, 11, 25), denumire: "Craciunul (ziua 1)" },
    { data: new Date(an, 11, 26), denumire: "Craciunul (ziua 2)" },
  ];
}

/**
 * Returneaza set de date ISO (sarbatori legale) pentru un an, pentru lookup rapid.
 */
export function getSarbatoriSet(an: number): Set<string> {
  return new Set(sarbatoriLegale(an).map((s) => format(s.data, "yyyy-MM-dd")));
}

/**
 * Calculeaza numarul de zile lucratoare intre doua date (inclusiv).
 * Exclude weekenduri si sarbatori legale.
 */
export function zileLucratoare(dataStart: Date, dataSfarsit: Date): number {
  if (dataStart > dataSfarsit) return 0;

  // Colectam sarbatorile pentru toti anii din interval
  const ani = new Set<number>();
  const days = eachDayOfInterval({ start: dataStart, end: dataSfarsit });
  for (const d of days) {
    ani.add(d.getFullYear());
  }

  const sarbatori = new Set<string>();
  for (const an of ani) {
    for (const s of getSarbatoriSet(an)) {
      sarbatori.add(s);
    }
  }

  let count = 0;
  for (const d of days) {
    if (!isWeekend(d) && !sarbatori.has(format(d, "yyyy-MM-dd"))) {
      count++;
    }
  }
  return count;
}

/**
 * Numele zilelor saptamanii in romana.
 */
const ZILE_SAPTAMANA = ["Duminica", "Luni", "Marti", "Miercuri", "Joi", "Vineri", "Sambata"];

export function numeZiSaptamana(data: Date): string {
  return ZILE_SAPTAMANA[data.getDay()];
}

/**
 * Numele lunilor in romana.
 */
const LUNI_NUME = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

export function numeLuna(luna: number): string {
  return LUNI_NUME[luna];
}
