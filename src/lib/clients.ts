import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/lib/projects";
import type { ContactStatus, LeadSource } from "@/lib/crm";

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";

export interface ClientDirectoryEntry {
  id: string;
  user_id: string | null;
  company: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  name: string | null;
  email: string | null;
  status: ContactStatus;
  source: LeadSource;
  value: number;
  created_at: string;
  project_count: number;
  subscription_plan: string | null;
  billing_cycle: BillingCycle | null;
  renewal_date: string | null;
}

export interface ClientDetail extends ClientDirectoryEntry {
  projects: Project[];
}

/** Staff: contacts who've reached client status (Won, Active, Inactive) —
 * the "Clients" tab. Earlier-stage contacts live on the Pipeline tab. */
const CLIENT_STAGE_STATUSES: ContactStatus[] = ["WON", "ACTIVE_CLIENT", "INACTIVE_CLIENT"];

export async function fetchClientsDirectory(): Promise<ClientDirectoryEntry[]> {
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .in("status", CLIENT_STAGE_STATUSES)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const list = clients ?? [];
  if (list.length === 0) return [];

  const userIds = [...new Set(list.map((c) => c.user_id).filter(Boolean))] as string[];
  const clientIds = list.map((c) => c.id);

  const [{ data: profiles }, { data: projects }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, name, email").in("id", userIds)
      : Promise.resolve({
          data: [] as { id: string; name: string | null; email: string | null }[],
        }),
    supabase.from("projects").select("id, client_id").in("client_id", clientIds),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const countMap = new Map<string, number>();
  for (const p of projects ?? []) {
    if (!p.client_id) continue;
    countMap.set(p.client_id, (countMap.get(p.client_id) ?? 0) + 1);
  }

  return list.map((c) => {
    const profile = c.user_id ? profileMap.get(c.user_id) : undefined;
    return {
      id: c.id,
      user_id: c.user_id,
      company: c.company,
      phone: c.phone,
      website: c.website,
      notes: c.notes,
      name: profile?.name ?? c.name ?? null,
      email: profile?.email ?? c.email ?? null,
      status: c.status as ContactStatus,
      source: c.source as LeadSource,
      value: Number(c.value ?? 0),
      created_at: c.created_at,
      project_count: countMap.get(c.id) ?? 0,
      subscription_plan: c.subscription_plan,
      billing_cycle: c.billing_cycle as BillingCycle | null,
      renewal_date: c.renewal_date,
    };
  });
}

/** Client-side: resolve the signed-in client's own `clients.id` (RLS-scoped). */
export async function fetchMyClientId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (clientError) throw clientError;
  return client?.id ?? null;
}

export interface MySubscription {
  subscription_plan: string | null;
  billing_cycle: BillingCycle | null;
  renewal_date: string | null;
}

/** Client-side: the signed-in client's own plan/renewal info (RLS-scoped). */
export async function fetchMySubscription(): Promise<MySubscription | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("subscription_plan, billing_cycle, renewal_date")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (clientError) throw clientError;
  if (!client) return null;
  return {
    subscription_plan: client.subscription_plan,
    billing_cycle: client.billing_cycle as BillingCycle | null,
    renewal_date: client.renewal_date,
  };
}

export interface ClientInput {
  company?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
}

export interface ClientSubscriptionInput {
  subscription_plan?: string | null;
  billing_cycle?: BillingCycle | null;
  renewal_date?: string | null;
}

/** Staff: set or update a client's plan/billing cycle/renewal date. */
export async function updateClientSubscription(clientId: string, input: ClientSubscriptionInput) {
  const { error } = await supabase
    .from("clients")
    .update({
      subscription_plan: input.subscription_plan || null,
      billing_cycle: input.billing_cycle || null,
      renewal_date: input.renewal_date || null,
    })
    .eq("id", clientId);
  if (error) throw error;
}

/** Staff: list every client with a renewal date set (used by the admin calendar). */
export async function fetchUpcomingRenewals(): Promise<ClientDirectoryEntry[]> {
  const all = await fetchClientsDirectory();
  return all.filter((c) => !!c.renewal_date);
}

/** Staff: manually register a client company (no portal login required). */
export async function createClient(input: ClientInput) {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      company: input.company || null,
      phone: input.phone || null,
      website: input.website || null,
      notes: input.notes || null,
      status: "ACTIVE_CLIENT",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** user_ids that already have a fleshed-out client record (a company name
 * set) — used to filter the "pick an existing account" list down to
 * accounts that don't already show up as a real client. */
export async function fetchLinkedAccountIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("clients")
    .select("user_id, company")
    .not("user_id", "is", null)
    .not("company", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((c) => c.user_id).filter(Boolean) as string[]);
}

/** Staff: turn an already-registered account into a real client. Signing up
 * with the CLIENT role auto-creates a blank clients row for that user — this
 * fills it in rather than creating a second, duplicate record. If no row
 * exists yet for some reason, it creates one linked to that account. */
export async function linkAccountAsClient(userId: string, input: ClientInput) {
  const { data: existing, error: fetchError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (existing) {
    const { error } = await supabase
      .from("clients")
      .update({
        company: input.company || null,
        phone: input.phone || null,
        website: input.website || null,
        notes: input.notes || null,
        status: "ACTIVE_CLIENT",
      })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: userId,
      company: input.company || null,
      phone: input.phone || null,
      website: input.website || null,
      notes: input.notes || null,
      status: "ACTIVE_CLIENT",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateClient(clientId: string, input: ClientInput) {
  const { error } = await supabase
    .from("clients")
    .update({
      company: input.company || null,
      phone: input.phone || null,
      website: input.website || null,
      notes: input.notes || null,
    })
    .eq("id", clientId);
  if (error) throw error;
}

export async function fetchClientDetail(clientId: string): Promise<ClientDetail | null> {
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (!client) return null;

  const [{ data: profile }, { data: projects }] = await Promise.all([
    client.user_id
      ? supabase.from("profiles").select("id, name, email").eq("id", client.user_id).maybeSingle()
      : Promise.resolve({
          data: null as { id: string; name: string | null; email: string | null } | null,
        }),
    supabase
      .from("projects")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    id: client.id,
    user_id: client.user_id,
    company: client.company,
    phone: client.phone,
    website: client.website,
    notes: client.notes,
    name: profile?.name ?? client.name ?? null,
    email: profile?.email ?? client.email ?? null,
    status: client.status as ContactStatus,
    source: client.source as LeadSource,
    value: Number(client.value ?? 0),
    created_at: client.created_at,
    project_count: (projects ?? []).length,
    subscription_plan: client.subscription_plan,
    billing_cycle: client.billing_cycle as BillingCycle | null,
    renewal_date: client.renewal_date,
    projects: (projects ?? []) as Project[],
  };
}
