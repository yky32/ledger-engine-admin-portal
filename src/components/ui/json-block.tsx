import { formatJson } from "@/lib/utils";

export function JsonBlock({ value, maxHeight = 420 }: { value: unknown; maxHeight?: number }) {
  return (
    <pre
      className="overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-100"
      style={{ maxHeight }}
    >
      {formatJson(value)}
    </pre>
  );
}
