"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, getSession } from "@/lib/auth";
import { buildPaper, gradeAttempt, parseQuestions, sanitizeAnswers } from "@/lib/exam";
import type { ExamQuestion, ExamAttempt, ExamStatus } from "@/lib/types";

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");
}

const TERMINATING_KINDS = new Set([
  "TAB_HIDDEN",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
]);

/* ---------------------------------------------------------------- admin --- */

export async function createExamAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Give the exam a title." };

  const duration = Number(formData.get("duration") || 30);
  const marksCorrect = Number(formData.get("marksCorrect") || 1);
  const marksWrong = Number(formData.get("marksWrong") || 0.25);
  if (!Number.isFinite(duration) || duration < 1 || duration > 300) {
    return { error: "Duration must be between 1 and 300 minutes." };
  }
  if (!Number.isFinite(marksCorrect) || marksCorrect <= 0) {
    return { error: "Marks per correct answer must be greater than zero." };
  }
  if (!Number.isFinite(marksWrong) || marksWrong < 0) {
    return { error: "Penalty cannot be negative." };
  }

  const { data, error } = await supabaseAdmin
    .from("exams")
    .insert({
      title,
      instructions: String(formData.get("instructions") || "").trim() || null,
      duration_minutes: duration,
      marks_correct: marksCorrect,
      marks_wrong: marksWrong,
      group_id: String(formData.get("groupId") || "") || null,
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Could not create the exam." };

  refresh();
  return { ok: true, id: data.id as string };
}

export async function updateExamAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const id = String(formData.get("id") || "");
  if (!id) return { error: "Missing exam." };

  const duration = Number(formData.get("duration") || 30);
  const marksCorrect = Number(formData.get("marksCorrect") || 1);
  const marksWrong = Number(formData.get("marksWrong") || 0.25);
  if (!Number.isFinite(duration) || duration < 1 || duration > 300) {
    return { error: "Duration must be between 1 and 300 minutes." };
  }

  const { error } = await supabaseAdmin
    .from("exams")
    .update({
      title: String(formData.get("title") || "").trim(),
      instructions: String(formData.get("instructions") || "").trim() || null,
      duration_minutes: duration,
      marks_correct: marksCorrect,
      marks_wrong: marksWrong,
      group_id: String(formData.get("groupId") || "") || null,
    })
    .eq("id", id);

  if (error) return { error: "Could not save the exam." };

  refresh();
  return { ok: true };
}

export async function setExamStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "") as ExamStatus;
  if (!id || !["DRAFT", "PUBLISHED", "CLOSED"].includes(status)) {
    return { error: "Unknown status." };
  }

  if (status === "PUBLISHED") {
    const { count } = await supabaseAdmin
      .from("exam_questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", id);
    if (!count) return { error: "Add at least one question before publishing." };
  }

  await supabaseAdmin.from("exams").update({ status }).eq("id", id);
  refresh();
  return { ok: true };
}

export async function deleteExamAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  await supabaseAdmin.from("exams").delete().eq("id", String(formData.get("id") || ""));
  refresh();
  return { ok: true };
}

export async function addQuestionsAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const examId = String(formData.get("examId") || "");
  if (!examId) return { error: "Missing exam." };

  const { questions, errors } = parseQuestions(String(formData.get("questions") || ""));
  if (errors.length) return { error: errors.join(" ") };
  if (!questions.length) return { error: "No questions found." };

  const { count } = await supabaseAdmin
    .from("exam_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);

  const start = count ?? 0;
  const { error } = await supabaseAdmin.from("exam_questions").insert(
    questions.map((question, index) => ({
      exam_id: examId,
      position: start + index,
      text: question.text,
      options: question.options,
      correct_index: question.correctIndex,
    })),
  );

  if (error) return { error: "Could not save the questions." };

  refresh();
  return { ok: true, added: questions.length };
}

export async function deleteQuestionAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  await supabaseAdmin.from("exam_questions").delete().eq("id", String(formData.get("id") || ""));
  refresh();
  return { ok: true };
}

/** Clears a student's attempt so they can sit the exam again. */
export async function resetAttemptAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const attemptId = String(formData.get("attemptId") || "");
  if (!attemptId) return { error: "Missing attempt." };

  await supabaseAdmin.from("exam_attempts").delete().eq("id", attemptId);
  refresh();
  return { ok: true };
}

export async function acknowledgeViolationsAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const examId = String(formData.get("examId") || "");
  const query = supabaseAdmin.from("exam_violations").update({ acknowledged: true });
  await (examId ? query.eq("exam_id", examId) : query.eq("acknowledged", false));

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------- student --- */

