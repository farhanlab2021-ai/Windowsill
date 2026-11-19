import type { Metadata } from "next";
import { Suspense } from "react";
import { FocusMode } from "@/components/focus/FocusMode";

export const metadata: Metadata = { title: "Focus Mode — Windowsill" };

/**
 * Focus Mode lives at /focus. `?from=<pageId>` remembers which page you came
 * from, so "Leave" and the notes panel return you there.
 */
export default function FocusPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-canvas" />}>
      <FocusMode />
    </Suspense>
  );
}
