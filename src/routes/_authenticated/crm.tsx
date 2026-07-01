import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchContacts,
  createContact,
  updateContactStatus,
  deleteContact,
  markContactActiveClient,
  CONTACT_STATUSES,
  type Contact,
  type ContactStatus,
  type LeadSource,
} from "@/lib/crm";
import {
  fetchClientsDirectory,
  fetchClientDetail,
  createClient,
  updateClientSubscription,
  type ClientDirectoryEntry,
  type ClientDetail,
  type BillingCycle,
} from "@/lib/clients";
import {
  fetchInvoicesForClient,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  suggestInvoiceNumber,
  type InvoiceStatus,
} from "@/lib/billing";
import {
  fetchDocumentsForClient,
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  DOCUMENT_CATEGORY_LABEL,
  type DocumentCategory,
} from "@/lib/documents";
import { fetchMeetings, createMeeting, deleteMeeting, type Meeting } from "@/lib/meetings";
import { KanbanBoard } from "@/components/app/kanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Trash2,
  MessageSquare,
  FolderKanban,
  Mail,
  Phone,
  Globe,
  Users,
  Receipt,
  FileText,
  Download,
  Upload,
  CalendarClock,
  RefreshCw,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/crm")({
  component: CrmPage,
});

function CrmPage() {
  const qc = useQueryClient();
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: fetchContacts,
  });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactStatus }) =>
      updateContactStatus(id, status, 0),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["contacts"] });
      const prev = qc.getQueryData<Contact[]>(["contacts"]);
      qc.setQueryData<Contact[]>(["contacts"], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, status } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["contacts"], ctx.prev);
      toast.error("Could not move contact");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["clients-directory"] });
    },
  });

  const createMut = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact added");
      setOpen(false);
    },
    onError: () => toast.error("Could not add contact"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
    },
  });

  const promoteMut = useMutation({
    mutationFn: markContactActiveClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["clients-directory"] });
      qc.invalidateQueries({ queryKey: ["client-options"] });
      toast.success("Marked as an active client.");
    },
    onError: () => toast.error("Could not update this contact"),
  });

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMut.mutate({
      name: String(fd.get("name")),
      company: String(fd.get("company") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      value: Number(fd.get("value") || 0),
      source: String(fd.get("source") || "WEBSITE") as LeadSource,
      status: String(fd.get("status") || "LEAD") as ContactStatus,
      notes: String(fd.get("notes") || ""),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground">
          One pipeline for every contact — from first touch to active client.
        </p>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Clients
          </TabsTrigger>
          <TabsTrigger value="meetings" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Meetings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Drag contacts across stages to update where they are in the lifecycle.
            </p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts…"
                  className="w-52 ps-8"
                />
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1.5">
                    <Plus className="h-4 w-4" /> Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Contact</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Name</Label>
                      <Input name="name" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Company</Label>
                        <Input name="company" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Value ($)</Label>
                        <Input name="value" type="number" min="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input name="email" type="email" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input name="phone" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Stage</Label>
                        <Select name="status" defaultValue="LEAD">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_STATUSES.map((s) => (
                              <SelectItem key={s.key} value={s.key}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Source</Label>
                        <Select name="source" defaultValue="WEBSITE">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["WEBSITE", "REFERRAL", "SOCIAL", "OUTBOUND", "EVENT", "OTHER"].map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea name="notes" rows={2} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createMut.isPending}>
                        Add contact
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <KanbanBoard<Contact>
              columns={CONTACT_STATUSES.map((s) => ({ key: s.key, label: s.label }))}
              items={filtered}
              getId={(c) => c.id}
              getColumn={(c) => c.status}
              onMove={(id, status) => moveMut.mutate({ id, status: status as ContactStatus })}
              columnFooter={(_k, items) => (
                <div className="text-xs text-muted-foreground">
                  ${items.reduce((s, c) => s + Number(c.value || 0), 0).toLocaleString()}
                </div>
              )}
              renderCard={(c) => (
                <div className="group space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{c.name ?? c.company ?? "Unnamed"}</span>
                    <div className="flex items-center gap-1.5">
                      {c.status !== "ACTIVE_CLIENT" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            promoteMut.mutate(c);
                          }}
                          disabled={promoteMut.isPending}
                          title="Mark as active client"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <UserCheck className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMut.mutate(c.id);
                        }}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                  {c.company && <p className="text-xs text-muted-foreground">{c.company}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {c.source}
                    </span>
                    {Number(c.value) > 0 && (
                      <span className="text-xs font-semibold text-primary">
                        ${Number(c.value).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="clients">
          <ClientsTab />
        </TabsContent>

        <TabsContent value="meetings">
          <MeetingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientsTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients-directory"],
    queryFn: fetchClientsDirectory,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["client-detail", activeClientId],
    queryFn: () => fetchClientDetail(activeClientId!),
    enabled: !!activeClientId,
  });

  const createClientMut = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-directory"] });
      qc.invalidateQueries({ queryKey: ["client-options"] });
      toast.success("Client added");
      setAddOpen(false);
    },
    onError: () => toast.error("Could not add client"),
  });

  const deleteClientMut = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients-directory"] });
      qc.invalidateQueries({ queryKey: ["client-options"] });
      toast.success("Client deleted");
    },
    onError: () => toast.error("Could not delete client"),
  });

  function handleDeleteClient(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
    deleteClientMut.mutate(id);
  }

  function handleAddClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createClientMut.mutate({
      company: String(fd.get("company") || ""),
      phone: String(fd.get("phone") || ""),
      website: String(fd.get("website") || ""),
      notes: String(fd.get("notes") || ""),
    });
    e.currentTarget.reset();
  }

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-64 ps-8"
          />
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Client</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input name="company" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input name="phone" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input name="website" placeholder="https://…" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createClientMut.isPending}>
                  Add client
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/50 backdrop-blur-xl">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Users className="h-7 w-7 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No registered clients yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="group flex w-full items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/30"
              >
                <button
                  onClick={() => setActiveClientId(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-start"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(c.name ?? c.company ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {c.name ?? c.company ?? "Unnamed client"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.company ?? c.email ?? "—"}
                    </p>
                  </div>
                </button>
                <Badge variant="secondary" className="shrink-0">
                  {c.project_count} {c.project_count === 1 ? "project" : "projects"}
                </Badge>
                <button
                  onClick={(e) =>
                    handleDeleteClient(e, c.id, c.name ?? c.company ?? "this client")
                  }
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  title="Delete client"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client profile dialog */}
      <Dialog open={!!activeClientId} onOpenChange={(o) => !o && setActiveClientId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.name ?? detail?.company ?? "Client profile"}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : detail ? (
            <Tabs defaultValue="profile">
              <TabsList>
                <TabsTrigger value="profile" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Profile
                </TabsTrigger>
                <TabsTrigger value="billing" className="gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> Billing
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Documents
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-4 space-y-5">
                <div className="space-y-1.5 text-sm">
                  {detail.company && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {detail.company}
                    </p>
                  )}
                  {detail.email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {detail.email}
                    </p>
                  )}
                  {detail.phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {detail.phone}
                    </p>
                  )}
                  {detail.website && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" /> {detail.website}
                    </p>
                  )}
                </div>

                <ClientSubscriptionPanel client={detail} />

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
                    Projects {detail.projects.length > 0 && `(${detail.projects.length})`}
                  </p>
                  {detail.projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No projects with this client yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detail.projects.map((p) => (
                        <Link
                          key={p.id}
                          to="/projects/$projectId"
                          params={{ projectId: p.id }}
                          onClick={() => setActiveClientId(null)}
                          className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-accent/40"
                        >
                          <span className="font-medium">{p.name}</span>
                          <Badge variant="outline">{p.status}</Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {detail.notes && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
                      Notes
                    </p>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {detail.notes}
                    </p>
                  </div>
                )}

                {detail.user_id && (
                  <Button
                    className="w-full gap-1.5"
                    onClick={() => navigate({ to: "/inbox", search: { client: detail.user_id! } })}
                  >
                    <MessageSquare className="h-4 w-4" /> Message this client
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="billing" className="mt-4">
                <ClientBillingPanel clientId={detail.id} />
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <ClientDocumentsPanel clientId={detail.id} />
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

function ClientSubscriptionPanel({ client }: { client: ClientDetail }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const mut = useMutation({
    mutationFn: (input: Parameters<typeof updateClientSubscription>[1]) =>
      updateClientSubscription(client.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-detail", client.id] });
      qc.invalidateQueries({ queryKey: ["clients-directory"] });
      qc.invalidateQueries({ queryKey: ["clients-directory"] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      setEditing(false);
      toast.success("Subscription updated");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Couldn't update subscription: ${msg}`);
    },
  });

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mut.mutate({
      subscription_plan: String(fd.get("subscription_plan") || ""),
      billing_cycle: (String(fd.get("billing_cycle") || "") || null) as BillingCycle | null,
      renewal_date: String(fd.get("renewal_date") || ""),
    });
  }

  /** Bumps the renewal date forward by one billing cycle — used right after a payment lands. */
  function handleMarkRenewed() {
    if (!client.renewal_date || !client.billing_cycle) return;
    const d = new Date(client.renewal_date);
    if (client.billing_cycle === "MONTHLY") d.setMonth(d.getMonth() + 1);
    else if (client.billing_cycle === "QUARTERLY") d.setMonth(d.getMonth() + 3);
    else if (client.billing_cycle === "YEARLY") d.setFullYear(d.getFullYear() + 1);
    else return;
    mut.mutate({
      subscription_plan: client.subscription_plan,
      billing_cycle: client.billing_cycle,
      renewal_date: d.toISOString().slice(0, 10),
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className="space-y-3 rounded-xl border border-white/10 bg-card/40 backdrop-blur-xl p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
          Subscription
        </p>
        <Input
          name="subscription_plan"
          placeholder="Plan name (e.g. Growth Retainer)"
          defaultValue={client.subscription_plan ?? ""}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select name="billing_cycle" defaultValue={client.billing_cycle ?? "MONTHLY"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"] as BillingCycle[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input name="renewal_date" type="date" defaultValue={client.renewal_date ?? ""} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={mut.isPending}>
            Save
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-card/40 backdrop-blur-xl p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
          Subscription
        </p>
        {client.subscription_plan ? (
          <>
            <p className="mt-1 text-sm font-medium">{client.subscription_plan}</p>
            <p className="text-xs text-muted-foreground">
              {client.billing_cycle ?? "—"}
              {client.renewal_date && ` · Renews ${client.renewal_date}`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No plan set.</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {client.renewal_date && client.billing_cycle && client.billing_cycle !== "ONE_TIME" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleMarkRenewed}
            disabled={mut.isPending}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Mark renewed
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function ClientBillingPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["client-invoices", clientId],
    queryFn: () => fetchInvoicesForClient(clientId),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const invoice_number = await suggestInvoiceNumber();
      return createInvoice({
        client_id: clientId,
        invoice_number,
        amount: Number(amount),
        description: description || null,
        due_date: dueDate || null,
        status: "SENT",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-invoices", clientId] });
      setOpen(false);
      setAmount("");
      setDescription("");
      setDueDate("");
      toast.success("Invoice created");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Couldn't create the invoice: ${msg}`);
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-invoices", clientId] }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-invoices", clientId] }),
  });

  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New invoice
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!amount) return;
              createMut.mutate();
            }}
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount (USD)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMut.isPending}>
                Create & send
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices for this client yet.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {inv.invoice_number} — ${Number(inv.amount).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Issued {inv.issued_date}
                  {inv.due_date && ` · Due ${inv.due_date}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Select
                  value={inv.status}
                  onValueChange={(v) =>
                    statusMut.mutate({ id: inv.id, status: v as InvoiceStatus })
                  }
                >
                  <SelectTrigger className="h-8 w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as InvoiceStatus[]).map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <Badge variant={invoiceStatusVariant[inv.status]} className="hidden sm:inline-flex">
                  {inv.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteMut.mutate(inv.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientDocumentsPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<DocumentCategory>("FILE");
  const [uploading, setUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["client-documents", clientId],
    queryFn: () => fetchDocumentsForClient(clientId),
  });

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument({ file, clientId, category });
      qc.invalidateQueries({ queryKey: ["client-documents", clientId] });
      toast.success("Document uploaded");
    } catch {
      toast.error("Upload failed — try again");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(filePath: string) {
    try {
      const url = await getDocumentDownloadUrl(filePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't open that file");
    }
  }

  const deleteMut = useMutation({
    mutationFn: ({ id, filePath }: { id: string; filePath: string }) =>
      deleteDocument(id, filePath),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-documents", clientId] }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DOCUMENT_CATEGORY_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Upload file"}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </Label>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents shared with this client yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_CATEGORY_LABEL[doc.category]}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(doc.file_path)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteMut.mutate({ id: doc.id, filePath: doc.file_path })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState<string>("");

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: fetchMeetings,
  });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: fetchContacts });

  const contactNameMap = new Map(
    contacts.map((c) => [c.id, c.name ?? c.company ?? c.email ?? "Contact"]),
  );

  function subjectLabel(m: Meeting) {
    const id = m.client_id ?? m.lead_id;
    if (id) return contactNameMap.get(id) ?? "Contact";
    return "—";
  }

  const createMut = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setOpen(false);
      setSubjectId("");
      toast.success("Meeting scheduled");
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Could not schedule the meeting: ${msg}`);
    },
  });
  const deleteMut = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = String(fd.get("date") || "");
    const time = String(fd.get("time") || "");
    if (!date || !time || !subjectId) return;
    createMut.mutate({
      title: String(fd.get("title")),
      scheduled_at: new Date(`${date}T${time}`).toISOString(),
      duration_minutes: Number(fd.get("duration_minutes") || 30),
      notes: String(fd.get("notes") || "") || null,
      client_id: subjectId,
    });
  }

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at).getTime() >= now);
  const past = meetings.filter((m) => new Date(m.scheduled_at).getTime() < now);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Schedule meeting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a meeting</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input name="title" placeholder="Discovery call" required />
              </div>
              <div className="space-y-1.5">
                <Label>With</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact…" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name ?? contact.company ?? "Contact"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input name="time" type="time" defaultValue="10:00" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (min)</Label>
                  <Input
                    name="duration_minutes"
                    type="number"
                    min="15"
                    step="15"
                    defaultValue={30}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending || !subjectId}>
                  Schedule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : meetings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-16 text-center text-muted-foreground">
          <CalendarClock className="mx-auto mb-3 h-8 w-8 opacity-50" />
          No meetings scheduled yet.
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
              Upcoming
            </p>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <MeetingRow
                    key={m.id}
                    meeting={m}
                    subject={subjectLabel(m)}
                    onDelete={() => deleteMut.mutate(m.id)}
                  />
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
                  <MeetingRow
                    key={m.id}
                    meeting={m}
                    subject={subjectLabel(m)}
                    onDelete={() => deleteMut.mutate(m.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingRow({
  meeting,
  subject,
  onDelete,
}: {
  meeting: Meeting;
  subject: string;
  onDelete: () => void;
}) {
  const dt = new Date(meeting.scheduled_at);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-card/40 backdrop-blur-xl p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="text-[10px] font-medium leading-none">
            {dt.toLocaleDateString(undefined, { month: "short" })}
          </span>
          <span className="text-sm font-bold leading-none">{dt.getDate()}</span>
        </div>
        <div>
          <p className="text-sm font-medium">{meeting.title}</p>
          <p className="text-xs text-muted-foreground">
            {subject} · {dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} ·{" "}
            {meeting.duration_minutes} min
          </p>
        </div>
      </div>
      <button onClick={onDelete} className="text-muted-foreground/50 hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