async function loadOwnAttempt(attemptId: string) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return { error: "Students only." as const };
  if (session.subscription !== "ACTIVE") {
    return { error: "Your account is not active. Speak to your invigilator." as const };
  }

  const { data } = await supabaseAdmin
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  const attempt = data as ExamAttempt | null;
  if (!attempt) return { error: "Attempt not found." as const };
  // Never trust the id coming from the browser on its own.
  if (attempt.student_id !== session.id) return { error: "Not your attempt." as const };

  return { attempt, session };
}

async function loadExamQuestions(examId: string) {
  const { data } = await supabaseAdmin.from("exam_questions").select("*").eq("exam_id", examId);
  return (data || []) as ExamQuestion[];
}

function parseClientAnswers(raw: FormDataEntryValue | null): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(raw || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Grades and locks an attempt only if it is still IN_PROGRESS. The status
 * filter makes double-submit / terminate races safe: only the first writer wins.
 */
async function finishAttempt(
  attempt: ExamAttempt,
  answers: Record<string, number>,
  outcome:
    | { status: "SUBMITTED"; reason?: string }
    | { status: "TERMINATED"; reason: string },
) {
  const [{ data: questionRows }, { data: exam }] = await Promise.all([
    supabaseAdmin.from("exam_questions").select("*").eq("exam_id", attempt.exam_id),
    supabaseAdmin
      .from("exams")
      .select("marks_correct, marks_wrong")
      .eq("id", attempt.exam_id)
      .single(),
  ]);

  const questions = (questionRows || []) as ExamQuestion[];
  const clean = sanitizeAnswers(questions, answers);
  const result = gradeAttempt(
    questions,
    clean,
    Number(exam?.marks_correct ?? 1),
    Number(exam?.marks_wrong ?? 0.25),
  );

  const now = new Date().toISOString();
  const { data: updated } = await supabaseAdmin
    .from("exam_attempts")
    .update({
      answers: clean,
      status: outcome.status,
      submitted_at: outcome.status === "SUBMITTED" ? now : null,
      terminated_at: outcome.status === "TERMINATED" ? now : null,
      termination_reason:
        outcome.status === "TERMINATED"
          ? outcome.reason
          : outcome.reason === "TIME_UP"
            ? "TIME_UP"
            : null,
      score: result.score,
      correct_count: result.correct,
      wrong_count: result.wrong,
      unanswered_count: result.unanswered,
    })
    .eq("id", attempt.id)
    .eq("status", "IN_PROGRESS")
    .select("id")
    .maybeSingle();

  return { result, locked: Boolean(updated) };
}

/** If the clock has run out, lock the paper as submitted. Called on every write. */
async function enforceDeadline(attempt: ExamAttempt, answers: Record<string, number>) {
  if (attempt.status !== "IN_PROGRESS") return { attempt, expired: false };
  if (new Date(attempt.ends_at).getTime() > Date.now()) return { attempt, expired: false };

  await finishAttempt(attempt, Object.keys(answers).length ? answers : attempt.answers ?? {}, {
    status: "SUBMITTED",
    reason: "TIME_UP",
  });

  const { data } = await supabaseAdmin
    .from("exam_attempts")
    .select("*")
    .eq("id", attempt.id)
    .single();

  return { attempt: (data as ExamAttempt) ?? attempt, expired: true };
}

/**
 * Used when a student reopens an expired IN_PROGRESS attempt. Grades whatever
 * was last saved on the server so the paper cannot stay open forever.
 */
export async function expireAttemptIfNeeded(attemptId: string) {
  const loaded = await loadOwnAttempt(attemptId);
  if ("error" in loaded) return { error: loaded.error };

  const { attempt, expired } = await enforceDeadline(
    loaded.attempt,
    loaded.attempt.answers ?? {},
  );

  if (expired) refresh();
  return { ok: true, status: attempt.status, expired };
}

export async function startExamAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return { error: "Students only." };
  if (session.subscription !== "ACTIVE") {
    return { error: "Your account is not active. Speak to your invigilator." };
  }

  const examId = String(formData.get("examId") || "");
  if (!examId) return { error: "Missing exam." };

  const { data: exam } = await supabaseAdmin
    .from("exams")
    .select("id, status, duration_minutes, group_id")
    .eq("id", examId)
    .single();

  if (!exam) return { error: "Exam not found." };
  if (exam.status !== "PUBLISHED") return { error: "This exam is not open." };
  if (exam.group_id && exam.group_id !== session.groupId) {
    return { error: "This exam is for a different group." };
  }

  const { data: existing } = await supabaseAdmin
    .from("exam_attempts")
    .select("id, status")
    .eq("exam_id", examId)
    .eq("student_id", session.id)
    .maybeSingle();

  if (existing) return { error: "You have already taken this exam." };

  const questions = await loadExamQuestions(examId);
  if (!questions.length) return { error: "This exam has no questions yet." };

  const { order, optionOrders } = buildPaper(questions);
  const endsAt = new Date(Date.now() + exam.duration_minutes * 60_000).toISOString();

  // The unique (exam_id, student_id) index is the real guard here: if two
  // tabs race to start, only one insert survives.
  const { error } = await supabaseAdmin.from("exam_attempts").insert({
    exam_id: examId,
    student_id: session.id,
    question_order: order,
    option_orders: optionOrders,
    ends_at: endsAt,
  });

  if (error) return { error: "You have already taken this exam." };

  refresh();
  return { ok: true };
}

