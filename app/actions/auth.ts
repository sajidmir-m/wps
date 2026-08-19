"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

const loginCreds = z.object({
  email: z.string().min(3),
  password: z.string().min(4),
});

const signupCreds = z.object({
  email: z.string().min(3),
  password: z.string().min(4),
  name: z.string().min(2),
});

function form(data: FormData) {
  return {
    email: String(data.get("email") || "").trim().toLowerCase(),
    password: String(data.get("password") || ""),
    name: String(data.get("name") || "").trim(),
  };
}

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = loginCreds.safeParse(form(formData));
  if (!parsed.success || !parsed.data.email.includes("@")) {
    return { error: "Valid email and password (4+ characters) required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Email or password is incorrect." };
  }

  const session = await supabase.auth.getSession();
  const role = session.data.session?.user.user_metadata?.role ?? "STUDENT";
  redirect(role === "ADMIN" ? "/admin" : "/student");
}

export async function signupAction(_: unknown, formData: FormData) {
  const parsed = signupCreds.safeParse(form(formData));
  if (!parsed.success || !parsed.data.email.includes("@")) {
    return { error: "Name, valid email, and password (4+ characters) required." };
  }

  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  if (existing?.users.find((u) => u.email === parsed.data.email)) {
    return { error: "This email is already registered. Please log in." };
  }

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      name: parsed.data.name!,
      role: "STUDENT",
      subscription: "ACTIVE",
    },
  });

  if (error || !created.user) {
    return { error: "Could not create account. Please try again." };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  redirect("/student");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
