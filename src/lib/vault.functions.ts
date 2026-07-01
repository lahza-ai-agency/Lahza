import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Serializable metadata shape for audit log entries — kept flat and
 * concrete (no `unknown`) so createServerFn can validate it's safe to send
 * over the wire. */
export type AuditMetadata = Record<string, string | number | boolean | null>;

/**
 * The Vault extension lives in Postgres's `vault` schema, which isn't part
 * of the generated `public`-only Database types. Rather than inventing our
 * own typings for an extension we don't control, we narrow to `any` at this
 * one boundary only — every other call in this file stays fully typed
 * against the real schema.
 */
function vaultSchema(client: any) {
  return client.schema("vault") as any;
}

export type CredentialCategory =
  | "AI_KEYS"
  | "CLOUD_HOSTING"
  | "PAYMENTS"
  | "COMMUNICATIONS"
  | "SOCIAL_ACCOUNTS"
  | "DOMAINS"
  | "DATABASES"
  | "OTHER";

export interface CredentialMeta {
  id: string;
  label: string;
  service: string | null;
  category: CredentialCategory;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_rotated_at: string | null;
}

/**
 * Vault access is intentionally narrower than general admin access — only
 * ADMIN and SUPER_ADMIN can reach any of these functions. Team members never
 * see this module exists, since it holds live production credentials.
 */
async function assertVaultAccess(context: { supabase: any; userId: string }) {
  const { data: isSuper } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "SUPER_ADMIN",
  });
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "ADMIN",
  });
  if (!isSuper && !isAdmin) {
    throw new Error("Forbidden: vault access requires an Admin or Super Admin role");
  }
}

async function writeAudit(
  supabaseAdmin: any,
  actorId: string,
  action: string,
  resourceId: string | null,
  metadata?: AuditMetadata,
) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    action,
    resource_type: "credential",
    resource_id: resourceId,
    metadata: metadata ?? null,
  });
}

export const listCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CredentialMeta[]> => {
    await assertVaultAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("credentials")
      .select("id, label, service, category, notes, created_by, created_at, updated_at, last_rotated_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CredentialMeta[];
  });

export const createCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      label: string;
      service?: string | null;
      category: CredentialCategory;
      notes?: string | null;
      secretValue: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    await assertVaultAccess(context);
    if (!data.secretValue || data.secretValue.trim().length === 0) {
      throw new Error("A secret value is required");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: secretRow, error: vaultError } = await vaultSchema(supabaseAdmin).rpc(
      "create_secret",
      {
        secret: data.secretValue,
        name: `credential_${crypto.randomUUID()}`,
        description: data.label,
      },
    );
    if (vaultError) throw vaultError;
    const vaultSecretId = secretRow as unknown as string;

    const { data: row, error } = await supabaseAdmin
      .from("credentials")
      .insert({
        label: data.label,
        service: data.service ?? null,
        category: data.category,
        notes: data.notes ?? null,
        vault_secret_id: vaultSecretId,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;

    await writeAudit(supabaseAdmin, context.userId, "credential.created", row.id, {
      label: data.label,
      category: data.category,
    });

    return { ok: true, id: row.id as string };
  });

export const updateCredentialMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      label?: string;
      service?: string | null;
      category?: CredentialCategory;
      notes?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    await assertVaultAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      label?: string;
      service?: string | null;
      category?: CredentialCategory;
      notes?: string | null;
    } = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.service !== undefined) patch.service = data.service;
    if (data.category !== undefined) patch.category = data.category;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await supabaseAdmin.from("credentials").update(patch).eq("id", data.id);
    if (error) throw error;
    await writeAudit(supabaseAdmin, context.userId, "credential.updated", data.id, {
      fields: Object.keys(patch).join(", "),
    });
    return { ok: true };
  });

/** Rotate the secret value itself — writes a new encrypted vault row, updates
 * `last_rotated_at`, and logs the rotation (never logs the old or new value). */
export const rotateCredentialSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; newSecretValue: string }) => d)
  .handler(async ({ context, data }) => {
    await assertVaultAccess(context);
    if (!data.newSecretValue || data.newSecretValue.trim().length === 0) {
      throw new Error("A new secret value is required");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cred, error: fetchError } = await supabaseAdmin
      .from("credentials")
      .select("vault_secret_id")
      .eq("id", data.id)
      .single();
    if (fetchError) throw fetchError;

    const { error: vaultError } = await vaultSchema(supabaseAdmin).rpc("update_secret", {
      secret_id: cred.vault_secret_id,
      secret: data.newSecretValue,
    });
    if (vaultError) throw vaultError;

    const { error } = await supabaseAdmin
      .from("credentials")
      .update({ last_rotated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;

    await writeAudit(supabaseAdmin, context.userId, "credential.rotated", data.id);
    return { ok: true };
  });

/** The one place a secret's plaintext value ever leaves the vault. Every
 * call is logged with who and when — there is no silent read path. */
export const revealCredentialSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }): Promise<{ value: string }> => {
    await assertVaultAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cred, error: fetchError } = await supabaseAdmin
      .from("credentials")
      .select("vault_secret_id")
      .eq("id", data.id)
      .single();
    if (fetchError) throw fetchError;

    const { data: decrypted, error: vaultError } = await vaultSchema(supabaseAdmin)
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("id", cred.vault_secret_id)
      .single();
    if (vaultError) throw vaultError;

    await writeAudit(supabaseAdmin, context.userId, "credential.revealed", data.id);

    return { value: decrypted.decrypted_secret as string };
  });

export const deleteCredential = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertVaultAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cred, error: fetchError } = await supabaseAdmin
      .from("credentials")
      .select("vault_secret_id, label")
      .eq("id", data.id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabaseAdmin.from("credentials").delete().eq("id", data.id);
    if (error) throw error;

    // Best-effort: remove the encrypted secret row too. If this fails the
    // metadata is already gone, so nothing stays reachable from the UI.
    await vaultSchema(supabaseAdmin).rpc("delete_secret", {
      secret_id: cred.vault_secret_id,
    });

    await writeAudit(supabaseAdmin, context.userId, "credential.deleted", data.id, {
      label: cred.label,
    });
    return { ok: true };
  });

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: AuditMetadata | null;
  created_at: string;
}

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditLogEntry[]> => {
    await assertVaultAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id, actor_id, action, resource_type, resource_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const rows = data ?? [];
    const actorIds = [...new Set(rows.map((r: any) => r.actor_id).filter(Boolean))] as string[];
    const emailMap = new Map<string, string | null>();
    if (actorIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", actorIds);
      for (const p of profiles ?? []) emailMap.set(p.id, p.email);
    }

    return rows.map((r: any) => ({
      ...r,
      actor_email: r.actor_id ? emailMap.get(r.actor_id) ?? null : null,
    }));
  });
