import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SignupPage() {
  const session = await getSession();
  if (session?.role === "ADMIN") redirect("/admin");
  if (session) redirect("/student");

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-3xl text-primary">
          WPC Srinagar
        </Link>
        <p className="mt-2 text-muted">Direct email sign up. No OTP.</p>
        <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
          <h1 className="font-display text-4xl">Create account</h1>
          <p className="mt-2 text-sm text-muted">
            Students can sign up and log in directly. The admin will assign a group.
            Subscription starts as Active.
          </p>
          <div className="mt-6">
            <AuthForm mode="signup" />
          </div>
        </div>
      </div>
    </main>
  );
}
