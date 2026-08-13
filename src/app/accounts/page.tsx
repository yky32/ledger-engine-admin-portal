"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="COA accounts"
      description="GET /accounts (legacy path if present)"
      listPath="/accounts"
    />
  );
}
