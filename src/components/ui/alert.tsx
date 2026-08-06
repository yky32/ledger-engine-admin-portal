import { cn } from "@/lib/utils";

export function Alert({
  variant = "error",
  children,
}: {
  variant?: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        variant === "error" && "border-red-200 bg-red-50 text-red-800",
        variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        variant === "info" && "border-sky-200 bg-sky-50 text-sky-800",
      )}
    >
      {children}
    </div>
  );
}
