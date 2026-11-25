"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { FILE_RULES, sniffMatches, type FilePurpose } from "./rules";

/**
 * Server-side registration of an uploaded object.
 *
 * The browser uploads directly to Supabase Storage with the member's own session (storage RLS decides whether the
 * path is theirs to write; bucket limits enforce size and MIME type). This action then re-checks the object on the
 * server — path ownership, size, declared type and the file's magic bytes — removes anything that fails, and only
 * then records it in public.files and links it to its parent record. Every query runs as the member (RLS).
 */
export type RegisterResult = { ok: true; fileId: string; name: string; size: number; type: string; bucket: string; path: string; addedAt: string } | { ok: false; error: string };

const input = z.object({
  purpose: z.enum(["avatar", "resume", "venture_document", "venture_media", "research_evidence", "validation_attachment", "opportunity_submission"]),
  path: z.string().min(10).max(400),
  originalName: z.string().trim().min(1).max(255),
  targetId: z.string().uuid().optional(),
  title: z.string().trim().max(160).optional(),
  confidentiality: z.enum(["team", "shared"]).optional(),
});

export async function registerUpload(raw: z.input<typeof input>): Promise<RegisterResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid upload." };
  const { purpose, path, originalName, targetId } = parsed.data;
  const rule = FILE_RULES[purpose as FilePurpose];
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Your session has ended. Sign in again." };
  const uid = auth.user.id;

  // The first folder must be the record the purpose belongs to (the member, or the target record).
  const owner = rule.folder === "user" ? uid : targetId;
  const segments = path.split("/");
  if (!owner || segments[0] !== owner || segments.length !== 2 || segments.some((s) => s === ".." || !s)) return { ok: false, error: "That file location isn’t allowed." };

  const storage = supabase.storage.from(rule.bucket);
  const remove = () => storage.remove([path]);
  const { data: blob, error: dlError } = await storage.download(path);
  if (dlError || !blob) return { ok: false, error: "The upload couldn’t be found or you can’t access it." };
  if (blob.size <= 0 || blob.size > rule.maxBytes) {
    await remove();
    return { ok: false, error: `Files must be under ${Math.round(rule.maxBytes / 1048576)} MB.` };
  }
  const type = blob.type || "application/octet-stream";
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  if (!rule.mime.includes(type) || !sniffMatches(type, head)) {
    await remove();
    return { ok: false, error: "That file type isn’t accepted here, or the file doesn’t match its type." };
  }

  const { data: file, error } = await supabase
    .from("files")
    .insert({ owner_id: uid, bucket: rule.bucket, object_path: path, original_name: originalName, mime_type: type, size_bytes: blob.size, purpose })
    .select("id, created_at")
    .single();
  if (error || !file) {
    await remove();
    return { ok: false, error: "The file couldn’t be recorded." };
  }

  const link =
    purpose === "avatar"
      ? await supabase.from("profiles").update({ avatar_file_id: file.id }).eq("id", uid)
      : purpose === "resume"
        ? await supabase.from("account_private").update({ resume_file_id: file.id }).eq("user_id", uid)
        : purpose === "venture_document"
          ? await supabase.from("venture_documents").insert({ venture_id: targetId!, file_id: file.id, title: parsed.data.title || originalName, confidentiality: parsed.data.confidentiality ?? "team", uploaded_by: uid })
          : { error: null };
  if (link.error) {
    await supabase.from("files").update({ deleted_at: new Date().toISOString() }).eq("id", file.id);
    await remove();
    return { ok: false, error: "You don’t have permission to attach files here." };
  }
  return { ok: true, fileId: file.id, name: originalName, size: blob.size, type, bucket: rule.bucket, path, addedAt: file.created_at };
}

/**
 * Short-lived link to a private file. Created with the member's own session, so storage RLS is checked again on
 * every request (revoked access cannot reuse an old link once it expires).
 */
export async function signedFileUrl(fileId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!z.string().uuid().safeParse(fileId).success) return { ok: false, error: "Not found." };
  const supabase = await supabaseServer();
  const { data: f } = await supabase.from("files").select("bucket, object_path, original_name, deleted_at").eq("id", fileId).maybeSingle();
  if (!f || f.deleted_at) return { ok: false, error: "File not found, or you no longer have access." };
  const { data, error } = await supabase.storage.from(f.bucket).createSignedUrl(f.object_path, 60, { download: f.original_name });
  if (error || !data) return { ok: false, error: "File not found, or you no longer have access." };
  return { ok: true, url: data.signedUrl };
}
