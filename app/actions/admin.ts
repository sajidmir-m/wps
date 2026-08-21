"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import { generatePassword } from "@/lib/password";
import type { SubscriptionStatus } from "@/lib/types";

async function saveCredentials(entries: { studentId: string; password: string }[]) {
  if (!entries.length) return true;
  const updatedAt = new Date().toISOString();
  const { error } = await supabaseAdmin.from("student_credentials").upsert(
    entries.map((entry) => ({
      student_id: entry.studentId,
      password: entry.password,
      updated_at: updatedAt,
    })),
  );
  return !error;
}

async function takenEmails(emails: string[]) {
  if (!emails.length) return new Set<string>();
  const { data } = await supabaseAdmin.from("profiles").select("email").in("email", emails);
  return new Set((data ?? []).map((row) => String(row.email).toLowerCase()));
}

// Supabase Auth has no bulk user endpoint, so these calls stay one-per-student.
// Running them in small batches keeps the wait proportional to the batch count
// rather than the class size, without tripping rate limits.
async function inBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(run))));
  }
  return results;
}

export async function createGroupAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!name) return;

  await supabaseAdmin.from("groups").insert({ name, description: description || null });
  revalidatePath("/admin/students");
}

export async function deleteGroupAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const id = String(formData.get("id") || "");
  await supabaseAdmin.from("profiles").update({ group_id: null }).eq("group_id", id);
  await supabaseAdmin.from("groups").delete().eq("id", id);
  revalidatePath("/admin/students");
}

export async function addStudentAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim() || generatePassword();
  const groupId = String(formData.get("groupId") || "") || null;

  if (!name || !email) return;

  if ((await takenEmails([email])).has(email)) return;

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

  if (created?.user) {
    await saveCredentials([{ studentId: created.user.id, password }]);
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/credentials");
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

  const candidates = lines.flatMap((line) => {
    const parts = line.split(/[,|\t]/).map((p) => p.trim()).filter(Boolean);
    const name = parts[0];
    if (!name) return [];
    const rawEmail = parts[1];
    const email = rawEmail?.includes("@")
      ? rawEmail.toLowerCase()
      : `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@student.local`;
    return [{ name, email }];
  });

  const taken = await takenEmails(candidates.map((c) => c.email));
  const fresh = candidates.filter((c) => !taken.has(c.email));
  const skipped = candidates.length - fresh.length;

  const created = await inBatches(fresh, 5, async (student) => {
    const password = generatePassword();
    const { data } = await supabaseAdmin.auth.admin.createUser({
      email: student.email,
      password,
      email_confirm: true,
      user_metadata: {
        name: student.name,
        role: "STUDENT",
        subscription: "ACTIVE",
        group_id: groupId,
      },
    });
    return data?.user ? { studentId: data.user.id, password } : null;
  });

  const saved = created.filter((entry) => entry !== null);
  await saveCredentials(saved);

  revalidatePath("/admin/students");
  revalidatePath("/admin/credentials");
  return { ok: true, added: saved.length, skipped };
}

export async function updateStudentAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const id = String(formData.get("id") || "");
  const groupId = String(formData.get("groupId") || "") || null;
  const subscription = String(formData.get("subscription") || "ACTIVE") as SubscriptionStatus;

  await supabaseAdmin
    .from("profiles")
    .update({ group_id: groupId, subscription })
    .eq("id", id);
  revalidatePath("/admin/students");
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
  revalidatePath("/admin/students");
  revalidatePath("/admin/credentials");
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

  // Record the readable copy before changing it in Auth. If this write fails
  // the student keeps a password we can still look up, rather than one nobody
  // can recover.
  if (!(await saveCredentials([{ studentId: id, password }]))) return;

  await supabaseAdmin.auth.admin.updateUserById(id, { password });
  revalidatePath("/admin/credentials");
}

export async function resetAllPasswordsAction() {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin only." };

  const { data: students } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "STUDENT");

  if (!students?.length) return { error: "No students found." };

  const entries = students.map((student) => ({
    studentId: student.id,
    password: generatePassword(),
  }));

  // Record the readable copies before changing anything in Auth, so a failed
  // write leaves students on their old passwords instead of unrecoverable ones.
  if (!(await saveCredentials(entries))) {
    return { error: "Could not save the new passwords. Nothing was changed." };
  }

  const outcomes = await inBatches(entries, 5, async (entry) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(entry.studentId, {
      password: entry.password,
    });
    return !error;
  });

  const updated = outcomes.filter(Boolean).length;

  revalidatePath("/admin/credentials");
  return { ok: true, updated, failed: outcomes.length - updated };
}

