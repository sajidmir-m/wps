"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Maximize } from "lucide-react";
import {
  examHeartbeatAction,
  reportViolationAction,
  saveAnswersAction,
  submitExamAction,
} from "@/app/actions/exam";
import { violationLabel } from "@/lib/exam";
import type { PaperQuestion } from "@/lib/types";

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/** Shortcuts that open DevTools, view-source, print, or save — all blocked. */
function isBlockedShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  if (key === "f12") return true;
  if (event.ctrlKey || event.metaKey) {
    if (event.shiftKey && ["i", "j", "c", "k"].includes(key)) return true;
    if (["u", "p", "s"].includes(key)) return true;
    if (key === "c" || key === "x" || key === "v" || key === "a") return true;
  }
  return false;
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
  const [armed, setArmed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  // Guards every exit path so a tab switch during submit cannot fire twice.
  const finishedRef = useRef(false);
  // Ignore blur/visibility for a short window after fullscreen or start.
  const ignoreUntilRef = useRef(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endsAtMs = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const current = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;

  const ignoreBriefly = useCallback((ms = 2500) => {
    ignoreUntilRef.current = Date.now() + ms;
  }, []);

  const terminate = useCallback(
    (kind: string) => {
      if (finishedRef.current) return;
      if (Date.now() < ignoreUntilRef.current) return;
      if (!armed) return;

      finishedRef.current = true;
      setTerminatedBy(kind);

      const data = new FormData();
      data.set("attemptId", attemptId);
      data.set("kind", kind);
      data.set("terminate", "1");
      data.set("answers", JSON.stringify(answersRef.current));
      void reportViolationAction(data).then(() => router.refresh());
    },
    [attemptId, router, armed],
  );

  const logOnly = useCallback(
    (kind: string) => {
      if (finishedRef.current || !armed) return;
      const data = new FormData();
      data.set("attemptId", attemptId);
      data.set("kind", kind);
      data.set("terminate", "0");
      data.set("answers", JSON.stringify(answersRef.current));
      void reportViolationAction(data);
    },
    [attemptId, armed],
  );

  const submit = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setBusy(true);
    ignoreBriefly(10_000);

    const data = new FormData();
    data.set("attemptId", attemptId);
    data.set("answers", JSON.stringify(answersRef.current));
    void submitExamAction(data).then(() => router.refresh());
  }, [attemptId, router, ignoreBriefly]);

  // Arm anti-cheat after a settle period so fullscreen prompts / first paint
  // do not instantly kill a genuine start.
  useEffect(() => {
    ignoreBriefly(3000);
    const timer = setTimeout(() => setArmed(true), 3000);
    return () => clearTimeout(timer);
  }, [ignoreBriefly]);

  // Countdown. Server also enforces ends_at — this is only the UI clock.
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

  // Heartbeat: sync answers, auto-submit if time is up on the server, and
  // notice if the attempt was terminated elsewhere.
  useEffect(() => {
    const beat = () => {
      if (finishedRef.current) return;
      const data = new FormData();
      data.set("attemptId", attemptId);
      data.set("answers", JSON.stringify(answersRef.current));
      void examHeartbeatAction(data).then((result) => {
        if (!result || result.error) return;
        if (result.terminated) {
          finishedRef.current = true;
          setTerminatedBy("TAB_HIDDEN");
          router.refresh();
          return;
        }
        if (result.expired) {
          finishedRef.current = true;
          setBusy(true);
          router.refresh();
        }
      });
    };

    const timer = setInterval(beat, 20_000);
    return () => clearInterval(timer);
  }, [attemptId, router]);

  // Anti-cheat listeners.
  useEffect(() => {
    if (terminatedBy) return;

    const onVisibility = () => {
      if (document.hidden) terminate("TAB_HIDDEN");
    };

    // Blur alone is noisy (OS toasts, password prompts). Only terminate if
    // focus stays away for a short grace period.
    const onBlur = () => {
      if (finishedRef.current || !armed) return;
      if (Date.now() < ignoreUntilRef.current) return;
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        if (document.hidden || !document.hasFocus()) {
          terminate("WINDOW_BLUR");
        }
      }, 1200);
    };

    const onFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    const onFullscreen = () => {
      if (!document.fullscreenElement && armed) {
        // Leaving fullscreen is logged but does not end the paper — some
        // browsers exit fullscreen on their own when a dialog opens.
        logOnly("FULLSCREEN_EXIT");
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      logOnly("CONTEXT_MENU");
    };

    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      logOnly("COPY");
    };

    const onCut = (event: ClipboardEvent) => {
      event.preventDefault();
      logOnly("CUT");
    };

    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      logOnly("PASTE");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isBlockedShortcut(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const key = event.key.toLowerCase();
      if (key === "f12" || ((event.ctrlKey || event.metaKey) && event.shiftKey)) {
        logOnly("DEVTOOLS");
      } else if (key === "p") {
        logOnly("PRINT");
      } else if (key === "c") {
        logOnly("COPY");
      } else if (key === "x") {
        logOnly("CUT");
      } else if (key === "v") {
        logOnly("PASTE");
      }
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (finishedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, [terminate, logOnly, terminatedBy, armed]);

  // Autosave answers to the server.
  useEffect(() => {
    if (finishedRef.current) return;
    const timer = setTimeout(() => {
      const data = new FormData();
      data.set("attemptId", attemptId);
      data.set("answers", JSON.stringify(answersRef.current));
      void saveAnswersAction(data).then((result) => {
        if (result?.expired) {
          finishedRef.current = true;
          setBusy(true);
          router.refresh();
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [answers, attemptId, router]);

  if (terminatedBy) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6 select-none">
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

  function goTo(questionIndex: number) {
    setIndex(questionIndex);
    setPaletteOpen(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white select-none">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-base sm:text-xl">{title}</h1>
          <p className="hidden text-xs text-muted sm:block">
            +{marksCorrect} per correct · −{marksWrong} per wrong · {questions.length} questions
          </p>
        </div>

        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-base font-medium sm:gap-2 sm:px-4 sm:py-2 sm:text-lg ${
            lowTime ? "bg-danger text-white" : "bg-off-white text-ink"
          }`}
        >
          <Clock size={16} className="sm:hidden" />
          <Clock size={18} className="hidden sm:block" />
          {remaining === null ? "--:--" : formatClock(remaining)}
        </div>

        <button
          type="button"
          onClick={() => {
            ignoreBriefly(4000);
            void document.documentElement.requestFullscreen?.().catch(() => undefined);
          }}
          className="hidden rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-off-white sm:inline-flex sm:items-center"
        >
          <Maximize size={14} className="mr-1.5 inline" />
          Full screen
        </button>

        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 sm:px-5"
        >
          {busy ? "…" : "Submit"}
        </button>
      </header>

      <div className="flex shrink-0 items-start gap-2 border-b border-warning-light bg-warning-light px-3 py-2 text-xs text-warning sm:items-center sm:px-5 sm:text-sm">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 sm:mt-0" />
        <span>
          Do not switch tabs or leave this window — the exam ends immediately.
          {!armed ? " Securing…" : ""}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28 sm:p-5 lg:p-8 lg:pb-8">
          {instructions && index === 0 ? (
            <p className="mb-4 rounded-xl bg-off-white px-4 py-3 text-sm text-muted">
              {instructions}
            </p>
          ) : null}

          {current ? (
            <div className="mx-auto max-w-3xl">
              <p className="text-sm font-medium text-muted">
                Question {index + 1} of {questions.length}
                <span className="ml-2 text-xs">
                  · answered {answeredCount}/{questions.length}
                </span>
              </p>
              <h2 className="mt-2 text-lg font-medium leading-relaxed sm:text-xl">
                {current.text}
              </h2>

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
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm sm:items-center sm:text-base ${
                        selected
                          ? "border-primary bg-primary-light font-medium"
                          : "border-line bg-white hover:bg-off-white"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 sm:mt-0 ${
                          selected ? "border-primary" : "border-line"
                        }`}
                      >
                        {selected ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      <span className="min-w-0 break-words">{option.label}</span>
                    </button>
                  );
                })}
              </div>

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
                  className="mt-4 text-sm font-medium text-muted hover:text-ink"
                >
                  Clear answer
                </button>
              ) : null}

              {/* Desktop next/previous under the question */}
              <div className="mt-6 hidden flex-wrap gap-3 lg:flex">
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
              </div>
            </div>
          ) : null}
        </main>

        {/* Desktop side palette only */}
        <aside className="hidden shrink-0 border-l border-line p-5 lg:block lg:w-72">
          <p className="text-sm font-medium">
            Answered {answeredCount} of {questions.length}
          </p>
          <p className="mt-1 text-xs text-muted">
            Blank answers score zero. Wrong answers lose {marksWrong} marks.
          </p>
          <div className="mt-4 grid grid-cols-6 gap-1.5">
            {questions.map((question, questionIndex) => {
              const done = answers[question.id] !== undefined;
              const active = questionIndex === index;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => goTo(questionIndex)}
                  className={`flex h-9 items-center justify-center rounded-lg text-xs font-medium ${
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

      {/* Mobile sticky Previous / Next / Jump */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-3 py-3 safe-pb lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="min-h-11 flex-1 rounded-xl border border-line px-3 py-2.5 text-sm font-medium disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="min-h-11 rounded-xl border border-line bg-off-white px-3 py-2.5 text-sm font-medium"
          >
            {index + 1}/{questions.length}
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={index === questions.length - 1}
            className="min-h-11 flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {paletteOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/40 lg:hidden">
          <button
            type="button"
            aria-label="Close question list"
            className="flex-1"
            onClick={() => setPaletteOpen(false)}
          />
          <div className="max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">Jump to question</p>
              <button
                type="button"
                onClick={() => setPaletteOpen(false)}
                className="text-sm font-medium text-muted"
              >
                Close
              </button>
            </div>
            <p className="mb-3 text-xs text-muted">
              Answered {answeredCount} of {questions.length} · blank scores 0 · wrong −{marksWrong}
            </p>
            <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
              {questions.map((question, questionIndex) => {
                const done = answers[question.id] !== undefined;
                const active = questionIndex === index;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => goTo(questionIndex)}
                    className={`flex h-9 items-center justify-center rounded-lg text-xs font-medium ${
                      active
                        ? "bg-ink text-white"
                        : done
                          ? "bg-success text-white"
                          : "bg-off-white text-muted"
                    }`}
                  >
                    {questionIndex + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

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
