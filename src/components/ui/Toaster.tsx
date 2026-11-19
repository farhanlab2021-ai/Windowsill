"use client";

import { X } from "lucide-react";
import { useUI } from "@/stores/ui";

/** Small notifications at the bottom of the screen, e.g. "Moved to trash · Undo". */
export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-ink py-2.5 pr-2 pl-4 text-sm text-canvas shadow-pop"
        >
          <span className="flex-1">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action!.run();
                dismiss(toast.id);
              }}
              className="rounded-lg px-2.5 py-1 font-semibold underline-offset-2 hover:underline"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss"
            className="rounded-lg p-1 opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
