import type { ExamAttempt, ExamQuestion, PaperQuestion } from "./types";

/** A student passes at 40% of the paper's total marks. */
export const PASS_PERCENT = 40;

export type ParsedQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
};

export type ParseResult = {
  questions: ParsedQuestion[];
  errors: string[];
};

const QUESTION_PREFIX = /^(?:q\s*)?\d+\s*[.):-]\s*|^q\s*[.):]\s*/i;
const OPTION_PREFIX = /^\(?\s*[a-fA-F0-9]\s*[.)\]]\s*/;

/** `### 12. Some question?`, `12) Some question?`, `Q3. Some question?` */
const NUMBERED_QUESTION = /^\s*(?:#{1,6}\s*)?(?:q\s*)?\d+\s*[.)]\s*(.+?)\s*$/i;
/** `A. Option text`, `**B)** Option text`, `c] Option text` */
const LETTERED_OPTION = /^\s*\*{0,2}\s*([a-f])\s*[.)\]]\s+(.+?)\s*$/i;
/** `**Answer: B**`, `Answer - b`, `Ans: C` */
const ANSWER_KEY = /^\s*\*{0,2}\s*ans(?:wer)?\s*[:\-]\s*\*{0,2}\s*([a-f])\b/i;
/** Same as ANSWER_KEY but scans a whole document rather than one line. */
const HAS_ANSWER_KEY = /^\s*\*{0,2}\s*ans(?:wer)?\s*[:\-]\s*\*{0,2}\s*[a-f]\b/im;
const SECTION_HEADING = /^\s*#{1,6}\s+/;
const RULE = /^\s*[-*_]{3,}\s*$/;

const stripMarkdown = (value: string) => value.replace(/\*\*/g, "").trim();

export function parseQuestions(input: string): ParseResult {
  const text = input.replace(/\r\n/g, "\n");
  // Answer-key papers are written with the correct option named at the end
  // rather than starred, and they carry headings and blank lines inside a
  // single question, so they need a line-by-line reader.
  return HAS_ANSWER_KEY.test(text) ? parseAnswerKey(text) : parseStarred(text);
}

function parseAnswerKey(input: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  type Draft = { number: string; text: string; options: string[]; answer: number | null };
  let draft: Draft | null = null;

  const commit = () => {
    if (!draft) return;
    const label = `Question ${draft.number}`;

    if (!draft.options.length && !draft.text) {
      draft = null;
      return;
    }
    if (draft.options.length < 2 || draft.options.length > 6) {
      errors.push(`${label}: needs between 2 and 6 options, found ${draft.options.length}.`);
    } else if (draft.answer === null) {
      errors.push(`${label}: no "Answer:" line found.`);
    } else if (draft.answer >= draft.options.length) {
      errors.push(`${label}: the answer letter does not match any of its options.`);
    } else {
      questions.push({ text: draft.text, options: draft.options, correctIndex: draft.answer });
    }
    draft = null;
  };

  for (const rawLine of input.split("\n")) {
    const line = rawLine.trim();
    if (!line || RULE.test(line)) continue;

    const answer = line.match(ANSWER_KEY);
    if (answer && draft) {
      draft.answer = answer[1].toUpperCase().charCodeAt(0) - 65;
      continue;
    }

    const option = line.match(LETTERED_OPTION);
    if (option && draft) {
      draft.options.push(stripMarkdown(option[2]));
      continue;
    }

    const question = line.match(NUMBERED_QUESTION);
    if (question) {
      commit();
      draft = {
        number: line.match(/(\d+)/)?.[1] ?? String(questions.length + 1),
        text: stripMarkdown(question[1]),
        options: [],
        answer: null,
      };
      continue;
    }

    // Part titles and the document title sit between questions; anything else
    // before the options is treated as the rest of a wrapped question line.
    if (SECTION_HEADING.test(line)) {
      commit();
      continue;
    }
    if (draft && !draft.options.length) draft.text = `${draft.text} ${stripMarkdown(line)}`.trim();
  }

  commit();

  if (!questions.length && !errors.length) {
    errors.push("No questions found. Check that each question is numbered.");
  }

  return { questions, errors };
}

/**
 * Reads blocks separated by blank lines. The first line of a block is the
 * question, the rest are options, and the correct option is marked with a
 * leading asterisk:
 *
 *   Which gauge measures shaft diameter?
 *   Try square
 *   *Vernier caliper
 *   Spirit level
 */
function parseStarred(input: string): ParseResult {
  const blocks = input
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  blocks.forEach((block, index) => {
    const label = `Question ${index + 1}`;
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 3) {
      errors.push(`${label}: needs a question line and at least 2 options.`);
      return;
    }

    const text = lines[0].replace(QUESTION_PREFIX, "").trim();
    if (!text) {
      errors.push(`${label}: the question text is empty.`);
      return;
    }

    const options: string[] = [];
    const correct: number[] = [];

    lines.slice(1).forEach((line) => {
      const starred = line.startsWith("*");
      const cleaned = (starred ? line.slice(1) : line).replace(OPTION_PREFIX, "").trim();
      if (!cleaned) return;
      if (starred) correct.push(options.length);
      options.push(cleaned);
    });

    if (options.length < 2 || options.length > 6) {
      errors.push(`${label}: needs between 2 and 6 options, found ${options.length}.`);
      return;
    }
    if (correct.length !== 1) {
      errors.push(
        `${label}: mark exactly one correct option with a leading *, found ${correct.length}.`,
      );
      return;
    }

    questions.push({ text, options, correctIndex: correct[0] });
  });

  if (!blocks.length) errors.push("Nothing to add. Paste at least one question.");

  return { questions, errors };
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds one student's paper. Question order and option order are shuffled per
 * attempt and stored, so a reload shows the same paper and answers stay valid.
 */
