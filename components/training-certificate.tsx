import Image from "next/image";

export type CertificateData = {
  studentName: string;
  groupName: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  percent: number;
  passed: boolean;
  correct: number;
  wrong: number;
  blank: number;
  rank: number | null;
  issuedOn: string;
  statusLabel: string;
};

function CornerOrnament({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 52V28C4 14.745 14.745 4 28 4h24"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 52V32C12 20.954 20.954 12 32 12h20"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <circle cx="28" cy="28" r="2.5" fill="currentColor" />
      <path d="M28 18v6M22 28h6" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

function Flourish() {
  return (
    <div className="cert-flourish flex items-center justify-center gap-3" aria-hidden>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#b8953d]" />
      <span className="flex h-2.5 w-2.5 rotate-45 border border-[#b8953d] bg-[#b8953d]/25" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#b8953d]" />
    </div>
  );
}

/** One A4 landscape industrial-training certificate from KASSH.IT. */
export function TrainingCertificate({ data }: { data: CertificateData }) {
  const resultTone =
    data.statusLabel === "Pass"
      ? "text-[#0f6b3c]"
      : data.statusLabel === "Terminated"
        ? "text-[#9b1c1c]"
        : "text-[#8a4b08]";

  return (
    <article className="certificate-sheet cert-stage print-keep relative mx-auto box-border flex min-h-[190mm] w-full max-w-[280mm] flex-col overflow-hidden text-ink shadow-[0_25px_60px_-20px_rgba(15,23,42,0.35)] print:max-w-none print:shadow-none">
      {/* Outer gold edge */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2332] via-[#0f172a] to-[#243044]" />
      <div className="absolute inset-[5px] bg-gradient-to-br from-[#d4b56a] via-[#b8953d] to-[#8c6d28]" />
      <div className="absolute inset-[8px] bg-gradient-to-br from-[#1a2332] via-[#111827] to-[#1e293b]" />

      {/* Paper face */}
      <div className="cert-paper absolute inset-[12px] overflow-hidden bg-[#f7f9fc]">
        {/* Atmosphere */}
        <div
          className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[#c9a84c]/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-[#1e3a5f]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
          aria-hidden
        />

        {/* Watermark — multiply drops the white square from the PNG */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <Image
            src="/kasshit-logo.png"
            alt=""
            width={560}
            height={560}
            className="h-[72%] w-auto max-w-[72%] object-contain opacity-[0.09] mix-blend-multiply"
            priority
          />
        </div>

        {/* Corner ornaments */}
        <CornerOrnament className="pointer-events-none absolute left-4 top-4 text-[#b8953d]" />
        <CornerOrnament className="pointer-events-none absolute right-4 top-4 rotate-90 text-[#b8953d]" />
        <CornerOrnament className="pointer-events-none absolute bottom-4 left-4 -rotate-90 text-[#b8953d]" />
        <CornerOrnament className="pointer-events-none absolute bottom-4 right-4 rotate-180 text-[#b8953d]" />

        <div className="relative z-10 flex h-full min-h-[calc(190mm-24px)] flex-col px-10 py-7 sm:px-12">
          <header className="flex items-start justify-between gap-6">
            {/* Logo already includes wordmark + tagline — no circle, no duplicate text */}
            <div className="ml-2 mt-1">
              <Image
                src="/kasshit-logo.png"
                alt="KASSH.IT"
                width={160}
                height={160}
                className="h-[92px] w-auto object-contain mix-blend-multiply"
                priority
              />
            </div>

            <div className="rounded-lg border border-[#b8953d]/35 bg-white/70 px-4 py-2.5 text-right backdrop-blur-[2px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b8953d]">
                Industrial Training
              </p>
              <p className="mt-1 text-[12px] font-medium text-[#0f172a]">
                Womans Polytechnic College
              </p>
              <p className="text-[11px] text-[#64748b]">Srinagar</p>
              <p className="mt-1.5 text-[11px] text-[#475569]">Issued {data.issuedOn}</p>
            </div>
          </header>

          <div className="mt-5 flex flex-1 flex-col items-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-[#b8953d]">
              Certificate of Completion
            </p>
            <h1 className="font-display mt-2 bg-gradient-to-b from-[#0f172a] to-[#334155] bg-clip-text text-[40px] leading-none tracking-wide text-transparent sm:text-[46px]">
              Industrial Training
            </h1>
            <div className="mt-3">
              <Flourish />
            </div>

            <p className="mt-5 text-[13px] italic tracking-wide text-[#64748b]">
              This is to certify that
            </p>
            <p className="font-display mt-2 text-[42px] leading-tight tracking-tight text-[#0f172a] sm:text-[48px]">
              {data.studentName}
            </p>
            <div className="mt-2 h-px w-48 bg-gradient-to-r from-transparent via-[#b8953d] to-transparent" />
            {data.groupName ? (
              <p className="mt-2 text-[13px] font-medium tracking-wide text-[#475569]">
                {data.groupName}
              </p>
            ) : null}

            <p className="mx-auto mt-4 max-w-[640px] text-[13.5px] leading-relaxed text-[#334155]">
              has successfully completed the industrial training programme{" "}
              <span className="font-semibold text-[#0f172a]">{data.examTitle}</span>, covering
              development to deployment — including React, JavaScript, and related technologies —
              conducted and certified by{" "}
              <span className="font-semibold tracking-wide text-[#0f172a]">KASSH.IT</span>.
            </p>

            {/* Marks ribbon */}
            <div className="mt-6 w-full max-w-[680px] overflow-hidden rounded-xl border border-[#b8953d]/40 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] p-[1px] shadow-[0_12px_30px_-16px_rgba(15,23,42,0.55)]">
              <div className="grid grid-cols-2 gap-px bg-[#b8953d]/25 sm:grid-cols-4">
                {[
                  { label: "Score", value: `${data.score} / ${data.totalMarks}` },
                  { label: "Percentage", value: `${data.percent}%` },
                  { label: "Result", value: data.statusLabel, accent: true },
                  { label: "Rank", value: data.rank != null ? `#${data.rank}` : "—" },
                ].map((box) => (
                  <div
                    key={box.label}
                    className="bg-[#f7f9fc] px-3 py-3 first:rounded-tl-[10px] last:sm:rounded-tr-none sm:first:rounded-bl-[10px] sm:last:rounded-tr-[10px]"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
                      {box.label}
                    </p>
                    <p
                      className={`font-display mt-1 text-[22px] leading-none ${
                        box.accent ? resultTone : "text-[#0f172a]"
                      }`}
                    >
                      {box.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[11px] tracking-wide text-[#64748b]">
              Correct {data.correct}
              <span className="mx-2 text-[#cbd5e1]">|</span>
              Wrong {data.wrong}
              <span className="mx-2 text-[#cbd5e1]">|</span>
              Blank {data.blank}
            </p>
          </div>

          <footer className="mt-5 flex items-end justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="cert-seal relative flex h-[78px] w-[78px] items-center justify-center rounded-full border-2 border-[#b8953d] bg-gradient-to-br from-[#fff8e8] to-[#f3e7c4] shadow-[inset_0_0_0_4px_rgba(15,23,42,0.06)]">
                <div className="absolute inset-1 rounded-full border border-dashed border-[#b8953d]/70" />
                <div className="relative text-center">
                  <p className="text-[9px] font-bold tracking-[0.14em] text-[#0f172a]">KASSH.IT</p>
                  <p className="mt-0.5 text-[8px] uppercase tracking-wider text-[#8c6d28]">
                    Certified
                  </p>
                </div>
              </div>
              <div className="text-left text-[11px] leading-relaxed text-[#64748b]">
                <p>Training & assessment by</p>
                <p className="font-semibold tracking-wide text-[#0f172a]">KASSH.IT</p>
                <p>Development → Deployment</p>
              </div>
            </div>

            <div className="min-w-[210px] text-center">
              <div className="mx-auto mb-1 flex h-11 w-48 items-end justify-center">
                <p className="font-display text-[22px] italic leading-none text-[#1e293b]/80">
                  Sajid Nazir
                </p>
              </div>
              <div className="mx-auto h-px w-44 bg-gradient-to-r from-transparent via-[#0f172a] to-transparent" />
              <p className="mt-1.5 text-[13px] font-semibold text-[#0f172a]">Sajid Nazir</p>
              <p className="text-[11px] text-[#64748b]">Founder & Co-founder, KASSH.IT</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#b8953d]">Trainer</p>
            </div>
          </footer>
        </div>
      </div>
    </article>
  );
}
