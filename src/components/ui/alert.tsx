import { Alert as KitAlert } from "@/components/ui/kit";

/** Back-compat wrapper — new code should import Alert from `@/components/ui/kit`. */
export function Alert({
  variant = "error",
  tone,
  children,
}: {
  variant?: "error" | "success" | "info";
  tone?: "info" | "ok" | "warn" | "error";
  children: React.ReactNode;
}) {
  const mapped =
    tone ?? (variant === "success" ? "ok" : variant === "error" ? "error" : "info");
  return <KitAlert tone={mapped}>{children}</KitAlert>;
}
