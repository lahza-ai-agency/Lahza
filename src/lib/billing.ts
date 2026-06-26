import { supabase } from "@/integrations/supabase/client";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export interface Invoice {
  id: string;
  client_id: string;
  project_id: string | null;
  invoice_number: string;
  amount: number;
  status: InvoiceStatus;
  description: string | null;
  issued_date: string;
  due_date: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInput {
  client_id: string;
  project_id?: string | null;
  invoice_number: string;
  amount: number;
  status?: InvoiceStatus;
  description?: string | null;
  issued_date?: string;
  due_date?: string | null;
}

/** Staff see every invoice; clients only see their own (enforced by RLS). */
export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("issued_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

export async function fetchInvoicesForClient(clientId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("client_id", clientId)
    .order("issued_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

export async function createInvoice(input: InvoiceInput) {
  const { error } = await supabase.from("invoices").insert({
    client_id: input.client_id,
    project_id: input.project_id ?? null,
    invoice_number: input.invoice_number,
    amount: input.amount,
    status: input.status ?? "DRAFT",
    description: input.description ?? null,
    issued_date: input.issued_date ?? new Date().toISOString().slice(0, 10),
    due_date: input.due_date ?? null,
  });
  if (error) throw error;
}

export async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  const { error } = await supabase
    .from("invoices")
    .update({ status, paid_at: status === "PAID" ? new Date().toISOString() : null })
    .eq("id", invoiceId);
  if (error) throw error;
}

export async function deleteInvoice(invoiceId: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) throw error;
}

/** Suggest the next sequential invoice number, e.g. INV-0001. */
export async function suggestInvoiceNumber(): Promise<string> {
  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  const next = (count ?? 0) + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}
