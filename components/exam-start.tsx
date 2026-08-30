"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startExamAction } from "@/app/actions/exam";

export function ExamStart({
  examId,
  durationMinutes,
  questionCount,
  marksCorrect,
  marksWrong,
}: {
  examId: string;
  durationMinutes: number;
  questionCount: number;
  marksCorrect: number;
  marksWrong: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [pending, start] = useTransition();

  function begin() {
    const data = new FormData();
    data.set("examId", examId);
    start(async () => {
      const result = await startExamAction(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      // Full screen has to be requested from a real click, so ask here.
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        // Full screen is a nicety; the exam works without it.
      }
      router.refresh();
    });
  }

  const rules = [
    `${questionCount} questions · ${durationMinutes} minutes · the timer starts the moment you press Start.`,
    `Each correct answer gives +${marksCorrect}. Each wrong answer loses ${marksWrong}. Blank answers score nothing, so do not guess wildly.`,
    "Do not switch tabs, minimise the window, or open any other app. Doing so ends your exam immediately.",
    "You get one attempt only. Once the exam ends, whether you submit it or it is terminated, you cannot sit it again.",
  ];

  return (
    <div>
      <ol className="space-y-3">
        {rules.map((rule, index) => (
          <li key={index} className="flex gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-off-white text-xs font-medium">
              {index + 1}
            </span>
            <span className="pt-0.5">{rule}</span>
          </li>
        ))}
      </ol>

      <label className="mt-5 flex items-start gap-3 rounded-xl border border-line px-4 py-3 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          I have read the rules and I understand that leaving this window will end my exam.
        </span>
      </label>

      {error ? (
        <p className="mt-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={begin}
        disabled={!agreed || pending}
        className="mt-5 rounded-xl bg-primary px-6 py-3 font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {pending ? "Starting…" : "Start exam"}
      </button>
    </div>
  );
}
