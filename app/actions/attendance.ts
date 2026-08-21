"use server";

import type { AttendanceStatus } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";

export async function markAttendanceAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const date = String(formData.get("date") || "");
  const raw = String(formData.get("marks") || "[]");
  let marks: { studentId: string; status: AttendanceStatus }[] = [];
  try {
    marks = JSON.parse(raw);
  } catch {
    return { error: "Could not read attendance marks." };
  }

  if (!date) return { error: "Pick a date." };

  const rows = marks
    .filter((mark) => mark.studentId && mark.status)
    .map((mark) => ({
      student_id: mark.studentId,
      date,
      status: mark.status,
      marked_by_id: admin.id,
    }));

  if (!rows.length) return { error: "Mark at least one student." };

  const { error } = await supabaseAdmin
    .from("attendance")
    .upsert(rows, { onConflict: "student_id,date" });

  if (error) return { error: "Could not save attendance. Please try again." };

  // Do not revalidate the admin layout — that re-fetched the whole page after
  // every save. The attendance board updates its own saved state instead.
  return { ok: true };
}

export async function markOneAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const studentId = String(formData.get("studentId") || "");
  const date = String(formData.get("date") || "");
  const status = String(formData.get("status") || "") as AttendanceStatus;
  if (!studentId || !date || !status) return { error: "Missing fields." };

  const { error } = await supabaseAdmin.from("attendance").upsert(
    { student_id: studentId, date, status, marked_by_id: admin.id },
    { onConflict: "student_id,date" },
  );

  if (error) return { error: "Could not save attendance. Please try again." };
  return { ok: true };
}
