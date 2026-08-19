import { createClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { todayISO, formatDisplayDate } from "@/lib/dates";
import { Shell, Card, Field, inputClass, btnPrimary } from "@/components/ui";
import { AttendanceBoard } from "@/components/attendance-board";
import { redirect } from "next/navigation";
import type { Group, AttendanceRecord, Profile } from "@/lib/types";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; date?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const params = await searchParams;
  const date = params.date || todayISO();
  const groupId = params.group ?? "";

  const supabase = await createClient();

  const [groupsData, studentsData, attendanceData] = await Promise.all([
    supabase.from("groups").select("*").order("name", { ascending: true }),
    supabase.from("profiles").select("*").eq("role", "STUDENT").order("name", { ascending: true }),
    supabase.from("attendance").select("*").eq("date", date),
  ]);

  const groups = (groupsData.data || []) as Group[];
  const allStudents = (studentsData.data || []) as Profile[];
  const attendance = (attendanceData.data || []) as AttendanceRecord[];

  const students = allStudents
    .filter((s) => (groupId ? s.group_id === groupId : true))
    .map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      existing: attendance.find((a) => a.student_id === s.id)?.status ?? null,
    }));

  const savedCount = students.filter((s) => s.existing).length;

  return (
    <Shell
      role="ADMIN"
      name={admin.name}
      title="Attendance"
      subtitle="Pick a date, mark each student, and save. Each date is stored separately."
    >
      <Card>
        <form className="grid gap-4 md:grid-cols-3">
          <Field label="Group">
            <select name="group" defaultValue={groupId} className={inputClass}>
              <option value="">All students</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input name="date" type="date" defaultValue={date} className={inputClass} />
          </Field>
          <div className="flex items-end">
            <button className={btnPrimary}>Open roll</button>
          </div>
        </form>
        <p className="mt-3 text-sm text-muted">
          {formatDisplayDate(date)} · {students.length} students ·{" "}
          {savedCount > 0
            ? `${savedCount} already saved for this date`
            : "nothing saved for this date yet"}
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-display mb-4 text-2xl">Mark for {formatDisplayDate(date)}</h2>
        <AttendanceBoard key={`${date}-${groupId}`} date={date} students={students} />
      </Card>
    </Shell>
  );
}
