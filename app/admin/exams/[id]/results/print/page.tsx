import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { buildExamResults, PASS_PERCENT } from "@/lib/exam";
import { PrintButton } from "@/components/print-button";
import { btnGhost } from "@/components/ui";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Exam, ExamAttempt, Group, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExamResultsPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const { id } = await params;

  const { data: examData } = await supabaseAdmin.from("exams").select("*").eq("id", id).maybeSingle();
  const exam = examData as Exam | null;
  if (!exam) notFound();

  let studentsQuery = supabaseAdmin
    .from("profiles")
    .select("id, name, email, group_id")
    .eq("role", "STUDENT")
    .order("name", { ascending: true });
  if (exam.group_id) studentsQuery = studentsQuery.eq("group_id", exam.group_id);

  const [studentsData, attemptsData, groupsData, questionsData] = await Promise.all([
    studentsQuery,
    supabaseAdmin.from("exam_attempts").select("*").eq("exam_id", id),
    supabaseAdmin.from("groups").select("id, name"),
    supabaseAdmin.from("exam_questions").select("id", { count: "exact", head: true }).eq("exam_id", id),
  ]);

  const students = (studentsData.data || []) as Profile[];
  const attempts = (attemptsData.data || []) as ExamAttempt[];
  const groups = (groupsData.data || []) as Group[];
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const questionCount = questionsData.count ?? 0;
  const totalMarks = questionCount * Number(exam.marks_correct);

  const { rows, summary } = buildExamResults(students, attempts, totalMarks);
  const passMark = Math.round(totalMarks * (PASS_PERCENT / 100) * 100) / 100;

  const scope = exam.group_id ? groupName.get(exam.group_id) || "Selected group" : "All groups";
  const generatedOn = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const th = "border border-line bg-off-white px-2 py-1.5 text-left font-medium";
  const td = "border border-line px-2 py-1.5";

  return (
    <main className="mx-auto max-w-[190mm] bg-white p-6 text-ink print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/admin/exams/${exam.id}/results`} className={btnGhost}>
          Back to results
        </Link>
        <div className="ml-auto">
          <PrintButton label="Save as PDF" />
        </div>
        <p className="w-full text-sm text-muted">
          In the print dialog choose <b>Destination: Save as PDF</b> and paper size <b>A4</b>, and
          turn headers and footers off.
        </p>
      </div>

      <header className="print-keep border-b-2 border-ink pb-3 text-center">
        <h1 className="font-display text-2xl">Womans Polytechnic College Srinagar</h1>
        <p className="mt-1 text-sm font-medium">{exam.title} — Result Sheet</p>
        <p className="mt-1 text-xs text-muted">
          {scope} · {questionCount} questions · total {totalMarks} marks · pass mark {passMark} (
          {PASS_PERCENT}%)
        </p>
      </header>

      <section className="print-keep mt-4 grid grid-cols-5 gap-2 text-center">
        {[
          { label: "Appeared", value: `${summary.appeared}/${summary.total}` },
          { label: "Passed", value: String(summary.passed) },
          { label: "Failed", value: String(summary.failed) },
          { label: "Average", value: summary.appeared ? `${summary.average}%` : "—" },
          { label: "Highest", value: summary.appeared ? String(summary.highest) : "—" },
        ].map((box) => (
          <div key={box.label} className="rounded-lg border border-line px-2 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted">{box.label}</p>
            <p className="font-display mt-1 text-xl">{box.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="font-display mb-2 text-lg">Merit list</h2>
        {summary.appeared ? (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={`${th} w-10 text-right`}>Rank</th>
                <th className={th}>Student</th>
                <th className={th}>Group</th>
                <th className={`${th} text-right`}>Correct</th>
                <th className={`${th} text-right`}>Wrong</th>
                <th className={`${th} text-right`}>Blank</th>
                <th className={`${th} text-right`}>Score</th>
                <th className={`${th} text-right`}>%</th>
                <th className={th}>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, attempt, appeared, score, percent, passed, rank }) => (
                <tr key={student.id}>
                  <td className={`${td} text-right`}>{rank ?? "—"}</td>
                  <td className={`${td} font-medium`}>{student.name}</td>
                  <td className={td}>
                    {student.group_id ? groupName.get(student.group_id) || "—" : "—"}
                  </td>
                  <td className={`${td} text-right`}>{attempt?.correct_count ?? "—"}</td>
                  <td className={`${td} text-right`}>{attempt?.wrong_count ?? "—"}</td>
                  <td className={`${td} text-right`}>{attempt?.unanswered_count ?? "—"}</td>
                  <td className={`${td} text-right font-medium`}>{appeared ? score : "—"}</td>
                  <td className={`${td} text-right`}>{percent === null ? "—" : `${percent}%`}</td>
                  <td
                    className={`${td} font-medium ${
                      !appeared ? "text-muted" : passed ? "text-success" : "text-danger"
                    }`}
                  >
                    {!appeared
                      ? "Absent"
                      : attempt?.status === "TERMINATED"
                        ? "Terminated"
                        : passed
                          ? "Pass"
                          : "Fail"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted">Nobody has finished this exam yet.</p>
        )}
      </section>

      <section className="print-keep mt-12 flex justify-between gap-8 text-center text-xs">
        {["Examiner", "Head of Department", "Principal"].map((role) => (
          <div key={role} className="flex-1">
            <div className="border-t border-ink pt-1">{role}</div>
          </div>
        ))}
      </section>

      <p className="mt-6 text-center text-[10px] text-muted">
        Generated on {generatedOn} by {admin.name}
      </p>
    </main>
  );
}
