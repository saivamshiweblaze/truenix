"use client";

import type { FileMeta } from "@/lib/types";
import { registerUpload, signedFileUrl } from "@/features/files/actions";
import { FILE_RULES, type FilePurpose } from "@/features/files/rules";
import { supabaseBrowser } from "@/lib/supabase/client";
import { authUid } from "./remote";

/**
 * Uploads a file to Supabase Storage under the member's session, then asks the server to verify and register it.
 * Returns stored metadata, or an error message suitable for the person.
 */
export async function uploadFile(file: File, purpose: FilePurpose, opts: { targetId?: string; title?: string; confidentiality?: "team" | "shared" } = {}): Promise<{ ok: true; meta: FileMeta } | { ok: false; error: string }> {
  const uid = authUid();
  if (!uid) return { ok: false, error: "Sign in to upload files." };
  const rule = FILE_RULES[purpose];
  if (file.size > rule.maxBytes) return { ok: false, error: `Files must be under ${Math.round(rule.maxBytes / 1048576)} MB.` };
  if (!rule.mime.includes(file.type)) return { ok: false, error: "That file type isn’t accepted here." };
  const folder = rule.folder === "user" ? uid : opts.targetId;
  if (!folder) return { ok: false, error: "Missing upload target." };
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseBrowser().storage.from(rule.bucket).upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
  if (error) return { ok: false, error: /row-level security|unauthori[sz]ed|403/i.test(error.message) ? "You don’t have permission to upload here." : "The upload failed. Try again." };
  const res = await registerUpload({ purpose, path, originalName: file.name.slice(0, 255), targetId: opts.targetId, title: opts.title, confidentiality: opts.confidentiality });
  if (!res.ok) return res;
  return { ok: true, meta: { id: res.fileId, name: res.name, size: res.size, type: res.type, addedAt: res.addedAt, storage: "stored", bucket: res.bucket, path: res.path } };
}

/** Opens a private file through a short-lived signed URL (access is re-checked on the server). */
export async function openFile(fileId: string) {
  const res = await signedFileUrl(fileId);
  if (res.ok) window.open(res.url, "_blank", "noopener,noreferrer");
  return res;
}
