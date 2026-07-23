"use client";

// Skrivebeskyttet visning af gemte vedhæftninger. Bytes ligger privat i Vercel
// Blob; hver fil hentes via den session-gatede proxy /api/attachments/{id}, der
// redirecter til en korttids-signeret URL. Klik åbner en simpel lightbox.
import { useState } from "react";

export type GalleryItem = { id: number; kind: "image" | "video"; originalName?: string | null };

export default function AttachmentGallery({ items, size = 96 }: { items: GalleryItem[]; size?: number }) {
  const [open, setOpen] = useState<GalleryItem | null>(null);
  if (!items.length) return null;

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((it) => {
          const src = `/api/attachments/${it.id}`;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setOpen(it)}
              title={it.originalName ?? undefined}
              style={{ position: "relative", width: size, height: size, padding: 0, border: "1px solid var(--border, #dfe3e8)", borderRadius: 6, overflow: "hidden", background: "#f4f6f8", cursor: "pointer" }}
            >
              {it.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- privat blob via session-gated proxy; ingen next/image-optimering
                <img src={src} alt={it.originalName ?? "billede"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <>
                  <video src={src} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "#fff", fontSize: 24, textShadow: "0 1px 4px rgba(0,0,0,.6)", pointerEvents: "none" }}>
                    <i className="bi bi-play-circle-fill" />
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <div
          onClick={() => setOpen(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4000, padding: 20 }}
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            style={{ position: "absolute", top: 16, right: 20, width: 40, height: 40, borderRadius: "50%", border: 0, background: "rgba(255,255,255,.15)", color: "#fff", cursor: "pointer", fontSize: 18 }}
          >
            <i className="bi bi-x-lg" />
          </button>
          {open.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- privat blob via session-gated proxy; ingen next/image-optimering
            <img src={`/api/attachments/${open.id}`} alt={open.originalName ?? "billede"} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 4 }} />
          ) : (
            <video src={`/api/attachments/${open.id}`} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: 4 }} />
          )}
        </div>
      )}
    </>
  );
}
