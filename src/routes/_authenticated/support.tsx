import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchClientsDirectory } from "@/lib/clients";
import {
  fetchTickets,
  fetchTicketMessages,
  sendTicketMessage,
  updateTicketStatus,
  TICKET_STATUS_LABEL,
  TICKET_CATEGORY_LABEL,
  type Ticket,
  type TicketStatus,
} from "@/lib/support";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LifeBuoy, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/support")({
  component: SupportPage,
});

const statusVariant: Record<TicketStatus, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "secondary",
  IN_PROGRESS: "default",
  RESOLVED: "outline",
  CLOSED: "outline",
};

function SupportPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | TicketStatus>("ALL");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["staff-tickets"],
    queryFn: fetchTickets,
    refetchInterval: 20000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-directory-lite"],
    queryFn: fetchClientsDirectory,
  });
  const clientNameMap = new Map(
    clients.map((c) => [c.id, c.name ?? c.company ?? c.email ?? "Client"]),
  );

  const visible = tickets.filter((t) => filter === "ALL" || t.status === filter);
  const ticket = tickets.find((t) => t.id === selected) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">Client tickets across every account.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as "ALL" | TicketStatus)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as TicketStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {TICKET_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <LifeBuoy className="mx-auto mb-2 h-6 w-6 opacity-50" />
              No tickets here.
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50",
                    selected === t.id && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{t.subject}</span>
                    <Badge variant={statusVariant[t.status]} className="shrink-0">
                      {TICKET_STATUS_LABEL[t.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {clientNameMap.get(t.client_id) ?? "Client"} ·{" "}
                    {TICKET_CATEGORY_LABEL[t.category]}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {ticket ? (
            <StaffTicketThread
              ticket={ticket}
              clientLabel={clientNameMap.get(ticket.client_id) ?? "Client"}
            />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
              Select a ticket to view the conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffTicketThread({ ticket, clientLabel }: { ticket: Ticket; clientLabel: string }) {
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
      qc.invalidateQueries({ queryKey: ["staff-tickets"] });
    },
    onError: () => toast.error("Message failed to send"),
  });

  const statusMut = useMutation({
    mutationFn: (status: TicketStatus) => updateTicketStatus(ticket.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-tickets"] }),
  });

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-card/50 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <div>
          <h3 className="font-semibold">{ticket.subject}</h3>
          <p className="text-xs text-muted-foreground">
            {clientLabel} · {TICKET_CATEGORY_LABEL[ticket.category]} · {ticket.priority}
          </p>
        </div>
        <Select value={ticket.status} onValueChange={(v) => statusMut.mutate(v as TicketStatus)}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as TicketStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {TICKET_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          placeholder="Reply to client…"
          rows={2}
          className="resize-none"
        />
        <Button type="submit" size="icon" disabled={sendMut.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
