import { supabase } from "@/integrations/supabase/client";

export interface Meeting {
  id: string;
  title: string;
  lead_id: string | null;
  client_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  notes: string | null;
  owner_id: string | null;
  created_at: string;
}

export interface MeetingInput {
  title: string;
  lead_id?: string | null;
  client_id?: string | null;
  scheduled_at: string;
  duration_minutes?: number;
  notes?: string | null;
}

export async function fetchMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Meeting[];
}

export async function createMeeting(input: MeetingInput) {
  const { error } = await supabase.from("meetings").insert({
    title: input.title,
    lead_id: input.lead_id ?? null,
    client_id: input.client_id ?? null,
    scheduled_at: input.scheduled_at,
    duration_minutes: input.duration_minutes ?? 30,
    notes: input.notes ?? null,
  });
  if (error) throw error;
}

export async function deleteMeeting(id: string) {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}
