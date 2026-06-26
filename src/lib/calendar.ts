import type { Meeting } from "@/lib/meetings";
import type { Project } from "@/lib/projects";
import type { ClientDirectoryEntry } from "@/lib/clients";
import type { Lead } from "@/lib/crm";

export type CalendarEventType = "MEETING" | "DELIVERABLE" | "RENEWAL";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string; // ISO date or datetime
  subtitle: string;
  href?: { to: string; params?: Record<string, string> };
}

export function buildCalendarEvents(data: {
  meetings: Meeting[];
  projects: Project[];
  clients: ClientDirectoryEntry[];
  leads: Lead[];
}): CalendarEvent[] {
  const { meetings, projects, clients, leads } = data;
  const clientName = (id: string | null) => {
    if (!id) return "Unassigned";
    const c = clients.find((c) => c.id === id);
    return c?.name ?? c?.company ?? c?.email ?? "Client";
  };
  const leadName = (id: string | null) => leads.find((l) => l.id === id)?.name ?? "Lead";

  const events: CalendarEvent[] = [];

  for (const m of meetings) {
    const subject = m.lead_id ? leadName(m.lead_id) : clientName(m.client_id);
    events.push({
      id: `meeting-${m.id}`,
      type: "MEETING",
      title: m.title,
      date: m.scheduled_at,
      subtitle: subject,
    });
  }

  for (const p of projects) {
    if (!p.due_date) continue;
    events.push({
      id: `deliverable-${p.id}`,
      type: "DELIVERABLE",
      title: p.name,
      date: p.due_date,
      subtitle: clientName(p.client_id),
      href: { to: "/projects/$projectId", params: { projectId: p.id } },
    });
  }

  for (const c of clients) {
    if (!c.renewal_date) continue;
    events.push({
      id: `renewal-${c.id}`,
      type: "RENEWAL",
      title: c.subscription_plan ?? "Subscription renewal",
      date: c.renewal_date,
      subtitle: c.name ?? c.company ?? c.email ?? "Client",
    });
  }

  return events;
}
