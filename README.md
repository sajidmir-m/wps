# Womans Polytechnic College Srinagar — Training Desk

English-language college training desk for attendance, daily lessons, and student feedback. Built on **Supabase** (Auth + PostgreSQL).

## What it does

- Admin dashboard: groups, students, 30-day attendance, reports
- Daily lesson log: topic and teaching method
- Email + password login / signup — no OTP
- Student subscription status (Active / Suspended / Expired)
- Comments box for questions and feedback
- Average attendance, streaks, and continuous attendance tracking

## Tech stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS 4
- Supabase Auth + Supabase Database (PostgreSQL)

## Setup

1. Create a project on [Supabase](https://supabase.com).
2. Copy your project URL and anon key into `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Open the Supabase SQL Editor and run each file in `supabase/migrations/` in order:
   - `001_schema.sql` — tables, row-level security, and the new-user trigger
   - `002_student_credentials.sql` — admin-only table holding each student's generated password
   - `003_exams.sql` — exams, question bank, one attempt per student, and the violation log
   - `004_exam_security.sql` — tighter RLS and answer-key integrity checks
4. Install dependencies and start the app:

```bash
npm install
npm run dev
```

5. Open http://localhost:3000

### Create the first admin

There are no built-in accounts. Create your own in the Supabase dashboard under **Authentication → Users → Add user**, tick **Confirm email**, and set the user metadata to:

```json
{ "name": "Your Name", "role": "ADMIN", "subscription": "ACTIVE" }
```

The trigger from `001_schema.sql` creates the matching profile row automatically. Log in with that email and password to reach the admin dashboard.

## Add your student list

Admin → **Students** → paste the list as:

```
Name, email
Name, email
```

Email is optional. Without one, an address is generated from the name.

## Student logins

Every student gets their own randomly generated password. Admin → **Student logins** shows one printable slip per student with their email and password; print it, cut the boxes, and hand them out.

Supabase only stores a password hash, so the readable copy lives in the admin-only `student_credentials` table. Use **New password** on a slip to reset one student, or **Generate new passwords** to reissue for everyone.

## Attendance and reports

Attendance is recorded per date — pick a date, mark each student, save. Admin → **Reports** shows a day-by-day summary plus each student's average, streak, and present/late/absent totals across every recorded day.

## Exams

Admin → **Exams** → create an exam, set the duration and marking, paste the questions, then **Publish to students**.

Questions are pasted in bulk, in either of two formats. The paste box detects which one you used.

**Answer key style** — numbered questions with lettered options and an `Answer:` line. Markdown headings and `---` dividers are ignored, so a whole paper can be pasted unchanged:

```
### 1. What is the Internet?

A. A collection of only websites
B. A global network of interconnected computers
C. A programming language
D. A browser

**Answer: B**
```

**Starred style** — a blank line between questions, the question on the first line, options underneath, and a `*` on the correct one:

```
Which instrument measures shaft diameter accurately?
Try square
*Vernier caliper
Spirit level
Measuring tape
```

Either way, a malformed question is reported by number rather than imported silently.

**Marking.** Each correct answer scores the "marks per correct" value and each wrong answer subtracts the penalty. Blank answers score zero, so guessing is discouraged. Defaults are +1 and −0.25.

**Every paper is different.** Question order and option order are shuffled per student when they press Start, and that layout is stored, so refreshing the page shows the same paper with answers intact. Correct answers are never sent to the browser — the paper is stripped on the server.

**One attempt only.** A `UNIQUE (exam_id, student_id)` constraint enforces this in the database, not just in the app. A terminated attempt still occupies the row, so the exam cannot be restarted.

**Leaving the window ends the exam.** Switching tabs, minimising, or moving to another app is detected and the attempt is terminated immediately: whatever was answered is graded, the paper is locked, and the student sees a terminated screen. Copy, cut, paste, print, right-click, and DevTools shortcuts are blocked and logged. A short settle period at the start avoids false terminations from the fullscreen prompt.

**Server-side security.** The timer is enforced on the server, not only in the browser — saving or submitting after `ends_at` auto-locks the paper. Answers are sanitised against the real question bank so forged option indexes are dropped. Finish updates are atomic (`status = IN_PROGRESS` only), so double-submit races cannot overwrite a terminated paper. Correct answers are never selected into the student page payload. Suspended students cannot start. One attempt is enforced by a database unique constraint.

**Watching it live.** Admin → **Exams** → **Monitor** refreshes every 8 seconds and shows who is writing, who has submitted, who was terminated, and every alert as it happens. Press **Turn alarm on** for an audible alert when a student leaves their window; browsers require that click before any page may play sound. Unread alerts also appear as a red banner on the admin dashboard.

**If someone is terminated unfairly**, use **Allow retake** on the monitor to clear their attempt so they can sit the exam again.

**Marks** stay hidden from students until you **Close exam**, so nobody can compare answers while others are still writing.

**Results.** Exams → **Results** shows a merit list ranked by score, with each student's correct, wrong and blank counts, percentage, and pass or fail. The pass mark is 40% of the paper's total. Students who never started are listed at the bottom as "Did not appear", and terminated attempts are labelled as such rather than silently marked fail. **Export PDF** produces a signed result sheet in the same A4 layout as the attendance report. The admin dashboard also carries a summary row per exam: appeared, passed, and class average.

## White theme & buttons

The app uses a clean white background with high-contrast blue primary buttons, green/red/yellow status buttons, and a dark sidebar. Buttons use solid fills or clear borders so text is always readable and never overlaps.
