import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { buildExamResults } from "@/lib/exam";
import { TrainingCertificate } from "@/components/training-certificate";
import { PrintButton } from "@/components/print-button";
import { btnGhost } from "@/components/ui";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Exam, ExamAttempt, Group, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExamCertificatesPrintPage({
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

  const { rows } = buildExamResults(students, attempts, totalMarks);
  const certificates = rows.filter((row) => row.appeared && row.attempt && row.percent !== null);

  const issuedOn = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="certificate-print-root mx-auto max-w-[300mm] bg-off-white p-6 print:max-w-none print:bg-white print:p-0">
      {/* Force landscape only on this page — avoids blank sheets from named @page rules */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4 landscape; margin: 8mm; }
            }
          `,
        }}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/admin/exams/${exam.id}/results`} className={btnGhost}>
          Back to results
        </Link>
        <div className="ml-auto">
          <PrintButton label="Print / Save as PDF" />
        </div>
        <p className="w-full text-sm text-muted">
          {certificates.length} certificate{certificates.length === 1 ? "" : "s"} ready. In the
          print dialog: <b>Save as PDF</b>, paper <b>A4 Landscape</b>, turn{" "}
          <b>Background graphics ON</b>, and turn <b>Headers and footers OFF</b>.
        </p>
      </div>

      {certificates.length ? (
        <div className="space-y-8 print:space-y-0">
          {certificates.map(({ student, attempt, score, percent, passed, rank }, index) => (
            <div
              key={student.id}
              id={student.id}
              className={index > 0 ? "print-break scroll-mt-6" : "scroll-mt-6"}
            >
              <TrainingCertificate
                data={{
                  studentName: student.name,
                  groupName: student.group_id ? groupName.get(student.group_id) || "" : "",
                  examTitle: exam.title,
                  score: Number(score ?? 0),
                  totalMarks,
                  percent: Number(percent ?? 0),
                  passed,
                  correct: Number(attempt?.correct_count ?? 0),
                  wrong: Number(attempt?.wrong_count ?? 0),
                  blank: Number(attempt?.unanswered_count ?? 0),
                  rank,
                  issuedOn,
                  statusLabel:
                    attempt?.status === "TERMINATED"
                      ? "Terminated"
                      : passed
                        ? "Pass"
                        : "Fail",
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-white px-4 py-6 text-sm text-muted">
          No finished attempts yet. Certificates appear here once students submit the exam.
        </p>
      )}
    </main>
  );
}
