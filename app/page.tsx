import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session?.role === "ADMIN") redirect("/admin");
  if (session) redirect("/student");

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-ink">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted">
              Womans Polytechnic College Srinagar
            </p>
            <p className="font-display text-3xl">Training Desk</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-off-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Sign up
            </Link>
          </div>
        </header>

        <section className="mt-16 grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-primary">30-day training desk</p>
            <h1 className="font-display mt-3 max-w-xl text-5xl leading-[1.05] md:text-7xl">
              Attendance. Daily lessons. Student progress.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              Manage group-wise 30-day attendance, keep a daily lesson log, and receive
              questions or feedback from students. Email and password login — no OTP.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Student sign up
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium hover:bg-off-white"
              >
                Admin / student login
              </Link>
            </div>
          </div>
          <div className="rounded-[28px] border border-line bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm text-muted">What this desk tracks</p>
            <ul className="mt-4 space-y-4">
              {[
                ["30-day attendance", "Each student's present / absent / late record with streak and average."],
                ["Daily lesson log", "Topic and teaching method — lecture, lab, demo, or project work."],
                ["Groups + feedback", "Group-wise student lists, subscriptions, and a comments box for questions."],
              ].map(([title, body]) => (
                <li key={title} className="rounded-2xl bg-off-white px-4 py-3">
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
