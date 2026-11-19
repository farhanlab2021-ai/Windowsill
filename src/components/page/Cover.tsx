"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Popover } from "@/components/ui/Popover";
import { resolveAssetUrl, saveAsset } from "@/lib/db/assets";
import { updatePage } from "@/lib/db/pages";
import { GRADIENT_COVERS, gradientCoverValue, gradientCss } from "@/lib/covers";

/** The cover picker panel: built-in gradients, upload your own, or remove. */
export function CoverPicker({ pageId, onDone, hasCover }: { pageId: string; onDone: () => void; hasCover: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);

  const choose = async (cover: string | null) => {
    await updatePage(pageId, { cover });
    onDone();
  };

  return (
    <div className="w-72 p-3">
      <p className="mb-2 text-xs font-medium text-muted">Gradients</p>
      <div className="grid grid-cols-3 gap-2">
        {GRADIENT_COVERS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => choose(gradientCoverValue(g.id))}
            aria-label={`${g.label} gradient`}
            title={g.label}
            className="h-12 rounded-lg ring-accent hover:ring-2"
            style={{ background: g.css }}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-hover"
        >
          <ImagePlus className="size-4" /> Upload image
        </button>
        {hasCover && (
          <button
            type="button"
            onClick={() => choose(null)}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-danger hover:bg-hover"
          >
            <Trash2 className="size-4" /> Remove
          </button>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await choose(await saveAsset(file));
        }}
      />
    </div>
  );
}

/** Shows a page's cover across the top of the page. */
export function Cover({ pageId, cover }: { pageId: string; cover: string }) {
  const gradient = gradientCss(cover);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (gradient) return;
    let cancelled = false;
    resolveAssetUrl(cover).then((url) => !cancelled && setImageUrl(url));
    return () => {
      cancelled = true;
    };
  }, [cover, gradient]);

  return (
    <div className="group relative h-36 w-full shrink-0 overflow-hidden md:h-48" style={gradient ? { background: gradient } : undefined}>
      {!gradient && imageUrl && (
        // Blob URLs from IndexedDB can't go through Next's <Image> optimiser.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      )}
      <div className="absolute right-4 bottom-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
        <Popover
          label="Change cover"
          align="end"
          trigger={(props) => (
            <button
              {...props}
              type="button"
              className="rounded-lg bg-surface/85 px-3 py-1.5 text-xs font-medium text-ink shadow-sm backdrop-blur hover:bg-surface"
            >
              Change cover
            </button>
          )}
        >
          {(close) => <CoverPicker pageId={pageId} hasCover onDone={close} />}
        </Popover>
      </div>
    </div>
  );
}
