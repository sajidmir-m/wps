"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { addDays, formatDisplayDate, todayISO } from "@/lib/dates";
import { Field, inputClass } from "./ui";
import type { Group } from "@/lib/types";

export function AttendanceFilters({
  groups,
  date,
  groupId,
  markedDates,
}: {
  groups: Group[];
  date: string;
  groupId: string;
  markedDates: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  // The roll below always reflects the URL, so every control navigates
  // immediately. Leaving a picker out of sync with the URL would let an admin
  // mark one date while saving to another.
  function go(next: { date?: string; group?: string }) {
    const params = new URLSearchParams();
    params.set("date", next.date ?? date);
    const group = next.group ?? groupId;
    if (group) params.set("group", group);
    start(() => router.push(`${pathname}?${params}`));
  }

  const today = todayISO();

  return (
    <div className={pending ? "opacity-60" : undefined}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Group">
          <select
            value={groupId}
            onChange={(e) => go({ group: e.target.value })}
            className={inputClass}
          >
            <option value="">All students</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => {
              if (e.target.value) go({ date: e.target.value });
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => go({ date: addDays(date, -1) })}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-off-white"
        >
          Previous day
        </button>
        <button
          type="button"
          onClick={() => go({ date: today })}
          disabled={date === today}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-off-white disabled:opacity-50"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => go({ date: addDays(date, 1) })}
          disabled={date >= today}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-off-white disabled:opacity-50"
        >
          Next day
        </button>
      </div>

      {markedDates.length ? (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-sm text-muted">Days with attendance already saved</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {markedDates.map((marked) => (
              <button
                key={marked}
                type="button"
                onClick={() => go({ date: marked })}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  marked === date
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-white hover:bg-off-white"
                }`}
              >
                {formatDisplayDate(marked)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
