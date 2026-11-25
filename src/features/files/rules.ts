/** Upload rules shared by the browser (early feedback) and the server (enforcement). Mirrors the bucket limits. */
export type FilePurpose = "avatar" | "resume" | "venture_document" | "venture_media" | "research_evidence" | "validation_attachment" | "opportunity_submission";

const IMAGES = ["image/jpeg", "image/png", "image/webp"];
const PDF = ["application/pdf"];
const OFFICE = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const TEXT = ["text/plain", "text/csv"];

export const FILE_RULES: Record<FilePurpose, { bucket: string; folder: "user" | "target"; maxBytes: number; mime: string[] }> = {
  avatar: { bucket: "avatars", folder: "user", maxBytes: 2 * 1048576, mime: IMAGES },
  resume: { bucket: "resumes", folder: "user", maxBytes: 5 * 1048576, mime: [...PDF, OFFICE[0]] },
  venture_document: { bucket: "venture-documents", folder: "target", maxBytes: 20 * 1048576, mime: [...PDF, ...IMAGES, ...OFFICE, ...TEXT] },
  venture_media: { bucket: "venture-media", folder: "target", maxBytes: 5 * 1048576, mime: IMAGES },
  research_evidence: { bucket: "research-evidence", folder: "target", maxBytes: 20 * 1048576, mime: [...PDF, ...IMAGES, OFFICE[0], OFFICE[2], ...TEXT] },
  validation_attachment: { bucket: "validation-attachments", folder: "target", maxBytes: 20 * 1048576, mime: [...PDF, ...IMAGES, OFFICE[0], OFFICE[2], ...TEXT] },
  opportunity_submission: { bucket: "opportunity-submissions", folder: "target", maxBytes: 25 * 1048576, mime: [...PDF, ...IMAGES, "application/zip", OFFICE[1], OFFICE[0]] },
};

/** Checks the file's leading bytes against its declared type. */
export function sniffMatches(type: string, head: Uint8Array) {
  const starts = (...b: number[]) => b.every((v, i) => head[i] === v);
  switch (type) {
    case "application/pdf":
      return starts(0x25, 0x50, 0x44, 0x46, 0x2d);
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47);
    case "image/webp":
      return starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
    case "application/zip":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return starts(0x50, 0x4b, 0x03, 0x04);
    case "text/plain":
    case "text/csv":
      // Text must not contain NUL bytes in its first bytes (a cheap binary check).
      return !head.slice(0, head.length).includes(0);
    default:
      return false;
  }
}
