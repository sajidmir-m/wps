import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { formatDisplayDate } from "@/lib/dates";
import { computeStats } from "@/lib/stats";
import { PrintButton } from "@/components/print-button";
import { inputClass, btnGhost } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Profile, Group, AttendanceRecord } from "@/lib/types";

export default async function ReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const params = await searchParams;
  const groupId = params.group ?? "";

  let studentsQuery = supabaseAdmin
    .from("profiles")
    .select("id, name, email, group_id")
    .eq("role", "STUDENT")
    .order("name", { ascending: true });
  if (groupId) studentsQuery = studentsQuery.eq("group_id", groupId);

  const [studentsData, groupsData, attendanceData] = await Promise.all([
    studentsQuery,
    supabaseAdmin.from("groups").select("id, name").order("name", { ascending: true }),
    supabaseAdmin
      .from("attendance")
      .select("student_id, date, status")
      .order("date", { ascending: true }),
  ]);

  const students = (studentsData.data || []) as Profile[];
  const groups = (groupsData.data || []) as Group[];
  const allAttendance = (attendanceData.data || []) as AttendanceRecord[];

  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const studentIds = new Set(students.map((s) => s.id));
  const attendance = allAttendance.filter((a) => studentIds.has(a.student_id));

  const byStudent = new Map<string, AttendanceRecord[]>();
  for (const record of attendance) {
    const list = byStudent.get(record.student_id);
    if (list) list.push(record);
    else byStudent.set(record.student_id, [record]);
  }

  const allDates = Array.from(new Set(attendance.map((a) => a.date))).sort();

  const rows = students
    .map((student) => ({
      student,
      stats: computeStats(byStudent.get(student.id) || []),
    }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name));

  const dailySummary = allDates.map((date) => {
    const records = attendance.filter((a) => a.date === date);
    return {
      date,
      present: records.filter((r) => r.status === "PRESENT").length,
      late: records.filter((r) => r.status === "LATE").length,
      absent: records.filter((r) => r.status === "ABSENT").length,
      total: records.length,
    };
  });

  const marked = rows.filter((r) => r.stats.marked > 0);
  const classAverage = marked.length
    ? Math.round((marked.reduce((sum, r) => sum + r.stats.percent, 0) / marked.length) * 10) / 10
    : 0;
  const belowSeventyFive = marked.filter((r) => r.stats.percent < 75).length;
  const neverAbsent = marked.filter((r) => r.stats.continuous).length;

  const scope = groupId ? groupName.get(groupId) || "Selected group" : "All groups";
  const range = allDates.length
    ? `${formatDisplayDate(allDates[0])} to ${formatDisplayDate(allDates[allDates.length - 1])}`
    : "No attendance recorded";
  const generatedOn = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const th = "border border-line bg-off-white px-2 py-1.5 text-left font-medium";
  const td = "border border-line px-2 py-1.5";

  return (
    <main className="mx-auto max-w-[190mm] bg-white p-6 text-ink print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
        <Link href="/admin/reports" className={btnGhost}>
          Back to reports
        </Link>
        <form className="flex items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Group</span>
            <select name="group" defaultValue={groupId} className={inputClass}>
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <button className={btnGhost}>Apply</button>
        </form>
        <div className="ml-auto">
          <PrintButton label="Save as PDF" />
        </div>
        <p className="w-full text-sm text-muted">
          In the print dialog choose <b>Destination: Save as PDF</b> and paper size <b>A4</b>.
          Leave headers and footers off for a clean sheet.
        </p>
      </div>

      <header className="print-keep border-b-2 border-ink pb-3 text-center">
        <h1 className="font-display text-2xl">Womans Polytechnic College Srinagar</h1>
        <p className="mt-1 text-sm font-medium">Attendance Report</p>
        <p className="mt-1 text-xs text-muted">
          {scope} · {range} · {allDates.length} days recorded
        </p>
      </header>

      <section className="print-keep mt-4 grid grid-cols-4 gap-3 text-center">
        {[
          { label: "Students", value: String(students.length) },
          { label: "Class average", value: marked.length ? `${classAverage}%` : "—" },
          { label: "Never absent", value: String(neverAbsent) },
          { label: "Below 75%", value: String(belowSeventyFive) },
        ].map((box) => (
          <div key={box.label} className="rounded-lg border border-line px-2 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted">{box.label}</p>
            <p className="font-display mt-1 text-xl">{box.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="font-display mb-2 text-lg">Student attendance summary</h2>
        {rows.length ? (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={`${th} w-8 text-right`}>#</th>
                <th className={th}>Student</th>
                <th className={th}>Group</th>
                <th className={`${th} text-right`}>Present</th>
                <th className={`${th} text-right`}>Late</th>
                <th className={`${th} text-right`}>Absent</th>
                <th className={`${th} text-right`}>Days</th>
                <th className={`${th} text-right`}>Average</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, stats }, index) => (
                <tr key={student.id}>
                  <td className={`${td} text-right text-muted`}>{index + 1}</td>
                  <td className={`${td} font-medium`}>{student.name}</td>
                  <td className={td}>
                    {student.group_id ? groupName.get(student.group_id) || "—" : "—"}
                  </td>
                  <td className={`${td} text-right`}>{stats.present}</td>
                  <td className={`${td} text-right`}>{stats.late}</td>
                  <td className={`${td} text-right`}>{stats.absent}</td>
                  <td className={`${td} text-right`}>{stats.marked}</td>
                  <td
                    className={`${td} text-right font-medium ${
                      stats.marked === 0 ? "text-muted" : stats.percent < 75 ? "text-danger" : ""
                    }`}
                  >
                    {stats.marked === 0 ? "—" : `${stats.percent}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted">No students in this group.</p>
        )}
      </section>

      {dailySummary.length ? (
        <section className="print-break mt-6">
          <h2 className="font-display mb-2 text-lg">Day by day</h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={`${th} text-right`}>Present</th>
                <th className={`${th} text-right`}>Late</th>
                <th className={`${th} text-right`}>Absent</th>
                <th className={`${th} text-right`}>Marked</th>
                <th className={`${th} text-right`}>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {dailySummary.map((day) => {
                const percent = day.total
                  ? Math.round(((day.present + day.late) / day.total) * 1000) / 10
                  : 0;
                return (
                  <tr key={day.date}>
                    <td className={`${td} font-medium`}>{formatDisplayDate(day.date)}</td>
                    <td className={`${td} text-right`}>{day.present}</td>
                    <td className={`${td} text-right`}>{day.late}</td>
                    <td className={`${td} text-right`}>{day.absent}</td>
                    <td className={`${td} text-right`}>{day.total}</td>
                    <td className={`${td} text-right font-medium`}>{percent}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="print-keep mt-12 flex justify-between gap-8 text-center text-xs">
        {["Class Incharge", "Head of Department", "Principal"].map((role) => (
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
