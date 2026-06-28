import { supabase } from "@/integrations/supabase/client";

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "WON" | "LOST";
export type LeadSource = "WEBSITE" | "REFERRAL" | "SOCIAL" | "OUTBOUND" | "EVENT" | "OTHER";

export interface Lead {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  source: LeadSource;
  value: number;
  notes: string | null;
  position: number;
  created_at: string;
}

export const LEAD_STATUSES: { key: LeadStatus; label: string }[] = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "PROPOSAL", label: "Proposal" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
];

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function createLead(input: Partial<Lead>) {
  const { error } = await supabase.from("leads").insert({
    name: input.name!,
    company: input.company ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    status: input.status ?? "NEW",
    source: input.source ?? "WEBSITE",
    value: input.value ?? 0,
    notes: input.notes ?? null,
  });
  if (error) throw error;
}

export async function updateLeadStatus(id: string, status: LeadStatus, position: number) {
  const { error } = await supabase.from("leads").update({ status, position }).eq("id", id);
  if (error) throw error;
}

export async function deleteLead(id: string) {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Staff: convert a won/qualified lead into a real client record.
 * Creates a row in `clients` (so projects can be assigned to it via client_id,
 * i.e. the project belongs to the client — not just a free-text company name),
 * and marks the source lead as WON. Returns the new client id.
 */
export async function convertLeadToClient(lead: Lead): Promise<string> {
  const noteLines = [
    lead.email ? `Email: ${lead.email}` : null,
    lead.notes ? lead.notes : null,
    `Converted from lead "${lead.name}".`,
  ].filter(Boolean) as string[];

  const { data, error } = await supabase
    .from("clients")
    .insert({
      company: lead.company || lead.name,
      phone: lead.phone ?? null,
      notes: noteLines.join("\n"),
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: leadError } = await supabase
    .from("leads")
    .update({ status: "WON" })
    .eq("id", lead.id);
  if (leadError) throw leadError;

  return data.id as string;
}