export function buildPaper(questions: ExamQuestion[]) {
  const order = shuffle(questions).map((q) => q.id);
  const optionOrders: Record<string, number[]> = {};
  for (const question of questions) {
    optionOrders[question.id] = shuffle(question.options.map((_, index) => index));
  }
  return { order, optionOrders };
}

/** Strips correct answers and applies the stored shuffle for display. */
export function toPaperQuestions(
  questions: ExamQuestion[],
  order: string[],
  optionOrders: Record<string, number[]>,
): PaperQuestion[] {
  const byId = new Map(questions.map((q) => [q.id, q]));

  return order.flatMap((id) => {
    const question = byId.get(id);
    if (!question) return [];
    const layout = optionOrders[id] ?? question.options.map((_, index) => index);
    return [
      {
        id: question.id,
        text: question.text,
        options: layout
          .filter((original) => question.options[original] !== undefined)
          .map((original) => ({ value: original, label: question.options[original] })),
      },
    ];
  });
}

/**
 * Drops anything the browser is not allowed to send: unknown question ids,
 * non-integer option indexes, and indexes outside that question's options.
 * Without this a student could invent answers for questions they never saw.
 */
export function sanitizeAnswers(
  questions: ExamQuestion[],
  raw: Record<string, unknown>,
): Record<string, number> {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const clean: Record<string, number> = {};

  for (const [id, value] of Object.entries(raw ?? {})) {
    const question = byId.get(id);
    if (!question) continue;
    const index = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(index)) continue;
    if (index < 0 || index >= question.options.length) continue;
    clean[id] = index;
  }

  return clean;
}

export function gradeAttempt(
  questions: ExamQuestion[],
  answers: Record<string, number>,
  marksCorrect: number,
  marksWrong: number,
) {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === undefined || answer === null) unanswered += 1;
    else if (answer === question.correct_index) correct += 1;
    else wrong += 1;
  }

  const raw = correct * marksCorrect - wrong * marksWrong;
  const score = Math.round(raw * 100) / 100;
  const total = questions.length * marksCorrect;

  return { correct, wrong, unanswered, score, total };
}

export type ExamResultRow<S> = {
  student: S;
  attempt: ExamAttempt | null;
  appeared: boolean;
  score: number | null;
  percent: number | null;
  passed: boolean;
  rank: number | null;
};

/**
 * Ranks everyone who sat the paper, highest score first, and leaves those who
 * never started at the bottom without a rank. Equal scores share a rank, so two
 * students on 42 are both 3rd and the next is 5th.
 */
export function buildExamResults<S extends { id: string }>(
  students: S[],
  attempts: ExamAttempt[],
  totalMarks: number,
) {
  const attemptByStudent = new Map(attempts.map((a) => [a.student_id, a]));

  const rows: ExamResultRow<S>[] = students.map((student) => {
    const attempt = attemptByStudent.get(student.id) ?? null;
    const appeared = Boolean(attempt && attempt.status !== "IN_PROGRESS");
    const score = appeared ? Number(attempt?.score ?? 0) : null;
    const percent =
      score === null || totalMarks <= 0 ? null : Math.round((score / totalMarks) * 1000) / 10;

    return {
      student,
      attempt,
      appeared,
      score,
      percent,
      passed: percent !== null && percent >= PASS_PERCENT,
      rank: null,
    };
  });

  const ranked = rows
    .filter((row) => row.appeared)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  ranked.forEach((row, index) => {
    const previous = ranked[index - 1];
    row.rank = previous && previous.score === row.score ? previous.rank : index + 1;
  });

  const appeared = ranked.length;
  const passed = ranked.filter((row) => row.passed).length;
  const scores = ranked.map((row) => row.score ?? 0);
  const percents = ranked.map((row) => row.percent ?? 0);

  const summary = {
    total: students.length,
    appeared,
    absent: students.length - appeared,
    passed,
    failed: appeared - passed,
    terminated: ranked.filter((row) => row.attempt?.status === "TERMINATED").length,
    average: appeared
      ? Math.round((percents.reduce((sum, value) => sum + value, 0) / appeared) * 10) / 10
      : 0,
    highest: appeared ? Math.max(...scores) : 0,
    lowest: appeared ? Math.min(...scores) : 0,
    totalMarks,
  };

  const ordered = [...ranked, ...rows.filter((row) => !row.appeared)];

  return { rows: ordered, summary };
}

export const VIOLATION_LABELS: Record<string, string> = {
  TAB_HIDDEN: "Switched tab or minimised the window",
  WINDOW_BLUR: "Moved focus to another app or window",
  FULLSCREEN_EXIT: "Left full screen",
  COPY: "Tried to copy the question paper",
  PASTE: "Tried to paste into the exam",
  CUT: "Tried to cut from the exam",
  CONTEXT_MENU: "Opened the right-click menu",
  DEVTOOLS: "Tried to open developer tools",
  PRINT: "Tried to print the question paper",
  TIME_UP: "Time ran out",
};

export function violationLabel(kind: string) {
  return VIOLATION_LABELS[kind] ?? kind;
}
