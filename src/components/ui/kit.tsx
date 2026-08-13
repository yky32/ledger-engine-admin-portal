import { clsx } from "@/lib/format";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  className,
  right,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <section className={clsx("card", className)}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "ok" | "warn" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-950",
    error: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone];
  return (
    <div className={clsx("rounded-xl border px-3 py-2.5 text-sm", styles)}>{children}</div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "error" | "info";
}) {
  const styles = {
    neutral: "bg-slate-100 text-slate-700",
    ok: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-900",
    error: "bg-rose-100 text-rose-800",
    info: "bg-sky-100 text-sky-800",
  }[tone];
  return <span className={clsx("chip", styles)}>{children}</span>;
}

export function JsonBlock({ value, maxHeight = 320 }: { value: unknown; maxHeight?: number }) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2) ?? String(value);
  return (
    <pre
      className="scrollbar-thin overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-100/90"
      style={{ maxHeight }}
    >
      {text}
    </pre>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
      {label}
    </div>
  );
}
