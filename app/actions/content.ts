"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
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

  const supabase = await createClient();
  await supabase.from("lessons").insert({
    date,
    topic,
    method,
    notes: notes || null,
    group_id: groupId,
    author_id: admin.id,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");
}

export async function deleteLessonAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const supabase = await createClient();
  await supabase.from("lessons").delete().eq("id", String(formData.get("id") || ""));
  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return;
  if (user.subscription !== "ACTIVE") return;

  const body = String(formData.get("body") || "").trim();
  const parentId = String(formData.get("parentId") || "") || null;
  if (!body) return;

  const supabase = await createClient();
  await supabase.from("comments").insert({
    body,
    author_id: user.id,
    parent_id: parentId,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");
}
