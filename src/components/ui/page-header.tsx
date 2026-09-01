import { PageApiPaths } from "@/components/layout/page-api-paths";
import type { ApiRef } from "@/components/ui/api-path";

export function PageHeader({
  title,
  description,
  actions,
  api,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  api?: ApiRef[];
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <PageApiPaths fallback={api} />
    </div>
  );
}
