// Utilities for week/date handling. Semana começa DOMINGO.
// Todas as datas manipuladas como YYYY-MM-DD (ISO) em UTC para evitar drift.

export type ISODate = string; // "YYYY-MM-DD"

export function toISO(d: Date): ISODate {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

// Dia da semana: 0=domingo ... 6=sábado
export function dow(s: ISODate): number {
  return fromISO(s).getUTCDay();
}

// Retorna o domingo da semana que contém "s"
export function weekStart(s: ISODate): ISODate {
  const d = fromISO(s);
  const wd = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - wd);
  return toISO(d);
}

// Gera array [dom, seg, ter, qua, qui, sex, sab] de uma semana a partir do domingo
export function weekDays(sunday: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

export function formatBR(s: ISODate): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DIAS_SEMANA_LONGO = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
