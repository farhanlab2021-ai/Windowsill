"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TriggerProps {
  ref: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": "menu" | "dialog";
}

interface PopoverProps {
  /** Render the button that opens the popover; spread the given props onto it. */
  trigger: (props: TriggerProps) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  kind?: "menu" | "dialog";
  className?: string;
  /** Accessible name for the popup. */
  label: string;
}

/**
 * A small floating panel attached to a button (used for menus and pickers).
 * It renders into <body> so it's never clipped by a scrolling sidebar.
 * Closes on Escape or a click outside, and gives focus back to the button.
 */
export function Popover({ trigger, children, align = "start", kind = "dialog", className = "", label }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  // The trigger button element, kept in state (React's recommended "callback ref" pattern).
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerEl?.focus();
  }, [triggerEl]);

  // Position the panel under the button, kept inside the screen.
  useLayoutEffect(() => {
    if (!open || !triggerEl || !panelRef.current) return;
    const t = triggerEl.getBoundingClientRect();
    const p = panelRef.current.getBoundingClientRect();
    const margin = 8;
    let left = align === "end" ? t.right - p.width : t.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - p.width - margin));
    let top = t.bottom + 6;
    if (top + p.height > window.innerHeight - margin) top = Math.max(margin, t.top - p.height - 6);
    setPos({ top, left });
  }, [open, align, triggerEl]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerEl?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, triggerEl]);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        "input, [role=menuitem]:not([aria-disabled=true]), button, [tabindex='0']",
      );
      focusable?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <>
      {trigger({
        ref: setTriggerEl,
        onClick: () => {
          setPos(null);
          setOpen((o) => !o);
        },
        "aria-expanded": open,
        "aria-haspopup": kind,
      })}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role={kind}
            aria-label={label}
            className={`fixed z-50 rounded-xl border border-line bg-surface text-ink shadow-pop ${className}`}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}
