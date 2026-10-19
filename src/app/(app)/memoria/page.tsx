import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { MemoryClient } from "@/components/meeting-memory/memory-client";

export const dynamic = "force-dynamic";
export default async function MemoriaPage() {
  if (!(await getSessionOrNull())) redirect("/login");
  return <MemoryClient />;
}
