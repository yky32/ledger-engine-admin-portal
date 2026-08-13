"use client";
import SimpleResourcePage from "@/components/resource/simple-resource";

export default function Page() {
  return (
    <SimpleResourcePage
      title="Rules (legacy catalog)"
      description="GET/POST /rules — not Digestion Brain. Body: name, description?, direction?, multiplier?, targetAccount?, content?"
      listPath="/rules"
      createPath="/rules"
      pageable
      sample={{
        name: "demo-rule",
        description: "legacy",
        direction: "CREDIT",
        multiplier: 1,
        targetAccount: null,
        content: "{}",
      }}
    />
  );
}
