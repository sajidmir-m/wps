import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

async function main() {
  const { data: exams, error: examError } = await supabase
    .from("exams")
    .select("id, title, status")
    .order("created_at", { ascending: false });

  if (examError) throw new Error(examError.message);

  for (const exam of exams || []) {
    const { data: attempts, error } = await supabase
      .from("exam_attempts")
      .select(
        "status, score, correct_count, wrong_count, unanswered_count, submitted_at, student_id, profiles:student_id(name, email)",
      )
      .eq("exam_id", exam.id)
      .neq("status", "IN_PROGRESS")
      .order("score", { ascending: false });

    if (error) throw new Error(error.message);

    console.log(`\n=== ${exam.title} (${exam.status}) ===`);
    console.log(`Students who gave the exam: ${(attempts || []).length}\n`);

    (attempts || []).forEach((a, i) => {
      const p = a.profiles as { name?: string; email?: string } | null;
      console.log(
        `${i + 1}. ${p?.name || "(no name)"} — ${a.status} — score ${a.score ?? "—"} (C:${a.correct_count ?? "—"} W:${a.wrong_count ?? "—"} B:${a.unanswered_count ?? "—"})`,
      );
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
