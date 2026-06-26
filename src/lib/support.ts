import { supabase } from "@/integrations/supabase/client";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketCategory = "GENERAL" | "BILLING" | "TECHNICAL" | "PROJECT" | "OTHER";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface Ticket {
  id: string;
  client_id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

/** Staff see every ticket; clients only see their own (enforced by RLS). */
export async function fetchTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export async function createTicket(input: {
  client_id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  message: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      client_id: input.client_id,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: msgError } = await supabase.from("ticket_messages").insert({
    ticket_id: data.id,
    body: input.message,
  });
  if (msgError) throw msgError;

  return data.id as string;
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const { error } = await supabase.from("tickets").update({ status }).eq("id", ticketId);
  if (error) throw error;
}

export async function fetchTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data, error } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TicketMessage[];
}

export async function sendTicketMessage(ticketId: string, body: string) {
  const { error } = await supabase.from("ticket_messages").insert({ ticket_id: ticketId, body });
  if (error) throw error;
  // Bump updated_at so the ticket list re-sorts to show recent activity.
  await supabase
    .from("tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);
}

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  GENERAL: "General",
  BILLING: "Billing",
  TECHNICAL: "Technical",
  PROJECT: "Project",
  OTHER: "Other",
};
