"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, getSession } from "@/lib/auth";
import { buildPaper, gradeAttempt, parseQuestions } from "@/lib/exam";
import type { ExamQuestion, ExamAttempt, ExamStatus } from "@/lib/types";

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");
}

/* ---------------------------------------------------------------- admin --- */

export async function createExamAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Give the exam a title." };

  const { data, error } = await supabaseAdmin
    .from("exams")
    .insert({
      title,
      instructions: String(formData.get("instructions") || "").trim() || null,
      duration_minutes: Number(formData.get("duration") || 30),
      marks_correct: Number(formData.get("marksCorrect") || 1),
      marks_wrong: Number(formData.get("marksWrong") || 0.25),
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

  const { error } = await supabaseAdmin
    .from("exams")
    .update({
      title: String(formData.get("title") || "").trim(),
      instructions: String(formData.get("instructions") || "").trim() || null,
      duration_minutes: Number(formData.get("duration") || 30),
      marks_correct: Number(formData.get("marksCorrect") || 1),
      marks_wrong: Number(formData.get("marksWrong") || 0.25),
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

  const { data } = await supabaseAdmin
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  const attempt = data as ExamAttempt | null;
  if (!attempt) return { error: "Attempt not found." as const };
  // Never trust the id coming from the browser on its own.
  if (attempt.student_id !== session.id) return { error: "Not your attempt." as const };

  return { attempt };
}

export async function startExamAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return { error: "Students only." };

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
    .select("id")
    .eq("exam_id", examId)
    .eq("student_id", session.id)
    .maybeSingle();

  if (existing) return { error: "You have already taken this exam." };

  const { data: questionRows } = await supabaseAdmin
    .from("exam_questions")
    .select("*")
    .eq("exam_id", examId);

  const questions = (questionRows || []) as ExamQuestion[];
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
  if (loaded.attempt.status !== "IN_PROGRESS") return { error: "This exam is closed." };

  let answers: Record<string, number>;
  try {
    answers = JSON.parse(String(formData.get("answers") || "{}"));
  } catch {
    return { error: "Could not read the answers." };
  }

  await supabaseAdmin.from("exam_attempts").update({ answers }).eq("id", attemptId);
  return { ok: true };
}

async function finishAttempt(
  attempt: ExamAttempt,
  answers: Record<string, number>,
  outcome: { status: "SUBMITTED" } | { status: "TERMINATED"; reason: string },
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
  const result = gradeAttempt(
    questions,
    answers,
    Number(exam?.marks_correct ?? 1),
    Number(exam?.marks_wrong ?? 0.25),
  );

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("exam_attempts")
    .update({
      answers,
      status: outcome.status,
      submitted_at: outcome.status === "SUBMITTED" ? now : null,
      terminated_at: outcome.status === "TERMINATED" ? now : null,
      termination_reason: outcome.status === "TERMINATED" ? outcome.reason : null,
      score: result.score,
      correct_count: result.correct,
      wrong_count: result.wrong,
      unanswered_count: result.unanswered,
    })
    .eq("id", attempt.id);

  return result;
}

export async function submitExamAction(formData: FormData) {
  const attemptId = String(formData.get("attemptId") || "");
  const loaded = await loadOwnAttempt(attemptId);
  if ("error" in loaded) return { error: loaded.error };

  const attempt = loaded.attempt;
  if (attempt.status !== "IN_PROGRESS") return { error: "This exam is already finished." };

  let answers: Record<string, number>;
  try {
    answers = JSON.parse(String(formData.get("answers") || "{}"));
  } catch {
    answers = attempt.answers ?? {};
  }

  await finishAttempt(attempt, answers, { status: "SUBMITTED" });

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
  const kind = String(formData.get("kind") || "UNKNOWN");
  const detail = String(formData.get("detail") || "") || null;
  // Copy attempts and right-clicks are worth showing the admin but are not
  // grounds for ending the paper; only leaving the window is.
  const shouldTerminate = String(formData.get("terminate") || "1") === "1";

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

  let answers: Record<string, number>;
  try {
    answers = JSON.parse(String(formData.get("answers") || "{}"));
  } catch {
    answers = attempt.answers ?? {};
  }

  await finishAttempt(attempt, answers, { status: "TERMINATED", reason: kind });

  refresh();
  return { ok: true, terminated: true };
}
