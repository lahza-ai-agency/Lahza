import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import {
  listCredentials,
  createCredential,
  updateCredentialMeta,
  rotateCredentialSecret,
  revealCredentialSecret,
  deleteCredential,
  listAuditLogs,
  type CredentialCategory,
  type CredentialMeta,
} from "@/lib/vault.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  ShieldCheck,
  KeyRound,
  ScrollText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/vault")({
  component: VaultPage,
});

const CATEGORY_LABEL: Record<CredentialCategory, string> = {
  AI_KEYS: "AI Keys",
  CLOUD_HOSTING: "Cloud & Hosting",
  PAYMENTS: "Payments",
  COMMUNICATIONS: "Communications",
  SOCIAL_ACCOUNTS: "Social Accounts",
  DOMAINS: "Domains",
  DATABASES: "Databases",
  OTHER: "Other",
};

const CATEGORY_COLOR: Record<CredentialCategory, string> = {
  AI_KEYS: "bg-aurora-violet/15 text-aurora-violet",
  CLOUD_HOSTING: "bg-aurora-cyan/15 text-aurora-cyan",
  PAYMENTS: "bg-emerald-500/15 text-emerald-400",
  COMMUNICATIONS: "bg-blue-500/15 text-blue-400",
  SOCIAL_ACCOUNTS: "bg-pink-500/15 text-pink-400",
  DOMAINS: "bg-yellow-500/15 text-yellow-400",
  DATABASES: "bg-purple-500/15 text-purple-400",
  OTHER: "bg-muted text-muted-foreground",
};