export async function saveAnswersAction(formData: FormData) {
  const attemptId = String(formData.get("attemptId") || "");
  const loaded = await loadOwnAttempt(attemptId);
  if ("error" in loaded) return { error: loaded.error };

  const questions = await loadExamQuestions(loaded.attempt.exam_id);
  const answers = sanitizeAnswers(questions, parseClientAnswers(formData.get("answers")));

  const { attempt, expired } = await enforceDeadline(loaded.attempt, answers);
  if (expired) {
    refresh();
    return { error: "Time is up. Your exam has been submitted.", expired: true };
  }
  if (attempt.status !== "IN_PROGRESS") return { error: "This exam is closed." };

  await supabaseAdmin
    .from("exam_attempts")
    .update({ answers })
    .eq("id", attemptId)
    .eq("status", "IN_PROGRESS");

  return { ok: true };
}

export async function submitExamAction(formData: FormData) {
  const attemptId = String(formData.get("attemptId") || "");
  const loaded = await loadOwnAttempt(attemptId);
  if ("error" in loaded) return { error: loaded.error };

  const attempt = loaded.attempt;
  if (attempt.status !== "IN_PROGRESS") return { error: "This exam is already finished." };

  const questions = await loadExamQuestions(attempt.exam_id);
  const answers = sanitizeAnswers(questions, parseClientAnswers(formData.get("answers")));
  // Prefer client answers, but fall back to the last saved server copy if the
  // payload is empty (e.g. auto-submit after a crash).
  const merged = Object.keys(answers).length ? answers : (attempt.answers ?? {});

  await finishAttempt(attempt, merged, { status: "SUBMITTED" });

  refresh();
  return { ok: true };
}

/**
 * Called by the exam window when the student leaves it. The attempt is graded
 * on whatever was answered so far and locked, and the admin monitor picks the
 * violation up on its next refresh.
 */
export async function reportViolationAction(formData: FormData) {
  const attemptId = String(formData.get("attemptId") || "");
  const loaded = await loadOwnAttempt(attemptId);
  if ("error" in loaded) return { error: loaded.error };

  const attempt = loaded.attempt;
  const kind = String(formData.get("kind") || "UNKNOWN").slice(0, 40);
  const detail = String(formData.get("detail") || "").slice(0, 500) || null;
  const requestedTerminate = String(formData.get("terminate") || "1") === "1";
  const shouldTerminate = requestedTerminate && TERMINATING_KINDS.has(kind);

  await supabaseAdmin.from("exam_violations").insert({
    attempt_id: attempt.id,
    exam_id: attempt.exam_id,
    student_id: attempt.student_id,
    kind,
    detail,
  });

  if (!shouldTerminate) {
    refresh();
    return { ok: true, terminated: false };
  }

  if (attempt.status !== "IN_PROGRESS") {
    refresh();
    return { ok: true, terminated: true };
  }

  const questions = await loadExamQuestions(attempt.exam_id);
  const answers = sanitizeAnswers(questions, parseClientAnswers(formData.get("answers")));
  const merged = Object.keys(answers).length ? answers : (attempt.answers ?? {});

  await finishAttempt(attempt, merged, { status: "TERMINATED", reason: kind });

  refresh();
  return { ok: true, terminated: true };
}

/** Lightweight poll so the exam window notices a remote lock (time-up / terminate). */
export async function examHeartbeatAction(formData: FormData) {
  const attemptId = String(formData.get("attemptId") || "");
  const loaded = await loadOwnAttempt(attemptId);
  if ("error" in loaded) return { error: loaded.error };

  const questions = await loadExamQuestions(loaded.attempt.exam_id);
  const answers = sanitizeAnswers(questions, parseClientAnswers(formData.get("answers")));

  const { attempt, expired } = await enforceDeadline(
    loaded.attempt,
    Object.keys(answers).length ? answers : loaded.attempt.answers ?? {},
  );

  if (expired) refresh();

  return {
    ok: true,
    status: attempt.status,
    endsAt: attempt.ends_at,
    expired,
    terminated: attempt.status === "TERMINATED",
  };
}
