"use client";

import { useMemo, useState, useTransition } from "react";
import { savePresentationMarksAction } from "@/app/actions/exam";
import { btnPrimary, inputClass } from "@/components/ui";

type Row = {
  attemptId: string;
  studentId: string;
  studentName: string;
  presentationScore: number | null;
};

export function PresentationMarksEditor({
  examId,
  presentationMax,
  rows,
}: {
  examId: string;
  presentationMax: number;
  rows: Row[];
}) {
  const initial = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.attemptId] =
        row.presentationScore === null || row.presentationScore === undefined
          ? ""
          : String(row.presentationScore);
    }
    return map;
  }, [rows]);

  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const marks = rows.map((row) => {
        const raw = values[row.attemptId]?.trim() ?? "";
        const presentationScore = raw === "" ? 0 : Number(raw);
        return { attemptId: row.attemptId, presentationScore };
      });

      const result = await savePresentationMarksAction({ examId, marks });
      if (result?.error) {
        setMessage({ text: result.error, ok: false });
        return;
      }
      setMessage({
        text: "Presentation marks saved. Totals and certificates now use the combined score.",
        ok: true,
      });
    });
  }

  if (!rows.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Presentation marks</h2>
          <p className="mt-1 text-sm text-muted">
            Enter presentation marks out of {presentationMax}. The published total is exam +
            presentation only — no split is shown on certificates.
          </p>
        </div>
        <button type="button" disabled={pending} onClick={save} className={btnPrimary}>
          {pending ? "Saving…" : "Save presentation marks"}
        </button>
      </div>

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-success-light text-success" : "bg-danger-light text-danger"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="pb-2">Student</th>
              <th className="pb-2 text-right">Presentation / {presentationMax}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.attemptId} className="border-t border-line">
                <td className="py-2.5 font-medium">{row.studentName}</td>
                <td className="py-2.5 text-right">
                  <input
                    type="number"
                    min={0}
                    max={presentationMax}
                    step="0.25"
                    inputMode="decimal"
                    className={`${inputClass} ml-auto w-28 text-right`}
                    value={values[row.attemptId] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [row.attemptId]: e.target.value }))
                    }
                    placeholder="0"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
