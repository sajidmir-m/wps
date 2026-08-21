import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { Shell, Card } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { ResetAllPasswords } from "@/components/reset-passwords";
import { resetStudentPasswordAction } from "@/app/actions/admin";
import { redirect } from "next/navigation";
import type { Group, Profile } from "@/lib/types";

export default async function CredentialsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const [studentsData, groupsData, credentialsData] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("role", "STUDENT").order("name", { ascending: true }),
    supabaseAdmin.from("groups").select("*"),
    supabaseAdmin.from("student_credentials").select("*"),
  ]);

  const students = (studentsData.data || []) as Profile[];
  const groups = (groupsData.data || []) as Group[];
  const credentials = (credentialsData.data || []) as {
    student_id: string;
    password: string;
  }[];

  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const passwordFor = new Map(credentials.map((c) => [c.student_id, c.password]));
  const missing = students.filter((s) => !passwordFor.has(s.id)).length;

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Student logins"
      subtitle={`${students.length} students · every student has their own password`}
    >
      <Card className="mb-6 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Print login slips</h2>
            <p className="mt-1 text-sm text-muted">
              Each slip carries one student&rsquo;s email and their own unique password. Print, cut
              along the boxes, and hand one to each student.
            </p>
          </div>
          <PrintButton label="Print slips" />
        </div>
        <div className="mt-4">
          <ResetAllPasswords missing={missing} />
        </div>
        {missing > 0 ? (
          <p className="mt-4 rounded-xl bg-warning-light px-3 py-2 text-sm text-warning">
            {missing} student{missing === 1 ? "" : "s"} {missing === 1 ? "does" : "do"} not have a
            password on record yet. Click <b>Generate passwords</b> above to issue one to everyone.
          </p>
        ) : null}
      </Card>

      <div className="mb-6 hidden print:block">
        <h1 className="font-display text-2xl">Womans Polytechnic College Srinagar</h1>
        <p className="text-sm text-muted">Student login details</p>
      </div>

      {students.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
          {students.map((student) => {
            const password = passwordFor.get(student.id);
            return (
              <div
                key={student.id}
                className="break-inside-avoid rounded-xl border border-line bg-white p-4"
              >
                <p className="font-medium">{student.name}</p>
                <p className="text-xs text-muted">
                  {student.group_id ? groupName.get(student.group_id) || "No group" : "No group"}
                </p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Email</dt>
                    <dd className="break-all font-medium">{student.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Password</dt>
                    <dd className={password ? "font-mono font-medium" : "text-warning"}>
                      {password ?? "Not generated yet"}
                    </dd>
                  </div>
                </dl>
                <form action={resetStudentPasswordAction} className="mt-3 print:hidden">
                  <input type="hidden" name="id" value={student.id} />
                  <button className="text-xs font-medium text-primary hover:underline">
                    New password
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <p className="text-muted">
            No students yet. Add them from <b>Students</b> first.
          </p>
        </Card>
      )}
    </Shell>
  );
}
