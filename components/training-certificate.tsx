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

/** One A4 landscape industrial-training certificate from KASSH.IT. */
export function TrainingCertificate({ data }: { data: CertificateData }) {
  return (
    <article className="certificate-sheet print-keep relative mx-auto box-border flex min-h-[190mm] w-full max-w-[280mm] flex-col overflow-hidden border-[3px] border-ink bg-[#fbfaf7] px-10 py-8 text-ink shadow-sm print:max-w-none print:shadow-none">
      {/* Inner ornamental frame */}
      <div className="pointer-events-none absolute inset-3 border border-ink/25" aria-hidden />

      {/* Watermark */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]"
        aria-hidden
      >
        <Image
          src="/kasshit-logo.png"
          alt=""
          width={520}
          height={520}
          className="h-[70%] w-auto max-w-[70%] object-contain"
          priority
        />
      </div>

      <header className="relative z-10 flex items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <Image
            src="/kasshit-logo.png"
            alt="KASSH.IT"
            width={96}
            height={96}
            className="h-20 w-20 object-contain"
            priority
          />
          <div className="pt-1">
            <p className="text-lg font-bold tracking-[0.18em]">KASSH.IT</p>
            <p className="mt-0.5 text-[11px] tracking-wide text-muted">
              Everyday. Reliable. Promised.
            </p>
          </div>
        </div>
        <div className="max-w-[220px] text-right text-[11px] leading-relaxed text-muted">
          <p className="font-medium text-ink">Industrial Training</p>
          <p>Womans Polytechnic College Srinagar</p>
          <p className="mt-1">Issued {data.issuedOn}</p>
        </div>
      </header>

      <div className="relative z-10 mt-6 flex flex-1 flex-col items-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">
          Certificate of Completion
        </p>
        <h1 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">
          Industrial Training
        </h1>
        <div className="mt-3 h-px w-24 bg-ink/40" />

        <p className="mt-6 text-sm text-muted">This is to certify that</p>
        <p className="font-display mt-2 text-3xl sm:text-4xl">{data.studentName}</p>
        {data.groupName ? (
          <p className="mt-1 text-sm text-muted">{data.groupName}</p>
        ) : null}

        <p className="mx-auto mt-5 max-w-[620px] text-sm leading-relaxed text-ink/90">
          has completed the industrial training programme{" "}
          <span className="font-semibold">{data.examTitle}</span>, covering development to
          deployment including React, JavaScript, and related technologies, conducted and
          certified by <span className="font-semibold">KASSH.IT</span>.
        </p>

        <div className="mt-7 grid w-full max-w-[640px] grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Score", value: `${data.score} / ${data.totalMarks}` },
            { label: "Percentage", value: `${data.percent}%` },
            {
              label: "Result",
              value: data.statusLabel,
            },
            { label: "Rank", value: data.rank != null ? String(data.rank) : "—" },
          ].map((box) => (
            <div
              key={box.label}
              className="rounded-md border border-ink/20 bg-white/70 px-3 py-2.5"
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{box.label}</p>
              <p className="font-display mt-1 text-xl">{box.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted">
          Correct {data.correct} · Wrong {data.wrong} · Blank {data.blank}
        </p>
      </div>

      <footer className="relative z-10 mt-8 flex items-end justify-between gap-8">
        <div className="text-left text-[11px] text-muted">
          <p>Training & assessment by</p>
          <p className="mt-0.5 font-semibold text-ink">KASSH.IT</p>
        </div>
        <div className="min-w-[200px] text-center">
          <div className="mx-auto mb-2 h-10 w-40 border-b border-ink/50" />
          <p className="text-sm font-semibold">Sajid Nazir</p>
          <p className="text-[11px] text-muted">Founder & Co-founder, KASSH.IT</p>
          <p className="text-[11px] text-muted">Trainer</p>
        </div>
      </footer>
    </article>
  );
}
