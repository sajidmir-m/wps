"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase";
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

  const supabase = await createClient();
  for (const mark of marks) {
    if (!mark.studentId || !mark.status) continue;
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("student_id", mark.studentId)
      .eq("date", date)
      .single();

    if (existing) {
      await supabase
        .from("attendance")
        .update({ status: mark.status, marked_by_id: admin.id })
        .eq("id", existing.id);
    } else {
      await supabase.from("attendance").insert({
        student_id: mark.studentId,
        date,
        status: mark.status,
        marked_by_id: admin.id,
      });
    }
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");
  return { ok: true };
}

export async function markOneAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const studentId = String(formData.get("studentId") || "");
  const date = String(formData.get("date") || "");
  const status = String(formData.get("status") || "") as AttendanceStatus;
  if (!studentId || !date || !status) return { error: "Missing fields." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("student_id", studentId)
    .eq("date", date)
    .single();

  if (existing) {
    await supabase
      .from("attendance")
      .update({ status, marked_by_id: admin.id })
      .eq("id", existing.id);
  } else {
    await supabase.from("attendance").insert({
      student_id: studentId,
      date,
      status,
      marked_by_id: admin.id,
    });
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");
  return { ok: true };
}
