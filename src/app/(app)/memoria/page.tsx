import { redirect } from "next/navigation";
/** Compatibilidade: a Memória Inteligente agora é uma aba da Agenda. */
export default function FormerMemoryPage() {
  redirect("/bookings?aba=memoria");
}
