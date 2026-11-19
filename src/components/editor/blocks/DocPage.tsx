"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useState } from "react";
import { resolveAssetUrl } from "@/lib/db/assets";

/**
 * One page of an imported PDF or one slide of a PowerPoint, shown exactly as
 * it looks in the original: a full-width picture with a "Page 3" label.
 *
 * - `url`: the picture (an "asset:…" reference, saved on the device).
 * - `label`: "Page 3" / "Slide 3".
 * - `text`: the page's words, kept (not shown) so search still finds them.
 * - `aspect`: width ÷ height, so the space is reserved before the picture loads.
 */
function DocPageView({ url, label, aspect }: { url: string; label: string; aspect: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveAssetUrl(url).then((resolved) => !cancelled && setSrc(resolved || null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <figure className="my-2 w-full" contentEditable={false}>
      <div
        className="w-full overflow-hidden rounded-lg border border-line bg-white shadow-sm"
        style={aspect > 0 ? { aspectRatio: String(aspect) } : undefined}
      >
        {src && (
          // Pictures saved on the device are blob: URLs, which Next's <Image> can't optimise.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} loading="lazy" draggable={false} className="block h-full w-full object-contain" />
        )}
      </div>
      {label && <figcaption className="mt-1 text-right text-xs text-faint">{label}</figcaption>}
    </figure>
  );
}

export const createDocPageBlock = createReactBlockSpec(
  {
    type: "docPage",
    propSchema: {
      url: { default: "" },
      label: { default: "" },
      text: { default: "" },
      aspect: { default: 0 },
    },
    content: "none",
  },
  {
    render: ({ block }) => (
      <DocPageView url={block.props.url} label={block.props.label} aspect={Number(block.props.aspect) || 0} />
    ),
  },
);
