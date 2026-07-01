import { supabase } from "@/integrations/supabase/client";

/**
 * Unified Contact model. Every person — from first touch to long-time
 * client — is one row in `clients`, moving through `status` instead of
 * living in two separate tables under two separate identities.
 */
export type ContactStatus =
  | "LEAD"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "WON"
  | "ACTIVE_CLIENT"
  | "INACTIVE_CLIENT"
  | "LOST"
  | "ARCHIVED";

export type LeadSource = "WEBSITE" | "REFERRAL" | "SOCIAL" | "OUTBOUND" | "EVENT" | "OTHER";

export interface Contact {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: ContactStatus;
  source: LeadSource;
  value: number;
  notes: string | null;
  position: number;
  owner_id: string | null;
  user_id: string | null;
  created_at: string;
}

/** Pipeline stages shown on the CRM Kanban board, in lifecycle order. */
export const CONTACT_STATUSES: { key: ContactStatus; label: string }[] = [
  { key: "LEAD", label: "Lead" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "WON", label: "Won" },
  { key: "ACTIVE_CLIENT", label: "Active Client" },
  { key: "INACTIVE_CLIENT", label: "Inactive Client" },
  { key: "LOST", label: "Lost" },
  { key: "ARCHIVED", label: "Archived" },
];

/** The early stages a record is still "in the pipeline" for — used to keep
 * the Pipeline tab focused on contacts that haven't become real clients yet. */
export const PIPELINE_STATUSES: ContactStatus[] = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, name, company, email, phone, status, source, value, notes, position, owner_id, user_id, created_at",
    )
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contact[];
}

export interface ContactInput {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: ContactStatus;
  source?: LeadSource;
  value?: number;
  notes?: string | null;
}

export async function createContact(input: ContactInput) {
  const { error } = await supabase.from("clients").insert({
    name: input.name ?? null,
    company: input.company ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    status: input.status ?? "LEAD",
    source: input.source ?? "WEBSITE",
    value: input.value ?? 0,
    notes: input.notes ?? null,
  });
  if (error) throw error;
}

export async function updateContact(id: string, input: ContactInput) {
  const patch: {
    name?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: ContactStatus;
    source?: LeadSource;
    value?: number;
    notes?: string | null;
  } = {};
  if (input.name !== undefined) patch.name = input.name || null;
  if (input.company !== undefined) patch.company = input.company || null;
  if (input.email !== undefined) patch.email = input.email || null;
  if (input.phone !== undefined) patch.phone = input.phone || null;
  if (input.status !== undefined) patch.status = input.status;
  if (input.source !== undefined) patch.source = input.source;
  if (input.value !== undefined) patch.value = input.value;
  if (input.notes !== undefined) patch.notes = input.notes || null;
  const { error } = await supabase.from("clients").update(patch).eq("id", id);
  if (error) throw error;
}

/** Move a contact to a new pipeline stage (drag on the Kanban board). */
export async function updateContactStatus(id: string, status: ContactStatus, position: number) {
  const { error } = await supabase.from("clients").update({ status, position }).eq("id", id);
  if (error) throw error;
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Mark a contact WON and move them straight into Active Client — the
 * "convert" action is now just a status change, not a new record. Projects,
 * invoices, and documents already reference this same contact id, so
 * nothing else needs to move.
 */
export async function markContactActiveClient(contact: Contact): Promise<void> {
  const { error } = await supabase
    .from("clients")
    .update({ status: "ACTIVE_CLIENT" })
    .eq("id", contact.id);
  if (error) throw error;
}
