import type { AttendanceStatus } from "./types";

export type StudentStats = {
  present: number;
  absent: number;
  late: number;
  marked: number;
  percent: number;
  streak: number;
  continuous: boolean;
};

export function computeStats(
  records: { date: string; status: AttendanceStatus }[],
): StudentStats {
  const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : 1));

  let present = 0;
  let absent = 0;
  let late = 0;

  for (const record of sorted) {
    if (record.status === "PRESENT") present += 1;
    else if (record.status === "ABSENT") absent += 1;
    else if (record.status === "LATE") late += 1;
  }

  const marked = present + absent + late;
  const attended = present + late;
  const percent = marked === 0 ? 0 : Math.round((attended / marked) * 1000) / 10;

  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const status = sorted[i].status;
    if (status === "PRESENT" || status === "LATE") streak += 1;
    else break;
  }

  const continuous = marked > 0 && absent === 0;

  return { present, absent, late, marked, percent, streak, continuous };
}

export function statusLabel(status?: AttendanceStatus | null) {
  if (status === "PRESENT") return "Present";
  if (status === "ABSENT") return "Absent";
  if (status === "LATE") return "Late";
  return "—";
}
