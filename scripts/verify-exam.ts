import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { gradeAttempt, sanitizeAnswers, buildPaper, toPaperQuestions } from "../lib/exam";
import type { ExamQuestion } from "../lib/types";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("=== Exam integrity & security checks ===\n");

  const { data: exams, error } = await supabase
    .from("exams")
    .select("*")
    .eq("title", "Web Development, GitHub, Vercel & AI");

  assert(!error, `Exam query failed: ${error?.message}`);
  assert(Boolean(exams?.length), "Seeded exam not found — run scripts/seed-exam.ts first.");

  const exam = exams![0];
  console.log(`Exam: ${exam.title}`);
  console.log(`  status=${exam.status} duration=${exam.duration_minutes}m marks=+${exam.marks_correct}/-${exam.marks_wrong}`);

  assert(
    exam.status === "PUBLISHED" || exam.status === "CLOSED" || exam.status === "DRAFT",
    `Unexpected exam status: ${exam.status}`,
  );
  if (exam.status !== "PUBLISHED") {
    console.log(`  note: exam is ${exam.status} — republish from Admin → Exams when students should sit it`);
  }
  assert(Number(exam.duration_minutes) === 50, "Duration should be 50 minutes");

  const { data: questions } = await supabase
    .from("exam_questions")
    .select("*")
    .eq("exam_id", exam.id)
    .order("position", { ascending: true });

  const rows = (questions || []) as ExamQuestion[];
  console.log(`Questions: ${rows.length}`);
  assert(rows.length === 50, `Expected 50 questions, found ${rows.length}`);

  for (const q of rows) {
    assert(q.options.length >= 2 && q.options.length <= 6, `Bad option count on ${q.id}`);
    assert(q.correct_index >= 0 && q.correct_index < q.options.length, `Bad correct_index on ${q.id}`);
    assert(Boolean(q.text.trim()), `Empty question text on ${q.id}`);
  }
  console.log("  all questions have valid options and correct answers");

  // Paper stripping: correct answers must never reach the client payload.
  const { order, optionOrders } = buildPaper(rows);
  const paper = toPaperQuestions(rows, order, optionOrders);
  assert(paper.length === 50, "Paper should have 50 questions");
  assert(
    !JSON.stringify(paper).includes("correct_index"),
    "Paper JSON must not contain correct_index",
  );
  console.log("  paper strip: correct answers removed");

  // Shuffle: option values stay as original indexes so grading still works.
  for (const q of paper) {
    for (const opt of q.options) {
      assert(Number.isInteger(opt.value), "Option value must be original index");
      const original = rows.find((r) => r.id === q.id)!;
      assert(opt.label === original.options[opt.value], "Shuffled label mismatch");
    }
  }
  console.log("  shuffle preserves original option indexes for grading");

  // Answer sanitization.
  const dirty = {
    [rows[0].id]: rows[0].correct_index,
    [rows[1].id]: 99,
    "not-a-real-id": 0,
    [rows[2].id]: "1",
    [rows[3].id]: 1.5,
  };
  const clean = sanitizeAnswers(rows, dirty);
  assert(clean[rows[0].id] === rows[0].correct_index, "Valid answer kept");
  assert(clean[rows[1].id] === undefined, "Out-of-range answer dropped");
  assert(clean["not-a-real-id"] === undefined, "Unknown question dropped");
  assert(clean[rows[2].id] === 1, "Numeric string coerced when integer");
  assert(clean[rows[3].id] === undefined, "Float answer dropped");
  console.log("  sanitizeAnswers rejects forged / invalid answers");

  // Grading with negative marking.
  const allCorrect: Record<string, number> = {};
  for (const q of rows) allCorrect[q.id] = q.correct_index;
  const perfect = gradeAttempt(rows, allCorrect, 1, 0.25);
  assert(perfect.score === 50, `Perfect score should be 50, got ${perfect.score}`);
  assert(perfect.correct === 50 && perfect.wrong === 0, "Perfect breakdown wrong");

  const allWrong: Record<string, number> = {};
  for (const q of rows) allWrong[q.id] = (q.correct_index + 1) % q.options.length;
  const failed = gradeAttempt(rows, allWrong, 1, 0.25);
  assert(failed.score === -12.5, `All-wrong score should be -12.5, got ${failed.score}`);
  console.log("  grading: perfect=50, all-wrong=-12.5");

  const blank = gradeAttempt(rows, {}, 1, 0.25);
  assert(blank.score === 0 && blank.unanswered === 50, "Blank paper should score 0");
  console.log("  grading: blank=0");

  console.log("\nAll exam security checks passed.");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});
