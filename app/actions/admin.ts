"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { generatePassword } from "@/lib/password";
import type { SubscriptionStatus } from "@/lib/types";

async function saveCredential(studentId: string, password: string) {
  await supabaseAdmin
    .from("student_credentials")
    .upsert({ student_id: studentId, password, updated_at: new Date().toISOString() });
}

export async function createGroupAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("groups").insert({ name, description: description || null });
  revalidatePath("/admin", "layout");
}

export async function deleteGroupAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const id = String(formData.get("id") || "");
  const supabase = await createClient();
  await supabase.from("profiles").update({ group_id: null }).eq("group_id", id);
  await supabase.from("groups").delete().eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function addStudentAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim() || generatePassword();
  const groupId = String(formData.get("groupId") || "") || null;

  if (!name || !email) return;

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  if (existing?.users.find((u) => u.email === email)) return;

  const { data: created } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: "STUDENT",
      subscription: "ACTIVE",
      group_id: groupId,
    },
  });

  if (created?.user) await saveCredential(created.user.id, password);

  revalidatePath("/admin", "layout");
}

export async function bulkAddStudentsAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const groupId = String(formData.get("groupId") || "") || null;
  const list = String(formData.get("list") || "");
  const lines = list
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return { error: "Paste at least one student." };

  let added = 0;
  let skipped = 0;

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();

  for (const line of lines) {
    const parts = line.split(/[,|\t]/).map((p) => p.trim()).filter(Boolean);
    const name = parts[0];
    if (!name) continue;
    const rawEmail = parts[1];
    const email =
      rawEmail?.includes("@")
        ? rawEmail.toLowerCase()
        : `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@student.local`;

    if (existing?.users.find((u) => u.email === email)) {
      skipped += 1;
      continue;
    }

    const password = generatePassword();
    const { data: created } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: "STUDENT",
        subscription: "ACTIVE",
        group_id: groupId,
      },
    });

    if (created?.user) await saveCredential(created.user.id, password);
    added += 1;
  }

  revalidatePath("/admin", "layout");
  return { ok: true, added, skipped };
}

export async function updateStudentAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const id = String(formData.get("id") || "");
  const groupId = String(formData.get("groupId") || "") || null;
  const subscription = String(formData.get("subscription") || "ACTIVE") as SubscriptionStatus;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ group_id: groupId, subscription })
    .eq("id", id);
  revalidatePath("/admin", "layout");
}

export async function deleteStudentAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const id = String(formData.get("id") || "");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();
  if (!profile || profile.role === "ADMIN") return;

  await supabaseAdmin.auth.admin.deleteUser(id);
  revalidatePath("/admin", "layout");
}

export async function resetStudentPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const id = String(formData.get("id") || "");
  if (!id) return;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();
  if (!profile || profile.role === "ADMIN") return;

  const password = generatePassword();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
  if (error) return;

  await saveCredential(id, password);
  revalidatePath("/admin", "layout");
}

export async function resetAllPasswordsAction() {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const { data: students } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "STUDENT");

  if (!students?.length) return { error: "No students found." };

  let updated = 0;
  for (const student of students) {
    const password = generatePassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(student.id, { password });
    if (error) continue;
    await saveCredential(student.id, password);
    updated += 1;
  }

  revalidatePath("/admin", "layout");
  return { ok: true, updated };
}

