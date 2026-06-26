import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMeetings } from "@/lib/meetings";
import { fetchProjects } from "@/lib/projects";
import { fetchClientsDirectory } from "@/lib/clients";
import { fetchLeads } from "@/lib/crm";
import { buildCalendarEvents, type CalendarEvent, type CalendarEventType } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Users2, FolderKanban, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

const TYPE_META: Record<
  CalendarEventType,
  { label: string; dot: string; badge: "default" | "secondary" | "outline"; icon: typeof Users2 }
> = {
  MEETING: { label: "Meeting", dot: "bg-blue-400", badge: "secondary", icon: Users2 },
  DELIVERABLE: { label: "Deliverable", dot: "bg-primary", badge: "default", icon: FolderKanban },
  RENEWAL: { label: "Renewal", dot: "bg-orange-400", badge: "outline", icon: RefreshCw },
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | CalendarEventType>("ALL");

  const { data: meetings = [], isLoading: l1 } = useQuery({
    queryKey: ["calendar-meetings"],
    queryFn: fetchMeetings,
  });
  const { data: projects = [], isLoading: l2 } = useQuery({
    queryKey: ["calendar-projects"],
    queryFn: fetchProjects,
  });
  const { data: clients = [], isLoading: l3 } = useQuery({
    queryKey: ["clients-directory-lite"],
    queryFn: fetchClientsDirectory,
  });
  const { data: leads = [], isLoading: l4 } = useQuery({
    queryKey: ["calendar-leads"],
    queryFn: fetchLeads,
  });

  const isLoading = l1 || l2 || l3 || l4;
  const allEvents = buildCalendarEvents({ meetings, projects, clients, leads });
  const events = typeFilter === "ALL" ? allEvents : allEvents.filter((e) => e.type === typeFilter);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = e.date.slice(0, 10);
    const list = eventsByDate.get(key) ?? [];
    list.push(e);
    eventsByDate.set(key, list);
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayKey = dateKey(new Date());

  const upcoming = events
    .filter((e) => new Date(e.date).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 12);

  const selectedEvents = selectedKey ? (eventsByDate.get(selectedKey) ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Every meeting, deliverable, and renewal across all clients.
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={typeFilter === "ALL" ? "default" : "outline"}
            onClick={() => setTypeFilter("ALL")}
          >
            All
          </Button>
          {(Object.keys(TYPE_META) as CalendarEventType[]).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => setTypeFilter(t)}
            >
              <span className={cn("h-2 w-2 rounded-full", TYPE_META[t].dot)} />
              {TYPE_META[t].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-sm font-semibold">
              {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCursor(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const d = new Date();
                  setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCursor(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="pb-1">
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventsByDate.get(key) ?? [];
                const isToday = key === todayKey;
                const isSelected = key === selectedKey;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedKey(key)}
                    className={cn(
                      "min-h-[78px] rounded-lg border border-border/60 p-1.5 text-left transition-colors hover:border-primary/50",
                      isToday && "border-primary/60 bg-primary/5",
                      isSelected && "ring-2 ring-primary/50",
                    )}
                  >
                    <span className={cn("text-xs", isToday && "font-semibold text-primary")}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center gap-1 truncate text-[9px] leading-tight"
                          title={e.title}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              TYPE_META[e.type].dot,
                            )}
                          />
                          <span className="truncate">{e.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">{selectedKey ? selectedKey : "Upcoming"}</h3>
          {(selectedKey ? selectedEvents : upcoming).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here.</p>
          ) : (
            <div className="space-y-2">
              {(selectedKey ? selectedEvents : upcoming).map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          )}
          {selectedKey && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setSelectedKey(null)}
            >
              Clear selection
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const meta = TYPE_META[event.type];
  const content = (
    <div className="flex items-start gap-2.5 rounded-xl border border-border p-2.5 transition-colors hover:bg-muted/50">
      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", meta.dot)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{event.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {event.subtitle} ·{" "}
          {event.type === "MEETING"
            ? new Date(event.date).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : new Date(event.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
        </p>
      </div>
      <Badge variant={meta.badge} className="shrink-0 text-[10px]">
        {meta.label}
      </Badge>
    </div>
  );

  if (event.href) {
    return (
      <Link to={event.href.to} params={event.href.params}>
        {content}
      </Link>
    );
  }
  return content;
}
