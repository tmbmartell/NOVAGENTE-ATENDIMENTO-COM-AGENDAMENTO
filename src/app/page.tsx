import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export default async function Home() {
  const session = await getSessionOrNull();
  redirect(session ? "/inicio" : "/login");
}
