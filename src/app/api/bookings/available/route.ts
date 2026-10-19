import { apiError, withAuth } from "@/lib/api";
import { agendaDisabledResponse, agendaEnabled } from "@/server/agenda/flag";
import { computeAvailability } from "@/server/agenda/availability";
import { getSettings } from "@/server/agenda/settings";
import { addDaysISO, todayInTz } from "@/lib/time/slots";
import { isIsoDate } from "@/lib/time/calendar";

export const dynamic = "force-dynamic";
/** Somente usuários do CRM, nunca endpoint público de slots. */
export const GET = withAuth(async (session, req: Request) => {
  if (!agendaEnabled()) return agendaDisabledResponse();
  const settings = await getSettings(session.organizationId);
  const today = todayInTz(new Date(), settings.timezone);
  const day = new URL(req.url).searchParams.get("day") || today;
  if (!isIsoDate(day) || day < today || day > addDaysISO(today, Math.min(settings.maxDaysAhead, 60))) {
    return apiError(422, "invalid_day", "Escolha uma data futura permitida na agenda");
  }
  const slots = await computeAvailability(session.organizationId, { fromISO: day, toISO: day, settings });
  return Response.json({
    slots: slots.map(({ startUtc, label }) => ({ startUtc, label })),
    timezone: settings.timezone,
  }, { headers: { "Cache-Control": "no-store" } });
});
