"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Maximize } from "lucide-react";
import { reportViolationAction, saveAnswersAction, submitExamAction } from "@/app/actions/exam";
import { violationLabel } from "@/lib/exam";
import type { PaperQuestion } from "@/lib/types";

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ExamWindow({
  attemptId,
  title,
  instructions,
  questions,
  initialAnswers,
  endsAt,
  marksCorrect,
  marksWrong,
}: {
  attemptId: string;
  title: string;
  instructions: string | null;
  questions: PaperQuestion[];
  initialAnswers: Record<string, number>;
  endsAt: string;
  marksCorrect: number;
  marksWrong: number;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [terminatedBy, setTerminatedBy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  // Guards every exit path so a tab switch during submit cannot fire twice.
  const finishedRef = useRef(false);

  const endsAtMs = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const current = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  const terminate = useCallback(
    (kind: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setTerminatedBy(kind);

      const data = new FormData();
      data.set("attemptId", attemptId);
      data.set("kind", kind);
      data.set("terminate", "1");
      data.set("answers", JSON.stringify(answersRef.current));
      void reportViolationAction(data).then(() => router.refresh());
    },
    [attemptId, router],
  );

  const logOnly = useCallback(
    (kind: string) => {
      if (finishedRef.current) return;
      const data = new FormData();
      data.set("attemptId", attemptId);
      data.set("kind", kind);
      data.set("terminate", "0");
      data.set("answers", JSON.stringify(answersRef.current));
      void reportViolationAction(data);
    },
    [attemptId],
  );

  const submit = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setBusy(true);

    const data = new FormData();
    data.set("attemptId", attemptId);
    data.set("answers", JSON.stringify(answersRef.current));
    void submitExamAction(data).then(() => router.refresh());
  }, [attemptId, router]);

  // Countdown, and hand the paper in automatically when time runs out.
  useEffect(() => {
    const tick = () => {
      const left = endsAtMs - Date.now();
      setRemaining(left);
      if (left <= 0) submit();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAtMs, submit]);

  // Leaving the exam window ends the attempt. `visibilitychange` catches tab
  // switches and minimising; `blur` catches moving to another application.
  useEffect(() => {
    if (terminatedBy) return;

    const onVisibility = () => {
      if (document.hidden) terminate("TAB_HIDDEN");
    };
    const onBlur = () => terminate("WINDOW_BLUR");
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      logOnly("CONTEXT_MENU");
    };
    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      logOnly("COPY");
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (finishedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [terminate, logOnly, terminatedBy]);

  // Keep the server copy close to the student's screen without a round trip
  // on every click.
  useEffect(() => {
    if (finishedRef.current) return;
    const timer = setTimeout(() => {
      const data = new FormData();
      data.set("attemptId", attemptId);
      data.set("answers", JSON.stringify(answersRef.current));
      void saveAnswersAction(data);
    }, 1500);
    return () => clearTimeout(timer);
  }, [answers, attemptId]);

  if (terminatedBy) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6">
        <div className="max-w-lg text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-light">
            <AlertTriangle className="text-danger" size={30} />
          </div>
          <h1 className="font-display mt-5 text-3xl text-danger">Exam terminated</h1>
          <p className="mt-3 text-muted">
            You left the exam window: {violationLabel(terminatedBy).toLowerCase()}. Your paper has
            been submitted as it stood and locked.
          </p>
          <p className="mt-3 text-muted">
            You cannot take this exam again. Your invigilator has been notified. Please close this
            window and speak to them.
          </p>
          <div className="mt-6 rounded-xl bg-off-white px-4 py-3 text-sm text-muted">
            {answeredCount} of {questions.length} questions were answered before termination.
          </div>
        </div>
      </div>
    );
  }

  const lowTime = remaining !== null && remaining < 60_000;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-3">
        <div className="min-w-0">
          <h1 className="font-display truncate text-xl">{title}</h1>
          <p className="text-xs text-muted">
            +{marksCorrect} per correct · −{marksWrong} per wrong · {questions.length} questions
          </p>
        </div>

        <div
          className={`ml-auto flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-lg font-medium ${
            lowTime ? "bg-danger text-white" : "bg-off-white text-ink"
          }`}
        >
          <Clock size={18} />
          {remaining === null ? "--:--" : formatClock(remaining)}
        </div>

        <button
          type="button"
          onClick={() => document.documentElement.requestFullscreen?.()}
          className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-off-white"
        >
          <Maximize size={14} className="mr-1.5 inline" />
          Full screen
        </button>

        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit exam"}
        </button>
      </header>

      <div className="flex items-center gap-2 border-b border-warning-light bg-warning-light px-5 py-2 text-sm text-warning">
        <AlertTriangle size={15} />
        Do not switch tabs, minimise, or open another app. The exam ends immediately if you do.
      </div>

      <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          {instructions && index === 0 ? (
            <p className="mb-5 rounded-xl bg-off-white px-4 py-3 text-sm text-muted">
              {instructions}
            </p>
          ) : null}

          {current ? (
            <div className="mx-auto max-w-3xl">
              <p className="text-sm font-medium text-muted">
                Question {index + 1} of {questions.length}
              </p>
              <h2 className="mt-2 text-xl font-medium leading-relaxed">{current.text}</h2>

              <div className="mt-5 space-y-3">
                {current.options.map((option) => {
                  const selected = answers[current.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [current.id]: option.value }))
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                        selected
                          ? "border-primary bg-primary-light font-medium"
                          : "border-line bg-white hover:bg-off-white"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selected ? "border-primary" : "border-line"
                        }`}
                      >
                        {selected ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-off-white disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={index === questions.length - 1}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-off-white disabled:opacity-50"
                >
                  Next
                </button>
                {answers[current.id] !== undefined ? (
                  <button
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => {
                        const next = { ...prev };
                        delete next[current.id];
                        return next;
                      })
                    }
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-off-white"
                  >
                    Clear answer
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </main>

        <aside className="shrink-0 border-b border-line p-5 lg:w-72 lg:border-b-0 lg:border-l">
          <p className="text-sm font-medium">
            Answered {answeredCount} of {questions.length}
          </p>
          <p className="mt-1 text-xs text-muted">
            Blank answers score zero. Wrong answers lose {marksWrong} marks.
          </p>
          <div className="mt-4 grid grid-cols-8 gap-1.5 lg:grid-cols-6">
            {questions.map((question, questionIndex) => {
              const done = answers[question.id] !== undefined;
              const active = questionIndex === index;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setIndex(questionIndex)}
                  className={`aspect-square rounded-lg text-xs font-medium ${
                    active
                      ? "bg-ink text-white"
                      : done
                        ? "bg-success text-white"
                        : "bg-off-white text-muted hover:bg-line"
                  }`}
                >
                  {questionIndex + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="font-display text-2xl">Submit your exam?</h2>
            <p className="mt-2 text-sm text-muted">
              You have answered {answeredCount} of {questions.length} questions. Once submitted you
              cannot change your answers or sit this exam again.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Yes, submit"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-medium hover:bg-off-white"
              >
                Keep writing
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
