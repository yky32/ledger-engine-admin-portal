"use client";

const SEGMENTS = [
  { sheet: "Entity", sample: "01", hint: "Credit card", digits: "2" },
  { sheet: "Account Type", sample: "01", hint: "Custodian", digits: "2" },
  { sheet: "Sub-Account Type", sample: "01", hint: "Individual", digits: "2" },
  { sheet: "Account Number", sample: "9089…", hint: "Card / 9999 house", digits: "n" },
  { sheet: "Buffer", sample: "00", hint: "UA always 00", digits: "2" },
  { sheet: "Currency", sample: "HKD", hint: "344 in fullNumber", digits: "3" },
] as const;

const EXAMPLES = [
  {
    side: "CUSTOMER",
    label: "Customer custodian",
    stem: "01-01-01",
    main: "{mainAccount}",
    ccy: "HKD / LP",
    note: "Member books. One wallet per ownerId. Display name {ownerId}-{ccy}.",
  },
  {
    side: "HOUSE",
    label: "House operating",
    stem: "01-02-01",
    main: "9999",
    ccy: "HKD / LP",
    note: "Earn counterparty. DR house / CR member. Same currency.",
  },
] as const;

export function CoaHero() {
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-sm">
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
          Chart of accounts
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
          A book is a digit string — not a name
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-300">
          Same columns as the finance sheet. Concatenate them (plus a 2-digit buffer) into{" "}
          <span className="font-mono text-emerald-300">fullNumber</span>. Dictionary names the
          digits; House / Customer COA open the live books.
        </p>

        <ol className="mt-4 flex flex-wrap items-stretch gap-1.5 sm:gap-2">
          {SEGMENTS.map((seg, i) => (
            <li key={seg.sheet} className="flex min-w-[5.5rem] flex-1 items-center gap-1.5 sm:min-w-[7rem]">
              {i > 0 ? (
                <span className="hidden text-slate-500 sm:inline" aria-hidden>
                  +
                </span>
              ) : null}
              <div className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {seg.sheet}
                  <span className="ml-1 font-mono font-normal text-slate-500">{seg.digits}</span>
                </div>
                <div className="mt-0.5 font-mono text-base font-semibold text-emerald-300">{seg.sample}</div>
                <div className="text-[11px] text-slate-400">{seg.hint}</div>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-3 font-mono text-[11px] leading-relaxed text-slate-400 sm:text-xs">
          fullNumber = entity(2) + type(2) + subType(2) + mainAccount + buffer(2) + currency(3)
          <span className="mx-2 text-slate-600">→</span>
          <span className="text-slate-200">01 01 01 908951901284 00 344</span>
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <div
              key={ex.stem}
              className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    ex.side === "HOUSE"
                      ? "chip bg-sky-500/20 text-sky-200"
                      : "chip bg-emerald-500/20 text-emerald-200"
                  }
                >
                  {ex.side}
                </span>
                <span className="font-mono text-xs text-slate-300">
                  {ex.stem}-{ex.main}-00-{ex.ccy.split(" ")[0]}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-medium text-white">{ex.label}</div>
              <p className="mt-0.5 text-[12px] leading-snug text-slate-400">{ex.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
