import { supabase } from "@/integrations/supabase/client";

export type DocumentCategory = "CONTRACT" | "DELIVERABLE" | "FILE" | "OTHER";

export interface ClientDocument {
  id: string;
  client_id: string;
  project_id: string | null;
  name: string;
  category: DocumentCategory;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const BUCKET = "client-documents";

/** Staff see every document; clients only see their own (enforced by RLS). */
export async function fetchDocuments(): Promise<ClientDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientDocument[];
}

export async function fetchDocumentsForClient(clientId: string): Promise<ClientDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientDocument[];
}

/** Staff-only: upload a file into the client's folder and record it. */
export async function uploadDocument(params: {
  file: File;
  clientId: string;
  projectId?: string | null;
  category: DocumentCategory;
  name?: string;
}) {
  const { file, clientId, projectId, category, name } = params;
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${clientId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("documents").insert({
    client_id: clientId,
    project_id: projectId ?? null,
    name: name || file.name,
    category,
    file_path: path,
    file_size: file.size,
    mime_type: file.type || null,
  });
  if (insertError) throw insertError;
}

/** Generates a short-lived URL — the bucket is private, so files never get a permanent public link. */
export async function getDocumentDownloadUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(documentId: string, filePath: string) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) throw error;
}

export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  CONTRACT: "Contract",
  DELIVERABLE: "Deliverable",
  FILE: "File",
  OTHER: "Other",
};
