"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function createLessonAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const date = String(formData.get("date") || "");
  const topic = String(formData.get("topic") || "").trim();
  const method = String(formData.get("method") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const groupId = String(formData.get("groupId") || "") || null;

  if (!date || !topic || !method) return;

  await supabaseAdmin.from("lessons").insert({
    date,
    topic,
    method,
    notes: notes || null,
    group_id: groupId,
    author_id: admin.id,
  });

  revalidatePath("/admin/lessons");
  revalidatePath("/student/lessons");
}

export async function deleteLessonAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  await supabaseAdmin.from("lessons").delete().eq("id", String(formData.get("id") || ""));
  revalidatePath("/admin/lessons");
  revalidatePath("/student/lessons");
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return;
  if (user.subscription !== "ACTIVE") return;

  const body = String(formData.get("body") || "").trim();
  const parentId = String(formData.get("parentId") || "") || null;
  if (!body) return;

  await supabaseAdmin.from("comments").insert({
    body,
    author_id: user.id,
    parent_id: parentId,
  });

  revalidatePath("/admin/comments");
  revalidatePath("/student/comments");
}
