import type { SessionContext } from "@/lib/auth/session";
import { canConfigure } from "@/lib/auth/roles";
import { wahaEnabled } from "@/server/waha/config";
import {
  onboardingStatus,
  type OnboardingStatus,
  type ReadinessStep,
} from "./status";

/**
 * La guía de inicio: tres pasos (cuatro con la agenda) y nada más (issue #86).
 *
 * Es lo primero que ve quien instala Vocero: configurar el agente, vincular
 * el proveedor de IA, conectar el número y, si la agenda existe en esta
 * instancia, dejarla lista. Al terminar, un botón enciende el agente. Lo
 * demás —la Bandeja, el Pipeline— ya está en el menú; la guía no lo repite.
 *
 * El estado de cada paso sale de `onboardingStatus`, la misma fuente que ya
 * verifica cada conexión: la guía no inventa su propia noción de «listo».
 * Puerto de `onboarding/guide.ts` de Vocero Cloud sin lo que allá es de la
 * plataforma (modelo fijado por soporte, agencias, planes).
 */
export type GuideStep = {
  key: "agent" | "ai" | "whatsapp" | "calendar";
  title: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
  /** Lo que falta, cuando no es lo obvio del paso. */
  hint: string | null;
};

export type Guide = {
  steps: GuideStep[];
  complete: boolean;
  /** El agente ya está encendido. */
  enabled: boolean;
};

const ready = (s: ReadinessStep | undefined) => s?.status === "ready";

/** Pura: de los pasos verificados a los de la guía. */
export function guideFrom(status: OnboardingStatus): Guide {
  const step = (key: ReadinessStep["key"]) =>
    status.steps.find((s) => s.key === key);
  const profile = step("profile");
  const ai = step("ai");
  const whatsapp = step("whatsapp");
  const calendar = step("calendar");

  const steps: GuideStep[] = [
    {
      key: "agent",
      title: "Personalize seu agente",
      description:
        "Escolha um nome, descreva seu negócio e defina como o agente deve atender. Você pode revisar tudo depois.",
      done: ready(profile),
      href: "/agent",
      cta: "Configurar agente",
      hint: ready(profile) ? null : (profile?.nextAction ?? null),
    },
    {
      key: "ai",
      title: "Conecte sua inteligência artificial",
      description:
        "Escolha o provedor de IA e o modelo. As chaves ficam protegidas nesta instalação.",
      done: ready(ai),
      href: "/settings/ai",
      cta: "Configurar IA",
      hint: ai?.problem ?? null,
    },
    {
      key: "whatsapp",
      title: "Conecte o WhatsApp",
      description:
        wahaEnabled()
          ? "Conecte seu número pelo QR Code da sessão exclusiva WAHA. As mensagens chegarão ao painel."
          : "Conecte o WhatsApp da empresa e centralize todos os atendimentos.",
      done: ready(whatsapp),
      href: "/settings/whatsapp",
      cta: "Vincular WhatsApp",
      hint: whatsapp?.problem ?? null,
    },
  ];
  // Sin agenda en esta instancia el paso no existe: pintarlo «no aplica»
  // sería justo el tipo de ruido que la guía evita.
  if (calendar && calendar.status !== "not_applicable") {
    steps.push({
      key: "calendar",
      title: "Prepare sua agenda",
      description:
        "Defina seus horários e a forma de agendamento para clientes e equipe.",
      done: ready(calendar),
      href: "/settings/calendar",
      cta: "Configurar agenda",
      hint: calendar.problem,
    });
  }
  return { steps, complete: steps.every((s) => s.done), enabled: status.enabled };
}

export async function guideStatus(organizationId: string): Promise<Guide> {
  return guideFrom(await onboardingStatus(organizationId));
}

/**
 * ¿La guía es lo primero que ve esta persona al entrar?
 *
 * Solo a quien puede configurar (un miembro del equipo no puede hacer ninguno
 * de los pasos) y solo mientras falte algo: con todos los pasos listos y el
 * agente encendido se entra directo a la Bandeja, como siempre.
 *
 * Un negocio demo recién sembrado («Ferretería El Martillo») pasa por aquí
 * igual: el seed deja el agente configurado (paso 1 listo) pero no puede
 * vincular una llave de IA ni un número, y sin eso el agente no contesta.
 * Capturar `/` no encierra a nadie: el menú lleva a cualquier pantalla.
 */
export async function guideFirst(
  session: Pick<SessionContext, "organizationId" | "role">
): Promise<boolean> {
  if (!canConfigure(session.role)) return false;
  const guide = await guideStatus(session.organizationId);
  return !guide.complete || !guide.enabled;
}