function VaultPage() {
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = hasAnyRole(["SUPER_ADMIN", "ADMIN"]);

  useEffect(() => {
    if (!isAdmin) navigate({ to: "/dashboard" });
  }, [isAdmin, navigate]);

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const list = useServerFn(listCredentials);
  const create = useServerFn(createCredential);
  const updateMeta = useServerFn(updateCredentialMeta);
  const rotate = useServerFn(rotateCredentialSecret);
  const reveal = useServerFn(revealCredentialSecret);
  const remove = useServerFn(deleteCredential);

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ["vault-credentials"],
    queryFn: () => list(),
    enabled: isAdmin,
  });

  const createMut = useMutation({
    mutationFn: (v: {
      label: string;
      service?: string | null;
      category: CredentialCategory;
      notes?: string | null;
      secretValue: string;
    }) => create({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vault-credentials"] });
      toast.success("Credential stored securely");
      setAddOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not store credential"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vault-credentials"] });
      toast.success("Credential deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete credential"),
  });

  async function handleReveal(id: string) {
    if (revealed[id]) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const { value } = await reveal({ data: { id } });
      setRevealed((r) => ({ ...r, [id]: value }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reveal secret");
    }
  }

  async function handleCopy(id: string) {
    try {
      const { value } = await reveal({ data: { id } });
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy secret");
    }
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMut.mutate({
      label: String(fd.get("label")),
      service: String(fd.get("service") || "") || null,
      category: String(fd.get("category") || "OTHER") as CredentialCategory,
      notes: String(fd.get("notes") || "") || null,
      secretValue: String(fd.get("secretValue") || ""),
    });
  }

  const filtered = credentials.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.label.toLowerCase().includes(q) ||
      (c.service ?? "").toLowerCase().includes(q) ||
      CATEGORY_LABEL[c.category].toLowerCase().includes(q)
    );
  });

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-display font-semibold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-aurora-cyan" /> Credentials Vault
          </h1>
          <p className="text-sm text-muted-foreground">
            API keys and account credentials, encrypted at rest. Every reveal is logged.
          </p>
        </div>
      </div>

      <Tabs defaultValue="vault">
        <TabsList>
          <TabsTrigger value="vault" className="gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> Vault
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ScrollText className="h-3.5 w-3.5" /> Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vault" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search credentials…"
                className="w-64 ps-8"
              />
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add credential
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Store a new credential</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Label</Label>
                    <Input name="label" placeholder="Production OpenAI key" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Service</Label>
                      <Input name="service" placeholder="OpenAI" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select name="category" defaultValue="OTHER">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secret value</Label>
                    <Input name="secretValue" type="password" placeholder="sk-…" required />
                    <p className="text-xs text-muted-foreground">
                      Encrypted immediately — this is the only time you'll paste it in.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea name="notes" rows={2} placeholder="Optional context for the team" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMut.isPending}>
                      Store credential
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
              <div className="flex flex-col items-center gap-2 py-16">
                <KeyRound className="h-7 w-7 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No credentials stored yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filtered.map((c) => (
                  <CredentialRow
                    key={c.id}
                    credential={c}
                    revealedValue={revealed[c.id]}
                    onToggleReveal={() => handleReveal(c.id)}
                    onCopy={() => handleCopy(c.id)}
                    onDelete={() => deleteMut.mutate(c.id)}
                    onRotate={async (newValue) => {
                      try {
                        await rotate({ data: { id: c.id, newSecretValue: newValue } });
                        qc.invalidateQueries({ queryKey: ["vault-credentials"] });
                        setRevealed((r) => {
                          const next = { ...r };
                          delete next[c.id];
                          return next;
                        });
                        toast.success("Secret rotated");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not rotate secret");
                      }
                    }}
                    onEditMeta={async (patch) => {
                      try {
                        await updateMeta({ data: { id: c.id, ...patch } });
                        qc.invalidateQueries({ queryKey: ["vault-credentials"] });
                        toast.success("Updated");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not update");
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogPanel enabled={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CredentialRow({
  credential,
  revealedValue,
  onToggleReveal,
  onCopy,
  onDelete,
  onRotate,
  onEditMeta,
}: {
  credential: CredentialMeta;
  revealedValue?: string;
  onToggleReveal: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onRotate: (newValue: string) => void;
  onEditMeta: (patch: { label?: string; service?: string | null; notes?: string | null }) => void;
}) {
  const [rotateOpen, setRotateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{credential.label}</p>
          <Badge className={CATEGORY_COLOR[credential.category]}>
            {CATEGORY_LABEL[credential.category]}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {credential.service ?? "—"}
          {credential.last_rotated_at &&
            ` · Rotated ${new Date(credential.last_rotated_at).toLocaleDateString()}`}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="rounded-md border border-white/10 bg-background/60 px-2.5 py-1 font-mono-data text-xs text-muted-foreground">
            {revealedValue ?? "••••••••••••••••"}
          </code>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleReveal}>
          {revealedValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>

        <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Rotate secret">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rotate secret for "{credential.label}"</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const value = String(fd.get("newSecretValue") || "");
                if (!value) return;
                onRotate(value);
                setRotateOpen(false);
              }}
            >
              <div className="space-y-1.5">
                <Label>New secret value</Label>
                <Input name="newSecretValue" type="password" required />
              </div>
              <DialogFooter>
                <Button type="submit">Rotate</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit "{credential.label}"</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                onEditMeta({
                  label: String(fd.get("label") || credential.label),
                  service: String(fd.get("service") || "") || null,
                  notes: String(fd.get("notes") || "") || null,
                });
                setEditOpen(false);
              }}
            >
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input name="label" defaultValue={credential.label} required />
              </div>
              <div className="space-y-1.5">
                <Label>Service</Label>
                <Input name="service" defaultValue={credential.service ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} defaultValue={credential.notes ?? ""} />
              </div>
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AuditLogPanel({ enabled }: { enabled: boolean }) {
  const fetchLogs = useServerFn(listAuditLogs);
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["vault-audit-logs"],
    queryFn: () => fetchLogs(),
    enabled,
  });

  const ACTION_LABEL: Record<string, string> = {
    "credential.created": "Created",
    "credential.updated": "Updated metadata",
    "credential.rotated": "Rotated secret",
    "credential.revealed": "Revealed secret",
    "credential.deleted": "Deleted",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/50 backdrop-blur-xl">
      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <ScrollText className="h-7 w-7 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{log.actor_email ?? "Unknown user"}</span>{" "}
                  <span className="text-muted-foreground">
                    {ACTION_LABEL[log.action] ?? log.action}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 font-mono-data text-[10px]">
                {log.resource_type}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
