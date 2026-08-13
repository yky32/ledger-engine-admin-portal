import { redirect } from "next/navigation";

/** Legacy path → plural */
export default function LegacyIngestPolicyRedirect() {
  redirect("/ingest-policies");
}
