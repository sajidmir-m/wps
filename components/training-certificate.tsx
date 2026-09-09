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
      width="48"
      height="48"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 52V28C4 14.745 14.745 4 28 4h24"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M12 52V32C12 20.954 20.954 12 32 12h20"
        stroke="currentColor"
        strokeWidth="1.1"
        opacity="0.55"
      />
      <circle cx="28" cy="28" r="2.5" fill="currentColor" />
    </svg>
  );
}

function Flourish() {
  return (
    <div className="cert-flourish flex items-center justify-center gap-3" aria-hidden>
      <span className="inline-block h-[2px] w-14 border-0 bg-[#b8953d]" />
      <span className="inline-block h-2.5 w-2.5 rotate-45 border border-[#b8953d] bg-[#b8953d]" />
      <span className="inline-block h-[2px] w-14 border-0 bg-[#b8953d]" />
    </div>
  );
}

/**
 * Print-safe certificate: real borders + solid text (not CSS backgrounds /
 * text-transparent), so Chrome still shows content when “Background graphics”
 * is off.
 */
export function TrainingCertificate({ data }: { data: CertificateData }) {
  const resultTone =
    data.statusLabel === "Pass"
      ? "text-[#0f6b3c]"
      : data.statusLabel === "Terminated"
        ? "text-[#9b1c1c]"
        : "text-[#8a4b08]";

  return (
    <article className="certificate-sheet cert-stage print-keep relative mx-auto box-border w-full max-w-[280mm] overflow-hidden border-[10px] border-[#0f172a] bg-white text-[#0f172a] shadow-[0_25px_60px_-20px_rgba(15,23,42,0.35)] print:max-w-none print:shadow-none">
      {/* Gold + inner slate frames use BORDERS so they survive print without backgrounds */}
      <div className="border-[5px] border-[#b8953d]">
        <div className="relative border-[3px] border-[#0f172a]">
          <div className="relative border border-[#b8953d]/70 px-8 py-6 sm:px-10 sm:py-7">
            <CornerOrnament className="pointer-events-none absolute left-2 top-2 text-[#b8953d]" />
            <CornerOrnament className="pointer-events-none absolute right-2 top-2 rotate-90 text-[#b8953d]" />
            <CornerOrnament className="pointer-events-none absolute bottom-2 left-2 -rotate-90 text-[#b8953d]" />
            <CornerOrnament className="pointer-events-none absolute bottom-2 right-2 rotate-180 text-[#b8953d]" />

            {/* Watermark as real image (prints even if backgrounds are off) */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kasshit-logo.png"
                alt=""
                className="h-[68%] w-auto max-w-[68%] object-contain opacity-[0.07]"
              />
            </div>

            <header className="relative z-10 flex items-start justify-between gap-6">
              <div className="ml-1 mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kasshit-logo.png"
                  alt="KASSH.IT"
                  className="h-[88px] w-auto object-contain"
                />
              </div>

              <div className="rounded-md border border-[#b8953d] px-4 py-2.5 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8c6d28]">
                  Industrial Training
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#0f172a]">
                  Womans Polytechnic College
                </p>
                <p className="text-[11px] text-[#475569]">Srinagar</p>
                <p className="mt-1.5 text-[11px] text-[#334155]">Issued {data.issuedOn}</p>
              </div>
            </header>

            <div className="relative z-10 mt-4 flex flex-col items-center text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-[#8c6d28]">
                Certificate of Completion
              </p>
              {/* Solid text — never text-transparent (that vanishes when print backgrounds are off) */}
              <h1 className="font-display mt-2 text-[40px] leading-none tracking-wide text-[#0f172a] sm:text-[44px]">
                Industrial Training
              </h1>
              <div className="mt-3">
                <Flourish />
              </div>

              <p className="mt-4 text-[13px] italic tracking-wide text-[#475569]">
                This is to certify that
              </p>
              <p className="font-display mt-2 text-[40px] leading-tight tracking-tight text-[#0f172a] sm:text-[46px]">
                {data.studentName}
              </p>
              <div className="mt-2 h-[2px] w-44 bg-[#b8953d]" />
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

              <div className="mt-5 w-full max-w-[680px] border-2 border-[#0f172a]">
                <div className="grid grid-cols-2 border-[#b8953d] sm:grid-cols-4">
                  {[
                    { label: "Score", value: `${data.score} / ${data.totalMarks}` },
                    { label: "Percentage", value: `${data.percent}%` },
                    { label: "Result", value: data.statusLabel, accent: true },
                    { label: "Rank", value: data.rank != null ? `#${data.rank}` : "—" },
                  ].map((box, i) => (
                    <div
                      key={box.label}
                      className={`border border-[#b8953d]/50 px-3 py-3 ${
                        i < 3 ? "sm:border-r" : ""
                      }`}
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#64748b]">
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

              <p className="mt-3 text-[11px] tracking-wide text-[#475569]">
                Correct {data.correct}
                <span className="mx-2 text-[#94a3b8]">|</span>
                Wrong {data.wrong}
                <span className="mx-2 text-[#94a3b8]">|</span>
                Blank {data.blank}
              </p>
            </div>

            <footer className="relative z-10 mt-5 flex items-end justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="cert-seal relative flex h-[74px] w-[74px] items-center justify-center rounded-full border-2 border-[#b8953d]">
                  <div className="absolute inset-1 rounded-full border border-dashed border-[#b8953d]" />
                  <div className="relative text-center">
                    <p className="text-[9px] font-bold tracking-[0.14em] text-[#0f172a]">KASSH.IT</p>
                    <p className="mt-0.5 text-[8px] uppercase tracking-wider text-[#8c6d28]">
                      Certified
                    </p>
                  </div>
                </div>
                <div className="text-left text-[11px] leading-relaxed text-[#475569]">
                  <p>Training & assessment by</p>
                  <p className="font-semibold tracking-wide text-[#0f172a]">KASSH.IT</p>
                  <p>Development → Deployment</p>
                </div>
              </div>

              <div className="min-w-[210px] text-center">
                <p className="font-display text-[22px] italic leading-none text-[#1e293b]">
                  Sajid Nazir
                </p>
                <div className="mx-auto mt-2 h-[1.5px] w-44 bg-[#0f172a]" />
                <p className="mt-1.5 text-[13px] font-semibold text-[#0f172a]">Sajid Nazir</p>
                <p className="text-[11px] text-[#475569]">Founder & Co-founder, KASSH.IT</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8c6d28]">Trainer</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </article>
  );
}
