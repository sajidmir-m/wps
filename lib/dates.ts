export function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

export function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function trainingDates(startDate: string, durationDays: number) {
  return Array.from({ length: durationDays }, (_, i) => addDays(startDate, i));
}

export function dayNumber(startDate: string, date: string) {
  const [ys, ms, ds] = startDate.split("-").map(Number);
  const [ye, me, de] = date.split("-").map(Number);
  const start = new Date(ys, ms - 1, ds).getTime();
  const end = new Date(ye, me - 1, de).getTime();
  return Math.floor((end - start) / 86400000) + 1;
}
