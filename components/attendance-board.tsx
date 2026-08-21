"use client";

import { useMemo, useState, useTransition } from "react";
import type { AttendanceStatus } from "@/lib/types";
import { markAttendanceAction } from "@/app/actions/attendance";
import { formatDisplayDate } from "@/lib/dates";

type Student = {
  id: string;
  name: string;
  email: string;
  existing?: AttendanceStatus | null;
};

const OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "ABSENT", label: "Absent" },
] as const;

export function AttendanceBoard({
  date,
  students,
}: {
  date: string;
  students: Student[];
}) {
  const initialMarks = useMemo(() => {
    const initial: Record<string, AttendanceStatus> = {};
    for (const s of students) {
      if (s.existing) initial[s.id] = s.existing;
    }
    return initial;
  }, [students]);

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(initialMarks);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    const values = Object.values(marks);
    return {
      present: values.filter((v) => v === "PRESENT").length,
      late: values.filter((v) => v === "LATE").length,
      absent: values.filter((v) => v === "ABSENT").length,
    };
  }, [marks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, query]);

  const unmarked = students.length - Object.keys(marks).length;
  const dirty = students.some((s) => (marks[s.id] ?? null) !== (s.existing ?? null));

  function setAll(status: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = { ...marks };
    for (const s of visible) next[s.id] = status;
    setMarks(next);
    setMessage(null);
  }

  function reset() {
    setMarks(initialMarks);
    setMessage(null);
  }

  function save() {
    const payload = students
      .filter((s) => marks[s.id])
      .map((s) => ({ studentId: s.id, status: marks[s.id] }));

    if (!payload.length) {
      setMessage({ text: "Mark at least one student before saving.", ok: false });
      return;
    }

    const data = new FormData();
    data.set("date", date);
    data.set("marks", JSON.stringify(payload));
    start(async () => {
      const result = await markAttendanceAction(data);
      setMessage(
        result?.error
          ? { text: result.error, ok: false }
          : {
              text: `Saved ${payload.length} students for ${formatDisplayDate(date)}.`,
              ok: true,
            },
      );
    });
  }

  if (!students.length) {
    return (
      <p className="rounded-xl bg-off-white px-4 py-6 text-center text-sm text-muted">
        No students in this group yet. Add students first.
      </p>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-5 mb-4 border-b border-line bg-white px-5 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student"
            className="w-48 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setAll("PRESENT")}
            className="rounded-lg border border-success bg-white px-3 py-2 text-sm font-medium text-success hover:bg-success-light"
          >
            Mark all present
          </button>
          <button
            type="button"
            onClick={() => setAll("ABSENT")}
            className="rounded-lg border border-danger bg-white px-3 py-2 text-sm font-medium text-danger hover:bg-danger-light"
          >
            Mark all absent
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-off-white"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="ml-auto rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {pending ? "Saving…" : dirty ? "Save changes" : "Save attendance"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
            Present <b>{counts.present}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning" />
            Late <b>{counts.late}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-danger" />
            Absent <b>{counts.absent}</b>
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-line" />
            Unmarked <b>{unmarked}</b>
          </span>
        </div>

        {message ? (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              message.ok ? "bg-success-light text-success" : "bg-danger-light text-danger"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        {visible.map((student, index) => {
          const status = marks[student.id];
          return (
            <div
              key={student.id}
              className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                index % 2 === 1 ? "bg-off-white" : "bg-white"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-sm text-muted">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{student.name}</p>
                  {student.existing ? (
                    <p className="text-xs text-muted">
                      Saved as {student.existing.toLowerCase()}
                    </p>
                  ) : (
                    <p className="text-xs text-muted">Not marked</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 overflow-hidden rounded-lg border border-line">
                {OPTIONS.map((option) => {
                  const selected = status === option.value;
                  const selectedStyle =
                    option.value === "PRESENT"
                      ? "bg-success text-white"
                      : option.value === "LATE"
                        ? "bg-warning text-white"
                        : "bg-danger text-white";
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setMarks((m) => ({ ...m, [student.id]: option.value }))
                      }
                      className={`border-l border-line px-4 py-1.5 text-sm font-medium first:border-l-0 ${
                        selected ? selectedStyle : "bg-white text-muted hover:bg-off-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!visible.length ? (
          <p className="bg-white px-4 py-6 text-center text-sm text-muted">
            No student matches &ldquo;{query}&rdquo;.
          </p>
        ) : null}
      </div>
    </div>
  );
}
