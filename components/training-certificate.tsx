export type CertificateData = {
  studentName: string;
  groupName: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  percent: number;
  passed: boolean;
  rank: number | null;
  /** Unique certificate ID, e.g. KASSH-IT-260926-A1B2C3 */
  certificateId: string;
  /** Fixed display date, e.g. 26-09-2026 */
  issuedOn: string;
  statusLabel: string;
};

/** Stable unique certificate ID from exam + attempt (same every print). */
export function buildCertificateId(examId: string, attemptId: string) {
  const compact = `${examId.replace(/-/g, "")}${attemptId.replace(/-/g, "")}`
    .slice(-10)
    .toUpperCase();
  return `KASSH-IT-260926-${compact}`;
}

function Flourish() {
  return (
    <div className="cert-flourish flex items-center justify-center gap-3" aria-hidden>
      <span className="inline-block h-[2px] w-16 border-0 bg-[#b8953d]" />
      <span className="inline-block h-2.5 w-2.5 rotate-45 border border-[#b8953d] bg-[#b8953d]" />
      <span className="inline-block h-[2px] w-16 border-0 bg-[#b8953d]" />
    </div>
  );
}

/**
 * Print-safe A4 landscape industrial training certificate.
 * Copy matches the official KASSH.IT completion wording.
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
      <div className="border-[5px] border-[#b8953d]">
        <div className="relative border-[3px] border-[#0f172a]">
          <div className="relative border border-[#b8953d]/70 px-8 pb-6 pt-[92px] sm:px-10 sm:pb-7 sm:pt-[96px]">
            {/* Watermark */}
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

            {/* Logos fixed to top-left and top-right corners */}
            <div className="absolute left-3 top-3 z-10 flex max-w-[140px] flex-col items-start gap-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kasshit-logo.png"
                alt="KASSH.IT"
                className="h-[72px] w-auto object-contain"
              />
              <p className="text-[11px] font-semibold tracking-wide text-[#0f172a]">kasshit.in</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/msme-logo.svg"
              alt="MSME"
              className="absolute right-3 top-3 z-10 h-[68px] w-auto object-contain"
            />

            <div className="relative z-10 flex flex-col items-center text-center">
              <h1 className="font-display text-[34px] font-semibold uppercase leading-none tracking-[0.12em] text-[#b8953d] sm:text-[40px]">
                Certificate of Completion
              </h1>
              <p className="mt-2 text-[18px] font-semibold tracking-wide text-[#0f172a]">
                Industrial Training
              </p>
              <div className="mt-2.5">
                <Flourish />
              </div>

              <p className="mt-4 text-[13px] italic tracking-wide text-[#0f172a]">
                This is to certify that
              </p>
              <p className="font-display mt-2 text-[40px] leading-tight tracking-tight text-[#0f172a] sm:text-[44px]">
                {data.studentName}
              </p>
              <div className="mt-2 h-[2px] w-44 bg-[#b8953d]" />

              <p className="mx-auto mt-4 max-w-[620px] text-[13.5px] font-bold leading-snug text-[#0f172a]">
                has successfully completed the Four-Week Offline Industrial Training Programme on
                &ldquo;Web Development, GitHub, Vercel &amp; Artificial Intelligence&rdquo;
                conducted at Government Polytechnic for Women, Srinagar, and certified by KASSH.IT.
              </p>

              <p className="mx-auto mt-3 max-w-[640px] text-[12.5px] leading-relaxed text-[#0f172a]">
                The training provided practical exposure to Web Development, JavaScript, React,
                GitHub, Vercel, Artificial Intelligence, and related technologies, covering the
                development-to-deployment process.
              </p>

              <div className="mt-5 w-full max-w-[640px] border-2 border-[#0f172a]">
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  {[
                    { label: "Total marks", value: `${data.score} / ${data.totalMarks}` },
                    { label: "Percentage", value: `${data.percent}%` },
                    { label: "Result", value: data.statusLabel, accent: true },
                    { label: "Rank", value: data.rank != null ? `#${data.rank}` : "—" },
                  ].map((box, i) => (
                    <div
                      key={box.label}
                      className={`border border-[#b8953d]/50 px-3 py-2.5 ${
                        i < 3 ? "sm:border-r" : ""
                      }`}
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                        {box.label}
                      </p>
                      <p
                        className={`font-display mt-1 text-[20px] leading-none ${
                          box.accent ? resultTone : "text-[#0f172a]"
                        }`}
                      >
                        {box.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <footer className="relative z-10 mt-6 grid grid-cols-3 items-end gap-4">
              <div className="text-left text-[11px] leading-relaxed text-[#475569]">
                <div className="mb-2 flex h-[64px] w-[64px] items-center justify-center rounded-full border-2 border-[#b8953d]">
                  <div className="text-center">
                    <p className="text-[8px] font-bold tracking-[0.12em] text-[#0f172a]">KASSH.IT</p>
                    <p className="text-[7px] uppercase tracking-wider text-[#8c6d28]">Certified</p>
                  </div>
                </div>
                <p>
                  Training &amp; assessment by{" "}
                  <span className="font-semibold text-[#0f172a]">KASSH.IT</span>
                </p>
                <p className="font-medium text-[#034ea1]">kasshit.in</p>
                <p className="mt-0.5 text-[10px]">MSME · UDYAM-JK-21-0084881</p>
              </div>

              <div className="text-center text-[11px] leading-relaxed text-[#334155]">
                <p>
                  <span className="font-semibold">Certificate UID:</span>{" "}
                  <span className="font-mono tracking-wide">{data.certificateId}</span>
                </p>
                <p className="mt-1.5">
                  <span className="font-semibold">Issue Date:</span> {data.issuedOn}
                </p>
              </div>

              <div className="min-w-[180px] text-center">
                <div className="mx-auto mb-1 h-10 w-40 border-b border-[#0f172a]" />
                <p className="text-[13px] font-semibold text-[#0f172a]">Authorized Signatory</p>
                <p className="text-[12px] font-semibold tracking-wide text-[#0f172a]">KASSH.IT</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </article>
  );
}
