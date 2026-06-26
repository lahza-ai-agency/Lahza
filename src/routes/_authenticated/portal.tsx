import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProjects, type ProjectStatus } from "@/lib/projects";
import { fetchMyClientId, fetchMySubscription } from "@/lib/clients";
import { fetchMeetings, type Meeting } from "@/lib/meetings";
import { fetchInvoices, type Invoice, type InvoiceStatus } from "@/lib/billing";
import {
  fetchDocuments,
  getDocumentDownloadUrl,
  DOCUMENT_CATEGORY_LABEL,
  type ClientDocument,
} from "@/lib/documents";
import {
  fetchTickets,
  fetchTicketMessages,
  createTicket,
  sendTicketMessage,
  updateTicketStatus,
  TICKET_STATUS_LABEL,
  TICKET_CATEGORY_LABEL,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/support";
import { useAuth } from "@/lib/auth-context";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FolderKanban,
  Receipt,
  FileText,
  LifeBuoy,
  Download,
  Plus,
  Send,
  CheckCircle2,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalPage,
});

const statusLabel: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  IN_PROGRESS: "In Progress",
  TESTING: "Testing",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
};

function PortalPage() {
  const { user } = useAuth();
  // RLS scopes projects/invoices/documents/tickets to the signed-in client's
  // own records automatically — no client_id filtering needed client-side.
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["portal-projects"],
    queryFn: fetchProjects,
  });

  const active = projects.filter((p) => !["COMPLETED"].includes(p.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Billing
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Documents
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-1.5">
            <LifeBuoy className="h-3.5 w-3.5" /> Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <span className="text-sm text-muted-foreground">Active projects</span>
              <div className="mt-2 text-3xl font-bold">{active.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <span className="text-sm text-muted-foreground">Total projects</span>
              <div className="mt-2 text-3xl font-bold">{projects.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <span className="text-sm text-muted-foreground">Completed</span>
              <div className="mt-2 text-3xl font-bold">
                {projects.filter((p) => p.status === "COMPLETED").length}
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Your projects</h2>
            {projectsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
                <FolderKanban className="mx-auto mb-3 h-8 w-8 opacity-50" />
                No projects shared with you yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{p.name}</h3>
                      <Badge variant="secondary">{statusLabel[p.status]}</Badge>
                    </div>
                    {p.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    )}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} />
                    </div>
                    {p.due_date && (
                      <p className="mt-3 text-xs text-muted-foreground">Due {p.due_date}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <ScheduleTab />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <BillingTab />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab />
        </TabsContent>

        <TabsContent value="support" className="mt-6">
          <SupportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =================================================================
// SCHEDULE (renewal + meetings)
// =================================================================

const billingCycleLabel: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
  ONE_TIME: "One-time",
};

function ScheduleTab() {
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: fetchMySubscription,
  });
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery<Meeting[]>({
    queryKey: ["my-meetings"],
    queryFn: fetchMeetings,
  });

  const now = Date.now();
  const upcoming = meetings
    .filter((m) => new Date(m.scheduled_at).getTime() >= now)
    .sort((a, b) => (a.scheduled_at < b.scheduled_at ? -1 : 1));
  const past = meetings
    .filter((m) => new Date(m.scheduled_at).getTime() < now)
    .sort((a, b) => (a.scheduled_at < b.scheduled_at ? 1 : -1));

  const daysUntilRenewal = subscription?.renewal_date
    ? Math.ceil((new Date(subscription.renewal_date).getTime() - now) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Subscription</h2>
        {subLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !subscription || !subscription.subscription_plan ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No active plan on file yet — reach out if you'd like to set one up.
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
            <div>
              <p className="text-lg font-semibold">{subscription.subscription_plan}</p>
              <p className="text-sm text-muted-foreground">
                {subscription.billing_cycle ? billingCycleLabel[subscription.billing_cycle] : "—"}{" "}
                billing
              </p>
            </div>
            {subscription.renewal_date && (
              <div className="text-right">
                <p className="flex items-center justify-end gap-1.5 text-sm font-medium">
                  <RefreshCw className="h-3.5 w-3.5 text-primary" /> Renews{" "}
                  {subscription.renewal_date}
                </p>
                {daysUntilRenewal !== null && (
                  <p className="text-xs text-muted-foreground">
                    {daysUntilRenewal > 0
                      ? `in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"}`
                      : daysUntilRenewal === 0
                        ? "today"
                        : "renewal date has passed"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Meetings</h2>
        {meetingsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : meetings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <CalendarClock className="mx-auto mb-2 h-6 w-6 opacity-50" />
            No meetings scheduled yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
                Upcoming
              </p>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((m) => (
                    <MeetingCard key={m.id} meeting={m} />
                  ))}
                </div>
              )}
            </div>
            {past.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
                  Past
                </p>
                <div className="space-y-2 opacity-60">
                  {past.map((m) => (
                    <MeetingCard key={m.id} meeting={m} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const dt = new Date(meeting.scheduled_at);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
        <span className="text-[10px] font-medium leading-none">
          {dt.toLocaleDateString(undefined, { month: "short" })}
        </span>
        <span className="text-sm font-bold leading-none">{dt.getDate()}</span>
      </div>
      <div>
        <p className="text-sm font-medium">{meeting.title}</p>
        <p className="text-xs text-muted-foreground">
          {dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} ·{" "}
          {meeting.duration_minutes} min
        </p>
        {meeting.notes && <p className="mt-1 text-xs text-muted-foreground">{meeting.notes}</p>}
      </div>
    </div>
  );
}

// =================================================================
// BILLING
// =================================================================

const invoiceStatusVariant: Record<
  InvoiceStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  SENT: "secondary",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

function BillingTab() {
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["portal-invoices"],
    queryFn: fetchInvoices,
  });

  const outstanding = invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE");
  const totalOutstanding = outstanding.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPaid = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="text-sm text-muted-foreground">Outstanding balance</span>
          <div className="mt-2 text-3xl font-bold">${totalOutstanding.toLocaleString()}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {outstanding.length} invoice{outstanding.length === 1 ? "" : "s"} due
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <span className="text-sm text-muted-foreground">Total paid</span>
          <div className="mt-2 text-3xl font-bold">${totalPaid.toLocaleString()}</div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-3 h-8 w-8 opacity-50" />
          No invoices yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Invoice</th>
                <th className="px-4 py-2.5 font-medium">Issued</th>
                <th className="px-4 py-2.5 font-medium">Due</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{inv.invoice_number}</div>
                    {inv.description && (
                      <div className="text-xs text-muted-foreground">{inv.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.issued_date}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.due_date ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">${Number(inv.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={invoiceStatusVariant[inv.status]}>{inv.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =================================================================
// DOCUMENTS
// =================================================================

function DocumentsTab() {
  const { data: documents = [], isLoading } = useQuery<ClientDocument[]>({
    queryKey: ["portal-documents"],
    queryFn: fetchDocuments,
  });

  async function handleDownload(doc: ClientDocument) {
    try {
      const url = await getDocumentDownloadUrl(doc.file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't open that file — try again");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground">
        <FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />
        No documents shared with you yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{doc.name}</p>
              <p className="text-xs text-muted-foreground">
                {DOCUMENT_CATEGORY_LABEL[doc.category]} ·{" "}
                {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => handleDownload(doc)}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// =================================================================
// SUPPORT
// =================================================================

const ticketStatusVariant: Record<
  Ticket["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  OPEN: "secondary",
  IN_PROGRESS: "default",
  RESOLVED: "outline",
  CLOSED: "outline",
};

function SupportTab() {
  const qc = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("GENERAL");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [message, setMessage] = useState("");

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["portal-tickets"],
    queryFn: fetchTickets,
    refetchInterval: 20000,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const clientId = await fetchMyClientId();
      if (!clientId) throw new Error("No client record found");
      return createTicket({ client_id: clientId, subject, category, priority, message });
    },
    onSuccess: (ticketId) => {
      qc.invalidateQueries({ queryKey: ["portal-tickets"] });
      setNewOpen(false);
      setSubject("");
      setMessage("");
      setCategory("GENERAL");
      setPriority("NORMAL");
      setSelectedTicket(ticketId);
      toast.success("Ticket submitted");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Couldn't submit your ticket: ${msg}`);
    },
  });

  const ticket = tickets.find((t) => t.id === selectedTicket) ?? null;

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-1.5">
              <Plus className="h-4 w-4" /> New ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open a support ticket</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!subject.trim() || !message.trim()) return;
                createMut.mutate();
              }}
            >
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_CATEGORY_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["LOW", "NORMAL", "HIGH", "URGENT"] as TicketPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Describe what you need help with…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
              />
              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending} className="gap-1.5">
                  <Send className="h-4 w-4" /> Submit ticket
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No tickets yet.
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t.id)}
                className={cn(
                  "w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50",
                  selectedTicket === t.id && "border-primary bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{t.subject}</span>
                  <Badge variant={ticketStatusVariant[t.status]} className="shrink-0">
                    {TICKET_STATUS_LABEL[t.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {TICKET_CATEGORY_LABEL[t.category]} ·{" "}
                  {new Date(t.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {ticket ? (
          <TicketThread ticket={ticket} />
        ) : (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            Select a ticket to view the conversation.
          </div>
        )}
      </div>
    </div>
  );
}

function TicketThread({ ticket }: { ticket: Ticket }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [reply, setReply] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["ticket-messages", ticket.id],
    queryFn: () => fetchTicketMessages(ticket.id),
    refetchInterval: 10000,
  });

  const sendMut = useMutation({
    mutationFn: () => sendTicketMessage(ticket.id, reply),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["ticket-messages", ticket.id] });
      qc.invalidateQueries({ queryKey: ["portal-tickets"] });
    },
    onError: () => toast.error("Message failed to send"),
  });

  const closeMut = useMutation({
    mutationFn: () => updateTicketStatus(ticket.id, "CLOSED"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-tickets"] }),
  });

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div>
          <h3 className="font-semibold">{ticket.subject}</h3>
          <p className="text-xs text-muted-foreground">
            {TICKET_CATEGORY_LABEL[ticket.category]} · {ticket.priority}
          </p>
        </div>
        {ticket.status !== "CLOSED" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => closeMut.mutate()}
            disabled={closeMut.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Close ticket
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {m.body}
                  <div
                    className={cn(
                      "mt-1 text-[10px] opacity-70",
                      mine ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {ticket.status !== "CLOSED" && (
        <form
          className="flex items-end gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reply.trim()) return;
            sendMut.mutate();
          }}
        >
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a reply…"
            rows={2}
            className="resize-none"
          />
          <Button type="submit" size="icon" disabled={sendMut.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
