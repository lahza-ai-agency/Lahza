import type { Meeting } from "@/lib/meetings";
import type { Project } from "@/lib/projects";
import type { ClientDirectoryEntry } from "@/lib/clients";
import type { Contact } from "@/lib/crm";

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
  contacts: Contact[];
}): CalendarEvent[] {
  const { meetings, projects, clients, contacts } = data;
  const clientName = (id: string | null) => {
    if (!id) return "Unassigned";
    const c = clients.find((c) => c.id === id);
    if (c) return c.name ?? c.company ?? c.email ?? "Client";
    const contact = contacts.find((c) => c.id === id);
    return contact?.name ?? contact?.company ?? "Contact";
  };

  const events: CalendarEvent[] = [];

  for (const m of meetings) {
    const subjectId = m.client_id ?? m.lead_id;
    events.push({
      id: `meeting-${m.id}`,
      type: "MEETING",
      title: m.title,
      date: m.scheduled_at,
      subtitle: clientName(subjectId),
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
