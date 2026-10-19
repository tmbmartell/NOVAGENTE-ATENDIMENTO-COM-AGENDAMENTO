import { getBranding } from "@/server/branding";
import { DEFAULT_BRANDING } from "@/lib/branding";
import { BrandLogo } from "@/components/brand-mark";
import { ArrowUpRight, MessageSquareText, Workflow, ShieldCheck } from "lucide-react";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f2f7f3] px-4 py-10 sm:px-7">
      <div className="ng-dots absolute inset-0 opacity-70" aria-hidden />
      <div className="relative grid w-full max-w-[1050px] overflow-hidden rounded-[28px] border border-[#d5e6dc] bg-white shadow-[0_32px_100px_-35px_rgba(15,63,45,.32)] lg:grid-cols-[1fr_0.92fr]">
        <section className="ng-panel-hero relative hidden min-h-[650px] flex-col justify-between overflow-hidden p-10 text-white lg:flex">
          <div className="relative z-10 flex items-center gap-2 text-xs font-semibold tracking-[0.26em]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10">
              <Workflow className="h-4 w-4" />
            </span>
            TECNOLOGIA QUE TRABALHA COM VOCÊ
          </div>
          <div className="relative z-10 max-w-md">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-widest text-[#cbf2d9]">
              NOVA FORMA DE OPERAR <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
            <h1 className="text-[46px] font-[750] leading-[1.1] tracking-[-0.065em]">
              Menos tarefas soltas.<br/>
              <span className="text-[#b0eac8]">Mais negócios acontecendo.</span>
            </h1>
            <p className="mt-6 max-w-sm text-[15px] leading-7 text-[#d0e9dc]">
              Um lugar para acompanhar conversas, organizar oportunidades
              e unir sua operação à inteligência artificial.
            </p>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[
              { Icon: MessageSquareText, label: "Atendimento" },
              { Icon: Workflow, label: "Processos" },
              { Icon: ShieldCheck, label: "Controle" },
            ].map(({Icon,label}) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-white/[.06] p-3">
                <Icon className="mb-4 h-5 w-5 text-[#b0eac8]" strokeWidth={1.5}/>
                <span className="text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="flex min-h-[540px] flex-col justify-center px-5 py-10 sm:px-12 lg:px-14">
          <div className="mb-10">
            <BrandLogo branding={branding} size="lg" />
            <div className="mt-6 h-px w-16 bg-[#b1dac5]" />
            <p className="mt-5 text-sm leading-6 text-text-2">
              Bem-vindo à sua central de operações.
            </p>
          </div>
          <div className="w-full max-w-[380px]">{children}</div>
          <p className="mt-10 text-xs text-text-3">Uma experiência NOVAGENTE · Acesso protegido</p>
        </section>
      </div>
    </main>
  );
}
