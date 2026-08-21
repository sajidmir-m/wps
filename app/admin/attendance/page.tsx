import { createClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { todayISO, formatDisplayDate } from "@/lib/dates";
import { Shell, Card } from "@/components/ui";
import { AttendanceBoard } from "@/components/attendance-board";
import { AttendanceFilters } from "@/components/attendance-filters";
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
        <AttendanceFilters groups={groups} date={date} groupId={groupId} />
        <p className="mt-3 text-sm text-muted">
          {students.length} students ·{" "}
          {savedCount > 0
            ? `${savedCount} already saved for this date`
            : "nothing saved for this date yet"}
        </p>
      </Card>

      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-baseline gap-2">
          <h2 className="font-display text-2xl">Marking</h2>
          <span className="rounded-lg bg-primary-light px-2.5 py-1 text-sm font-medium text-primary-dark">
            {formatDisplayDate(date)}
            {date === todayISO() ? " · today" : ""}
          </span>
        </div>
        <AttendanceBoard key={`${date}-${groupId}`} date={date} students={students} />
      </Card>
    </Shell>
  );
}
