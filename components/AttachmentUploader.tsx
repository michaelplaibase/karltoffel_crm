"use client";

// Vedhæftninger på en ordre/et abonnement — vælg billeder og videoer, som
// uploades DIREKTE til Vercel Blob (privat) fra browseren. Server-actions maxer
// ved 1 MB, så bytes må ikke gå gennem formularen; kun en JSON-liste af refs
// (url/pathname/metadata) submittes i et skjult felt ("attachments"), som
// server-action'en gemmer som Attachment-rækker.
//
// Forhåndsvisning: nye filer vises fra en lokal object-URL (blob'en er privat og
// kan ikke ses direkte). Eksisterende (prefill i redigering) vises via den
// session-gatede proxy /api/attachments/{id}.
import { useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, IMAGE_TYPES, VIDEO_TYPES, ALLOWED_TYPES,
  kindForContentType, type UploadedRef, type AttachmentKind,
} from "@/lib/attachments";

/** En allerede-gemt vedhæftning (redigering) — bærer DB-id til proxy-preview. */
export type ExistingAttachment = UploadedRef & { id: number; kind: AttachmentKind };

type Item = {
  key: string;
  kind: AttachmentKind;
  previewUrl: string;        // object-URL (ny) eller /api/attachments/{id} (eksisterende)
  isObjectUrl: boolean;      // skal object-URL'en revokes ved fjernelse?
  ref: UploadedRef | null;   // null mens den uploader; sat når blob'en er i storen
  uploading: boolean;
  progress: number;          // 0..100
  error?: string;
  name: string;
};

function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Sanitér filnavn til en blob-pathname-base (server tilføjer random-suffix). */
function safePathname(scope: string, name: string): string {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${scope}/${cleaned || "fil"}`;
}

export default function AttachmentUploader({
  scope, existing,
}: {
  /** Konteksten — bruges kun til pathname-navngivning (order/subscription). */
  scope: "order" | "subscription";
  existing?: ExistingAttachment[];
}) {
  const idc = useRef(0);
  const nextKey = () => `k${idc.current++}`;
  const [items, setItems] = useState<Item[]>(() =>
    (existing ?? []).map((a) => ({
      key: `e${a.id}`,
      kind: a.kind,
      previewUrl: `/api/attachments/${a.id}`,
      isObjectUrl: false,
      ref: { url: a.url, pathname: a.pathname, contentType: a.contentType, sizeBytes: a.sizeBytes, originalName: a.originalName },
      uploading: false,
      progress: 100,
      name: a.originalName ?? "vedhæftning",
    })),
  );
  const fileInput = useRef<HTMLInputElement>(null);

  const patch = (key: string, p: Partial<Item>) =>
    setItems((cur) => cur.map((it) => (it.key === key ? { ...it, ...p } : it)));

  // Skjult felt = kun de refs der er færdige (uploadede/eksisterende). Filer der
  // stadig uploader eller fejlede udelades, så en halv upload ikke gemmes.
  const hiddenValue = useMemo(
    () => JSON.stringify(items.filter((it) => it.ref).map((it) => it.ref)),
    [items],
  );

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const kind = kindForContentType(file.type);
      if (!kind || !ALLOWED_TYPES.includes(file.type)) {
        addFailed(file, "Filtypen understøttes ikke (kun billeder og videoer).");
        continue;
      }
      const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (file.size > max) {
        addFailed(file, `Filen er for stor (max ${kind === "image" ? "10 MB" : "100 MB"}).`);
        continue;
      }
      void startUpload(file, kind);
    }
    if (fileInput.current) fileInput.current.value = ""; // tillad genvalg af samme fil
  }

  function addFailed(file: File, error: string) {
    const key = nextKey();
    setItems((cur) => [...cur, {
      key, kind: kindForContentType(file.type) ?? "image", previewUrl: "", isObjectUrl: false,
      ref: null, uploading: false, progress: 0, error, name: file.name,
    }]);
  }

  async function startUpload(file: File, kind: AttachmentKind) {
    const key = nextKey();
    const previewUrl = URL.createObjectURL(file);
    setItems((cur) => [...cur, {
      key, kind, previewUrl, isObjectUrl: true, ref: null, uploading: true, progress: 0, name: file.name,
    }]);
    try {
      const res = await upload(safePathname(scope, file.name), file, {
        access: "private",
        handleUploadUrl: "/api/uploads",
        clientPayload: scope,
        contentType: file.type,
        multipart: kind === "video",
        onUploadProgress: (e) => patch(key, { progress: Math.round(e.percentage) }),
      });
      patch(key, {
        uploading: false, progress: 100,
        ref: { url: res.url, pathname: res.pathname, contentType: file.type, sizeBytes: file.size, originalName: file.name },
      });
    } catch (e) {
      patch(key, { uploading: false, error: (e as Error).message || "Upload fejlede." });
    }
  }

  function remove(key: string) {
    setItems((cur) => {
      const it = cur.find((x) => x.key === key);
      if (it?.isObjectUrl && it.previewUrl) URL.revokeObjectURL(it.previewUrl);
      return cur.filter((x) => x.key !== key);
    });
  }

  return (
    <div>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input type="hidden" name="attachments" value={hiddenValue} />

      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => fileInput.current?.click()}>
        <i className="bi bi-paperclip" /> Vælg billeder eller videoer
      </button>
      <small className="form-text field-help">Billeder op til 10 MB, videoer op til 100 MB. Vises kun internt i CRM.</small>

      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 12 }}>
          {items.map((it) => (
            <div key={it.key} style={{ position: "relative", border: "1px solid var(--border, #dfe3e8)", borderRadius: 6, overflow: "hidden", background: "#f4f6f8", aspectRatio: "1 / 1" }}>
              {it.error ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 8, textAlign: "center", color: "#c0392b", fontSize: 11.5 }}>
                  <i className="bi bi-exclamation-triangle" style={{ fontSize: 18 }} />
                  <span style={{ marginTop: 4 }}>{it.error}</span>
                </div>
              ) : it.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- privat blob via lokal object-URL/proxy; ingen next/image-optimering
                <img src={it.previewUrl} alt={it.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <>
                  <video src={it.previewUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#fff", fontSize: 26, textShadow: "0 1px 4px rgba(0,0,0,.6)", pointerEvents: "none" }}>
                    <i className="bi bi-play-circle-fill" />
                  </span>
                </>
              )}

              {it.uploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.65)", display: "flex", alignItems: "flex-end" }}>
                  <div style={{ height: 4, width: "100%", background: "#cfd6dd" }}>
                    <div style={{ height: "100%", width: `${it.progress}%`, background: "var(--primary, #257BB6)", transition: "width .15s" }} />
                  </div>
                </div>
              )}

              {!it.uploading && (
                <button
                  type="button"
                  title="Fjern"
                  onClick={() => remove(it.key)}
                  style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: 0, background: "rgba(0,0,0,.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, lineHeight: 1, padding: 0 }}
                >
                  <i className="bi bi-x-lg" />
                </button>
              )}

              {!it.error && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 10.5, padding: "2px 5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {it.ref ? humanSize(it.ref.sizeBytes) : it.uploading ? `${it.progress}%` : it.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
